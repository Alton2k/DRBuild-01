import { Client } from "pg";

const requiredTables = [
  "up_users",
  "deals",
  "comments",
  "deal_votes",
  "deal_reports",
  "comment_reports",
  "saved_deals",
  "user_settings",
  "follows",
  "strapi_migrations",
];

const requiredIndexes = [
  "deal_votes_deal_document_viewer_uq",
  "deal_reports_deal_document_viewer_uq",
  "saved_deals_user_deal_document_uq",
  "user_settings_user_id_uq",
  "user_settings_username_uq",
  "follows_follower_following_uq",
  "deals_mod_exp_score_created_idx",
  "deals_mod_exp_comments_created_idx",
  "deals_mod_exp_created_idx",
  "comments_author_created_idx",
  "comments_deal_lnk_deal_idx",
  "saved_deals_user_created_idx",
  "deal_votes_deal_direction_idx",
  "deal_reports_viewer_deal_document_idx",
  "comment_reports_report_key_uq",
  "comments_submission_key_uq",
  "follows_follower_user_id_idx",
  "follows_following_user_id_idx",
];

const duplicateChecks = [
  {
    label: "user settings by user ID",
    table: "user_settings",
    columns: ["user_id"],
  },
  {
    label: "user settings by username",
    table: "user_settings",
    columns: ["username"],
  },
  {
    label: "deal votes by viewer and deal",
    table: "deal_votes",
    columns: ["viewer_id", "deal_document_id"],
  },
  {
    label: "deal reports by viewer and deal",
    table: "deal_reports",
    columns: ["viewer_id", "deal_document_id"],
  },
  {
    label: "comment reports by report key",
    table: "comment_reports",
    columns: ["report_key"],
  },
  {
    label: "comments by submission key",
    table: "comments",
    columns: ["submission_key"],
  },
  {
    label: "saved deals by user and deal",
    table: "saved_deals",
    columns: ["user_id", "deal_document_id"],
  },
  {
    label: "follow relationships",
    table: "follows",
    columns: ["follower_user_id", "following_user_id"],
  },
];

function readBoolean(value, fallback) {
  if (value === undefined || value === "") {
    return fallback;
  }

  return value.toLowerCase() === "true";
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function printResult(status, message) {
  console.log(`${status.padEnd(5)} ${message}`);
}

async function tableExists(client, tableName) {
  const result = await client.query("select to_regclass($1) as table_name", [`public.${tableName}`]);
  return Boolean(result.rows[0]?.table_name);
}

async function columnsExist(client, tableName, columns) {
  const result = await client.query(
    `select column_name
       from information_schema.columns
      where table_schema = current_schema()
        and table_name = $1
        and column_name = any($2::text[])`,
    [tableName, columns],
  );
  return result.rows.length === columns.length;
}

async function countDuplicates(client, tableName, columns) {
  const identifiers = columns.map(quoteIdentifier).join(", ");
  const nonNull = columns.map((column) => `${quoteIdentifier(column)} is not null`).join(" and ");
  const result = await client.query(
    `select count(*)::int as duplicate_groups
       from (
         select ${identifiers}
           from ${quoteIdentifier(tableName)}
          where ${nonNull}
          group by ${identifiers}
         having count(*) > 1
       ) duplicate_rows`,
  );
  return Number(result.rows[0]?.duplicate_groups ?? 0);
}

const databaseUrl = process.env.DATABASE_URL;
const databaseClient = process.env.DATABASE_CLIENT || (databaseUrl ? "postgres" : "sqlite");

if (databaseClient !== "postgres" || !databaseUrl) {
  console.error("Database readiness checks require DATABASE_CLIENT=postgres and DATABASE_URL.");
  process.exitCode = 1;
} else {
  const sslEnabled = readBoolean(process.env.DATABASE_SSL, true);
  const rejectUnauthorized = readBoolean(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED, true);
  const client = new Client({
    connectionString: databaseUrl,
    ssl: sslEnabled ? { rejectUnauthorized } : false,
    connectionTimeoutMillis: Number(process.env.DATABASE_CONNECTION_TIMEOUT || 60000),
  });
  let failures = 0;

  try {
    await client.connect();
    const identity = await client.query(
      "select current_database() as database_name, current_schema() as schema_name, current_setting('server_version') as server_version",
    );
    const database = identity.rows[0];
    printResult("OK", `Connected to PostgreSQL ${database.server_version} database ${database.database_name} schema ${database.schema_name}.`);

    const tablePresence = new Map();
    for (const tableName of requiredTables) {
      const exists = await tableExists(client, tableName);
      tablePresence.set(tableName, exists);
      printResult(exists ? "OK" : "FAIL", `Required table ${tableName}`);
      failures += exists ? 0 : 1;
    }

    const indexes = await client.query(
      "select indexname from pg_indexes where schemaname = current_schema() and indexname = any($1::text[])",
      [requiredIndexes],
    );
    const existingIndexes = new Set(indexes.rows.map((row) => row.indexname));
    for (const indexName of requiredIndexes) {
      const exists = existingIndexes.has(indexName);
      printResult(exists ? "OK" : "FAIL", `Required index ${indexName}`);
      failures += exists ? 0 : 1;
    }

    for (const check of duplicateChecks) {
      if (!tablePresence.get(check.table) || !(await columnsExist(client, check.table, check.columns))) {
        printResult("SKIP", `Duplicate check for ${check.label}`);
        continue;
      }

      const duplicateGroups = await countDuplicates(client, check.table, check.columns);
      const clean = duplicateGroups === 0;
      printResult(clean ? "OK" : "FAIL", `${check.label}: ${duplicateGroups} duplicate group(s)`);
      failures += clean ? 0 : 1;
    }

    if (tablePresence.get("up_users") && tablePresence.get("user_settings")) {
      const missingProfiles = await client.query(
        `select count(*)::int as count
           from up_users users
           left join user_settings settings on settings.user_id = users.id::text
          where settings.id is null`,
      );
      const orphanProfiles = await client.query(
        `select count(*)::int as count
           from user_settings settings
           left join up_users users on users.id::text = settings.user_id
          where users.id is null`,
      );
      const missingCount = Number(missingProfiles.rows[0]?.count ?? 0);
      const orphanCount = Number(orphanProfiles.rows[0]?.count ?? 0);
      printResult(missingCount === 0 ? "OK" : "FAIL", `Website users without profiles: ${missingCount}`);
      printResult(orphanCount === 0 ? "OK" : "FAIL", `Profiles without website users: ${orphanCount}`);
      failures += missingCount === 0 ? 0 : 1;
      failures += orphanCount === 0 ? 0 : 1;
    }

    if (tablePresence.get("strapi_migrations")) {
      const migrationColumns = await client.query(
        `select column_name
           from information_schema.columns
          where table_schema = current_schema()
            and table_name = 'strapi_migrations'`,
      );
      const columnNames = new Set(migrationColumns.rows.map((row) => row.column_name));
      if (columnNames.has("name")) {
        const migrationCount = await client.query("select count(*)::int as count from strapi_migrations");
        printResult("OK", `Recorded Strapi migrations: ${migrationCount.rows[0]?.count ?? 0}`);
      } else {
        printResult("WARN", "Could not identify the migration-name column in strapi_migrations.");
      }
    }

    if (failures > 0) {
      console.error(`\nDatabase readiness failed with ${failures} issue(s).`);
      process.exitCode = 1;
    } else {
      console.log("\nDatabase readiness checks passed.");
    }
  } catch (error) {
    console.error("Database readiness check could not complete:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => undefined);
  }
}

import Database from "../backend/node_modules/better-sqlite3/lib/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const databaseFile = path.join(projectRoot, "backend", ".tmp", "data.db");
const shouldApply = process.argv.includes("--apply");

const tablePrefixes = [
  "comments",
  "deal_categories",
  "deal_reports",
  "deal_votes",
  "deals",
  "up_users",
];

const extraTables = new Set([
  "up_users_role_lnk",
]);

function getTables(db) {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((row) => row.name);
}

function shouldClearTable(tableName) {
  return extraTables.has(tableName) || tablePrefixes.some((prefix) => (
    tableName === prefix ||
    tableName.startsWith(`${prefix}_`) ||
    tableName.endsWith(`_${prefix}_lnk`)
  ));
}

const db = new Database(databaseFile);

try {
  const tables = getTables(db).filter(shouldClearTable);
  const counts = tables.map((table) => ({
    table,
    rows: db.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get().count,
  }));

  if (!shouldApply) {
    console.log("Dry run. These tables would be cleared:");
    console.table(counts);
    console.log("Run with --apply to delete these rows.");
    process.exit(0);
  }

  db.pragma("foreign_keys = OFF");

  const clear = db.transaction(() => {
    for (const { table } of counts) {
      db.prepare(`DELETE FROM "${table}"`).run();
      db.prepare("DELETE FROM sqlite_sequence WHERE name = ?").run(table);
    }
  });

  clear();
  db.pragma("foreign_keys = ON");

  console.log("Cleared Strapi content/user records.");
  console.table(counts);
} finally {
  db.close();
}

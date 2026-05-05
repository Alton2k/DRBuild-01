import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..", "..");
const configuredDatabaseFile = process.env.SQLITE_DATABASE_FILE?.trim();

export const databaseFile = configuredDatabaseFile
  ? path.resolve(projectRoot, configuredDatabaseFile)
  : path.join(projectRoot, "lib", "data", "app.sqlite");
export const dataDirectory = path.dirname(databaseFile);
export const schemaFile = path.join(projectRoot, "lib", "db", "schema.sql");

export function openDatabase() {
  fs.mkdirSync(dataDirectory, { recursive: true });

  const db = new Database(databaseFile);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(fs.readFileSync(schemaFile, "utf8"));
  migrateDatabase(db);

  return db;
}

function hasColumn(db, tableName, columnName) {
  return db
    .prepare(`PRAGMA table_info(${tableName})`)
    .all()
    .some((row) => row.name === columnName);
}

function migrateDatabase(db) {
  if (!hasColumn(db, "deals", "duplicate_of_deal_id")) {
    db.prepare("ALTER TABLE deals ADD COLUMN duplicate_of_deal_id TEXT").run();
  }

  if (!hasColumn(db, "deals", "duplicate_reason")) {
    db.prepare("ALTER TABLE deals ADD COLUMN duplicate_reason TEXT NOT NULL DEFAULT ''").run();
  }

  db.prepare("CREATE INDEX IF NOT EXISTS deals_duplicate_idx ON deals (duplicate_of_deal_id)").run();
}

export function getTableCounts(db) {
  return {
    deals: db.prepare("SELECT COUNT(*) AS count FROM deals").get().count,
    comments: db.prepare("SELECT COUNT(*) AS count FROM comments").get().count,
    commentLikes: db.prepare("SELECT COUNT(*) AS count FROM comment_likes").get().count,
    dealVotes: db.prepare("SELECT COUNT(*) AS count FROM deal_votes").get().count,
    dealReports: db.prepare("SELECT COUNT(*) AS count FROM deal_reports").get().count,
  };
}

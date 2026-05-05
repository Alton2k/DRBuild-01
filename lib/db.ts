import "server-only";

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dataDirectory = path.join(process.cwd(), "lib", "data");
const databaseFile = path.join(dataDirectory, "app.sqlite");
const schemaFile = path.join(process.cwd(), "lib", "db", "schema.sql");

let database: Database.Database | null = null;

function initializeDatabase(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(fs.readFileSync(schemaFile, "utf8"));
  migrateDatabase(db);
}

function hasColumn(db: Database.Database, tableName: string, columnName: string) {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[];
  return rows.some((row) => row.name === columnName);
}

function migrateDatabase(db: Database.Database) {
  if (!hasColumn(db, "deals", "duplicate_of_deal_id")) {
    db.prepare("ALTER TABLE deals ADD COLUMN duplicate_of_deal_id TEXT").run();
  }

  if (!hasColumn(db, "deals", "duplicate_reason")) {
    db.prepare("ALTER TABLE deals ADD COLUMN duplicate_reason TEXT NOT NULL DEFAULT ''").run();
  }

  if (!hasColumn(db, "deals", "uploaded_image_url")) {
    db.prepare("ALTER TABLE deals ADD COLUMN uploaded_image_url TEXT NOT NULL DEFAULT ''").run();
  }

  if (!hasColumn(db, "deals", "image_gallery_urls")) {
    db.prepare("ALTER TABLE deals ADD COLUMN image_gallery_urls TEXT NOT NULL DEFAULT '[]'").run();
  }

  if (!hasColumn(db, "deals", "moderation_reason")) {
    db.prepare("ALTER TABLE deals ADD COLUMN moderation_reason TEXT NOT NULL DEFAULT 'new_user_manual_review'").run();
  }

  if (!hasColumn(db, "deals", "author_user_id")) {
    db.prepare("ALTER TABLE deals ADD COLUMN author_user_id TEXT").run();
  }

  if (!hasColumn(db, "deals", "author_email")) {
    db.prepare("ALTER TABLE deals ADD COLUMN author_email TEXT NOT NULL DEFAULT ''").run();
  }

  if (!hasColumn(db, "deals", "author_name")) {
    db.prepare("ALTER TABLE deals ADD COLUMN author_name TEXT NOT NULL DEFAULT ''").run();
  }

  db.prepare("CREATE INDEX IF NOT EXISTS deals_duplicate_idx ON deals (duplicate_of_deal_id)").run();
  db.prepare("CREATE INDEX IF NOT EXISTS deals_author_user_idx ON deals (author_user_id)").run();

  if (!hasColumn(db, "comments", "author_viewer_id")) {
    db.prepare("ALTER TABLE comments ADD COLUMN author_viewer_id TEXT").run();
  }
}

export function getDb() {
  if (!database) {
    fs.mkdirSync(dataDirectory, { recursive: true });
    database = new Database(databaseFile);
    initializeDatabase(database);
  }

  return database;
}

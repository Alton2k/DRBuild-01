import { getTableCounts, openDatabase } from "./shared.mjs";

const db = openDatabase();

try {
  const counts = getTableCounts(db);
  const approvedDeals = db
    .prepare("SELECT COUNT(*) AS count FROM deals WHERE status = 'approved' AND is_expired = 0")
    .get().count;
  const orphanComments = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM comments c
      LEFT JOIN deals d ON d.id = c.deal_id
      WHERE d.id IS NULL
    `)
    .get().count;

  if (counts.deals === 0) {
    throw new Error("No deals found. Run npm run db:seed first.");
  }

  if (approvedDeals === 0) {
    throw new Error("No active approved deals found for the homepage.");
  }

  if (orphanComments > 0) {
    throw new Error(`Found ${orphanComments} comment(s) without a matching deal.`);
  }

  console.log("SQLite smoke check passed.");
  console.table({ ...counts, approvedDeals, orphanComments });
} finally {
  db.close();
}

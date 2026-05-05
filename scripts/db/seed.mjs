import { getTableCounts, openDatabase } from "./shared.mjs";

const deals = [
  {
    id: "seed-deal-air-fryer",
    title: "Philips 4.1L Essential Air Fryer",
    url: "https://example.com/deals/philips-air-fryer",
    price: 299,
    originalPrice: 459,
    store: "Lazada",
    category: "Home & Living",
    subCategory: "Kitchen Appliances",
    description: "Compact air fryer with enough room for weeknight meals and a useful discount.",
    imageUrl: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=900&q=80",
    status: "approved",
    isExpired: 0,
    expiredAt: null,
    createdAt: "2026-05-01T03:00:00.000Z",
  },
  {
    id: "seed-deal-headphones",
    title: "Sony WH-CH720N Wireless Noise Cancelling Headphones",
    url: "https://example.com/deals/sony-headphones",
    price: 349,
    originalPrice: 599,
    store: "Shopee",
    category: "Electronics",
    subCategory: "Audio & Hi-Fi",
    description: "Lightweight wireless headphones with active noise cancelling and strong battery life.",
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
    status: "approved",
    isExpired: 0,
    expiredAt: null,
    createdAt: "2026-05-02T07:30:00.000Z",
  },
  {
    id: "seed-deal-travel-pending",
    title: "Langkawi Weekday Hotel Flash Sale",
    url: "https://example.com/deals/langkawi-hotel",
    price: 188,
    originalPrice: 320,
    store: "Traveloka",
    category: "Travel",
    subCategory: "Hotel",
    description: "Pending sample deal for checking the admin moderation flow.",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80",
    status: "pending",
    isExpired: 0,
    expiredAt: null,
    createdAt: "2026-05-03T02:15:00.000Z",
  },
];

const comments = [
  {
    id: "seed-comment-air-fryer-1",
    dealId: "seed-deal-air-fryer",
    parentId: null,
    authorName: "Aina",
    body: "Bought this last month. The basket size is good for two people.",
    createdAt: "2026-05-01T04:00:00.000Z",
  },
  {
    id: "seed-comment-air-fryer-2",
    dealId: "seed-deal-air-fryer",
    parentId: "seed-comment-air-fryer-1",
    authorName: "Ben",
    body: "Nice, thanks. The price looks lower than the weekend promo.",
    createdAt: "2026-05-01T04:20:00.000Z",
  },
  {
    id: "seed-comment-headphones-1",
    dealId: "seed-deal-headphones",
    parentId: null,
    authorName: "Mei",
    body: "Good starter ANC headphones. Worth checking warranty terms before buying.",
    createdAt: "2026-05-02T08:00:00.000Z",
  },
];

const dealVotes = [
  ["seed-vote-air-fryer-1", "seed-deal-air-fryer", "seed-viewer-a", "up", "2026-05-01T04:05:00.000Z"],
  ["seed-vote-air-fryer-2", "seed-deal-air-fryer", "seed-viewer-b", "up", "2026-05-01T04:10:00.000Z"],
  ["seed-vote-headphones-1", "seed-deal-headphones", "seed-viewer-a", "up", "2026-05-02T08:05:00.000Z"],
  ["seed-vote-headphones-2", "seed-deal-headphones", "seed-viewer-c", "down", "2026-05-02T08:30:00.000Z"],
];

const commentLikes = [
  ["seed-comment-air-fryer-1", "seed-viewer-b", "2026-05-01T04:08:00.000Z"],
  ["seed-comment-air-fryer-1", "seed-viewer-c", "2026-05-01T04:12:00.000Z"],
  ["seed-comment-headphones-1", "seed-viewer-a", "2026-05-02T08:10:00.000Z"],
];

const dealReports = [
  ["seed-report-headphones-1", "seed-deal-headphones", "seed-viewer-d", "bad-price", "2026-05-02T09:00:00.000Z"],
];

const db = openDatabase();

try {
  const insertDeal = db.prepare(`
    INSERT OR IGNORE INTO deals (
      id, title, url, price, original_price, store, category, sub_category,
      description, image_url, status, is_expired, expired_at, created_at
    ) VALUES (
      @id, @title, @url, @price, @originalPrice, @store, @category, @subCategory,
      @description, @imageUrl, @status, @isExpired, @expiredAt, @createdAt
    )
  `);
  const insertComment = db.prepare(`
    INSERT OR IGNORE INTO comments (
      id, deal_id, parent_id, author_viewer_id, author_name, body, created_at
    ) VALUES (
      @id, @dealId, @parentId, NULL, @authorName, @body, @createdAt
    )
  `);
  const insertDealVote = db.prepare(`
    INSERT OR IGNORE INTO deal_votes (
      id, deal_id, viewer_id, direction, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `);
  const insertCommentLike = db.prepare(`
    INSERT OR IGNORE INTO comment_likes (
      comment_id, viewer_id, created_at
    ) VALUES (?, ?, ?)
  `);
  const insertDealReport = db.prepare(`
    INSERT OR IGNORE INTO deal_reports (
      id, deal_id, viewer_id, reason, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `);

  const seed = db.transaction(() => {
    for (const deal of deals) {
      insertDeal.run(deal);
    }

    for (const comment of comments) {
      insertComment.run(comment);
    }

    for (const vote of dealVotes) {
      insertDealVote.run(...vote);
    }

    for (const like of commentLikes) {
      insertCommentLike.run(...like);
    }

    for (const report of dealReports) {
      insertDealReport.run(...report);
    }
  });

  seed();

  const counts = getTableCounts(db);
  console.log("Seed complete.");
  console.table(counts);
} finally {
  db.close();
}

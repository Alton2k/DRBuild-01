CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  price REAL NOT NULL,
  original_price REAL,
  store TEXT NOT NULL,
  category TEXT NOT NULL,
  sub_category TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  uploaded_image_url TEXT NOT NULL DEFAULT '',
  image_gallery_urls TEXT NOT NULL DEFAULT '[]',
  score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  moderation_reason TEXT NOT NULL DEFAULT 'new_user_manual_review',
  is_expired INTEGER NOT NULL DEFAULT 0 CHECK (is_expired IN (0, 1)),
  expired_at TEXT,
  duplicate_of_deal_id TEXT,
  duplicate_reason TEXT NOT NULL DEFAULT '',
  report_count INTEGER NOT NULL DEFAULT 0,
  author_user_id TEXT,
  author_email TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (duplicate_of_deal_id) REFERENCES deals (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS deals_status_expired_score_created_idx
  ON deals (status, is_expired, score DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS deals_created_idx
  ON deals (created_at DESC);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  parent_id TEXT,
  author_viewer_id TEXT,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (deal_id) REFERENCES deals (id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES comments (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS comments_deal_created_idx
  ON comments (deal_id, created_at);

CREATE INDEX IF NOT EXISTS comments_parent_idx
  ON comments (parent_id);

CREATE TABLE IF NOT EXISTS comment_likes (
  comment_id TEXT NOT NULL,
  viewer_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (comment_id, viewer_id),
  FOREIGN KEY (comment_id) REFERENCES comments (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS comment_likes_viewer_idx
  ON comment_likes (viewer_id);

CREATE TABLE IF NOT EXISTS deal_votes (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  viewer_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('up', 'down')),
  created_at TEXT NOT NULL,
  UNIQUE (deal_id, viewer_id),
  FOREIGN KEY (deal_id) REFERENCES deals (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS deal_votes_deal_direction_idx
  ON deal_votes (deal_id, direction);

CREATE INDEX IF NOT EXISTS deal_votes_viewer_idx
  ON deal_votes (viewer_id);

CREATE TABLE IF NOT EXISTS deal_reports (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL,
  viewer_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (deal_id, viewer_id),
  FOREIGN KEY (deal_id) REFERENCES deals (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS deal_reports_deal_idx
  ON deal_reports (deal_id);

CREATE INDEX IF NOT EXISTS deal_reports_viewer_idx
  ON deal_reports (viewer_id);

-- One ballot per person per poll. A name is matched case- and space-insensitively (voter_key).
CREATE TABLE IF NOT EXISTS ballots (
  poll TEXT NOT NULL,
  voter_key TEXT NOT NULL,
  name TEXT NOT NULL,
  ranking TEXT NOT NULL,      -- JSON array of stay ids, best first
  note TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL, -- ms since epoch
  PRIMARY KEY (poll, voter_key)
);

-- Sealed polls: ballots stay secret (GET returns only names) until published = 1.
-- Polls without a row here are open, as before. admin_key unlocks results and the publish switch.
CREATE TABLE IF NOT EXISTS polls (
  poll TEXT PRIMARY KEY,
  published INTEGER NOT NULL DEFAULT 0,
  admin_key TEXT NOT NULL
);

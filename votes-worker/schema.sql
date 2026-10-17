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

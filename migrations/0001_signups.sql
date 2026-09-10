CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY,
  namespace TEXT NOT NULL CHECK(namespace IN ('production','preview')),
  kind TEXT NOT NULL CHECK(kind IN ('waitlist','clinic')),
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  clinic TEXT NOT NULL DEFAULT '',
  consent_version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(namespace, kind, email)
);
CREATE TABLE IF NOT EXISTS submission_limits (
  id TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS submission_limits_expiry ON submission_limits(expires_at);

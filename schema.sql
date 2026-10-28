PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS documents (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL CHECK (json_valid(data)),
  PRIMARY KEY (collection, id)
);

CREATE INDEX IF NOT EXISTS idx_documents_collection
  ON documents (collection, id);

CREATE TABLE IF NOT EXISTS staff_accounts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL COLLATE NOCASE UNIQUE,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'worker')),
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_iterations INTEGER NOT NULL DEFAULT 100000 CHECK (password_iterations >= 100000),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Password bootstrap contract:
-- password_salt: 16 cryptographically random bytes, base64url without padding.
-- password_hash: PBKDF2-HMAC-SHA256(password UTF-8, decoded salt),
--                100000 iterations, 32-byte output, base64url without padding.
-- password_iterations: exactly 100000 for current accounts.
-- Migrated workers must be inserted with enabled = 0 and a non-usable random
-- password hash; setting newPassword through the admin API replaces the hash
-- and re-enables the account.

CREATE INDEX IF NOT EXISTS idx_staff_accounts_enabled
  ON staff_accounts (enabled, role);

CREATE TABLE IF NOT EXISTS staff_sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES staff_accounts(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  last_seen_at TEXT,
  ip_hash TEXT,
  user_agent_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_staff_sessions_account
  ON staff_sessions (account_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_expiry
  ON staff_sessions (expires_at, revoked_at);

CREATE TABLE IF NOT EXISTS login_rate_limits (
  bucket TEXT PRIMARY KEY,
  window_started_at TEXT NOT NULL,
  failures INTEGER NOT NULL CHECK (failures >= 0),
  blocked_until TEXT
);

CREATE INDEX IF NOT EXISTS idx_login_rate_limits_blocked
  ON login_rate_limits (blocked_until);

CREATE TABLE IF NOT EXISTS order_tokens (
  order_doc_id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_idempotency (
  order_id TEXT PRIMARY KEY,
  order_doc_id TEXT NOT NULL UNIQUE,
  caller_hash TEXT NOT NULL,
  body_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_idempotency_caller
  ON order_idempotency (caller_hash, created_at);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type IN ('image/png', 'image/jpeg', 'image/webp')),
  data BLOB NOT NULL,
  created_at TEXT NOT NULL
);

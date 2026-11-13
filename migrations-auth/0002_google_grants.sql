CREATE TABLE google_transactions (
  token_hash TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  service TEXT NOT NULL CHECK(service IN ('sheets', 'calendar')),
  state TEXT NOT NULL,
  nonce TEXT NOT NULL,
  verifier TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE google_grants (
  subject TEXT NOT NULL,
  service TEXT NOT NULL CHECK(service IN ('sheets', 'calendar')),
  encrypted_token TEXT NOT NULL,
  PRIMARY KEY(subject, service)
);

CREATE TABLE google_transactions_next (
 token_hash TEXT PRIMARY KEY, subject TEXT NOT NULL,
 service TEXT NOT NULL CHECK(service IN ('sheets','calendar','sheetsWrite')),
 state TEXT NOT NULL, nonce TEXT NOT NULL, verifier TEXT NOT NULL, expires_at INTEGER NOT NULL
);
INSERT INTO google_transactions_next SELECT * FROM google_transactions;
DROP TABLE google_transactions;
ALTER TABLE google_transactions_next RENAME TO google_transactions;
CREATE TABLE google_grants_next (
 subject TEXT NOT NULL, service TEXT NOT NULL CHECK(service IN ('sheets','calendar','sheetsWrite')),
 encrypted_token TEXT NOT NULL, PRIMARY KEY(subject,service)
);
INSERT INTO google_grants_next SELECT * FROM google_grants;
DROP TABLE google_grants;
ALTER TABLE google_grants_next RENAME TO google_grants;

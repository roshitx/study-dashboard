CREATE TABLE google_scope_proofs (
 subject TEXT NOT NULL,
 service TEXT NOT NULL CHECK(service IN ('sheets','calendar','sheetsWrite')),
 encrypted_token TEXT NOT NULL,
 scopes TEXT NOT NULL,
 PRIMARY KEY(subject, service)
);

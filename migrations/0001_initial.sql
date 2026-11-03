-- Proposed application metadata schema. Not applied to any account.
PRAGMA foreign_keys = ON;
CREATE TABLE semesters (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, number INTEGER NOT NULL CHECK(number > 0),
  academic_period TEXT, is_active INTEGER NOT NULL DEFAULT 0 CHECK(is_active IN(0,1)),
  UNIQUE(owner_id, number), UNIQUE(owner_id, id)
);
CREATE UNIQUE INDEX one_active_semester ON semesters(owner_id) WHERE is_active = 1;
CREATE TABLE courses (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, registration_code TEXT NOT NULL, display_name TEXT NOT NULL,
  UNIQUE(owner_id, registration_code), UNIQUE(owner_id, id)
);
CREATE TABLE course_offerings (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, semester_id TEXT NOT NULL, course_id TEXT NOT NULL,
  class_id TEXT, credits INTEGER CHECK(credits > 0), UNIQUE(owner_id, semester_id, course_id), UNIQUE(owner_id,id),
  FOREIGN KEY(owner_id,semester_id) REFERENCES semesters(owner_id,id),
  FOREIGN KEY(owner_id,course_id) REFERENCES courses(owner_id,id)
);
CREATE TABLE integration_bindings (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN('sheets','calendar','vault')),
  semester_id TEXT, config_json TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY(owner_id,semester_id) REFERENCES semesters(owner_id,id)
);
-- No plaintext note body/password stored here. Path identifiers for encrypted vault should be opaque.
CREATE TABLE activities (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, offering_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN('reading','attendance','discussion','assignment')),
  title TEXT NOT NULL, session_number INTEGER CHECK(session_number BETWEEN 1 AND 8),
  submission TEXT NOT NULL DEFAULT 'unknown' CHECK(submission IN('unknown','not_started','draft','ready','submitted','graded')),
  grade REAL CHECK(grade BETWEEN 0 AND 100), due_date TEXT, due_time TEXT, time_zone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  revision INTEGER NOT NULL DEFAULT 1, UNIQUE(owner_id,id),
  FOREIGN KEY(owner_id,offering_id) REFERENCES course_offerings(owner_id,id)
);
CREATE TABLE activity_note_refs (
  owner_id TEXT NOT NULL, activity_id TEXT NOT NULL, opaque_note_id TEXT NOT NULL,
  PRIMARY KEY(owner_id,activity_id,opaque_note_id),
  FOREIGN KEY(owner_id,activity_id) REFERENCES activities(owner_id,id)
);
CREATE TABLE study_sessions (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, offering_id TEXT NOT NULL, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL,
  calendar_event_id TEXT, calendar_revision TEXT, UNIQUE(owner_id,calendar_event_id),
  FOREIGN KEY(owner_id,offering_id) REFERENCES course_offerings(owner_id,id)
);
CREATE TABLE practice_attempts (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, offering_id TEXT NOT NULL, opaque_question_id TEXT NOT NULL,
  answers_ciphertext TEXT NOT NULL, score REAL, score_basis TEXT, created_at TEXT NOT NULL,
  FOREIGN KEY(owner_id,offering_id) REFERENCES course_offerings(owner_id,id)
);
CREATE TABLE write_receipts (
  owner_id TEXT NOT NULL, idempotency_key TEXT NOT NULL, integration TEXT NOT NULL,
  request_hash TEXT NOT NULL, state TEXT NOT NULL CHECK(state IN('pending','confirmed','uncertain','failed')),
  provider_receipt TEXT, PRIMARY KEY(owner_id,idempotency_key)
);

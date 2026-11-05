-- Academic configuration only; no note paths, content, indexes or credentials.
ALTER TABLE courses ADD COLUMN source_course_code TEXT;
CREATE TABLE academic_metadata (
  owner_id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL CHECK (revision > 0),
  config_json TEXT NOT NULL CHECK (json_valid(config_json)),
  updated_at TEXT NOT NULL
);

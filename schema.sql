-- schema.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS repositories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- internal uuid
  repo_node_id TEXT UNIQUE,         -- GraphQL node id (base64)
  repo_db_id BIGINT,                -- repository databaseId (if available)
  name TEXT,
  owner TEXT,
  stars INTEGER,
  url TEXT,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_repos_repo_db_id ON repositories(repo_db_id);
CREATE INDEX IF NOT EXISTS idx_repos_owner ON repositories(owner);
CREATE INDEX IF NOT EXISTS idx_repos_name ON repositories(name);

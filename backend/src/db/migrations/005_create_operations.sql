DO $$ BEGIN
  CREATE TYPE operation_type AS ENUM ('insert', 'delete', 'format', 'replace_all');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS operations (
  op_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doc_id UUID NOT NULL REFERENCES documents(doc_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type operation_type NOT NULL,
  position INTEGER NOT NULL,
  content TEXT,
  attributes JSONB DEFAULT '{}',
  client_version INTEGER NOT NULL,
  server_version INTEGER NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operations_doc_id ON operations(doc_id);
CREATE INDEX IF NOT EXISTS idx_operations_doc_id_server_version ON operations(doc_id, server_version);
CREATE INDEX IF NOT EXISTS idx_operations_timestamp ON operations(timestamp);

CREATE TABLE IF NOT EXISTS snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doc_id UUID NOT NULL REFERENCES documents(doc_id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  blob_path VARCHAR(500) NOT NULL,
  operations_since_last INTEGER DEFAULT 0,
  created_by VARCHAR(100) DEFAULT 'system',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (doc_id, version)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_doc_id ON snapshots(doc_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_doc_id_version ON snapshots(doc_id, version DESC);

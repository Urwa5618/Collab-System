import { query } from "../config/db";
import { getDocumentState, setDocumentState } from "./redisHelpers";

type SnapshotRow = {
  snapshot_id: string;
  version: number;
  blob_path: string;
  created_at: string;
};

export const loadDocumentState = async (docId: string): Promise<string> => {
  const cached = await getDocumentState(docId);
  if (cached !== null) {
    return cached;
  }

  let content = "";

  const snapshotResult = await query(
    "SELECT snapshot_id, version, blob_path, created_at FROM snapshots WHERE doc_id = $1 ORDER BY version DESC LIMIT 1",
    [docId]
  );

  if (snapshotResult.rows.length === 0) {
    content = "";
  } else {
    const snapshot = snapshotResult.rows[0] as unknown as SnapshotRow;
    void snapshot;
    // TODO Phase 8: download from MinIO using blob_path
    content = "";
  }

  await query(
    "SELECT op_id, type, position, content, attributes, server_version FROM operations WHERE doc_id = $1 ORDER BY server_version ASC",
    [docId]
  );

  // TODO Phase 5: replay operations through OT engine
  content = "";

  await setDocumentState(docId, content);
  return content;
};

import { query } from "../config/db";
import type { OperationEvent } from "../types";
import { transformAgainstHistory } from "../ot/otEngine";
import { loadDocumentState } from "./documentLoader";

type ProcessedOperation = OperationEvent & { serverVersion: number; noop?: boolean };

export const handleOperation = async (
  docId: string,
  userId: string,
  op: OperationEvent
): Promise<ProcessedOperation> => {
  let content = op.content;
  if (op.type === 'delete') {
    const currentContent = await loadDocumentState(docId);
    content = currentContent.substring(op.position, op.position + (op.length ?? 0));
  }

  const transformedOp = await transformAgainstHistory(docId, {
    opId: op.opId,
    type: op.type,
    position: op.position,
    content: content,
    length: op.type === 'delete' ? (op.length ?? op.content?.length ?? 0) : undefined,
    attributes: op.attributes,
    clientVersion: op.clientVersion,
    userId,
    timestamp: op.timestamp
  });

  if (transformedOp.noop) {
    return {
      ...op,
      serverVersion: -1,
      noop: true
    };
  }

  const versionResult = await query(
    "SELECT COALESCE(MAX(server_version), 0) + 1 as next_version FROM operations WHERE doc_id = $1",
    [docId]
  );

  const nextVersion = Number(versionResult.rows[0]?.next_version ?? 1);

  await query(
    "INSERT INTO operations (op_id, doc_id, user_id, type, position, content, attributes, client_version, server_version, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())",
    [
      transformedOp.opId,
      docId,
      userId,
      transformedOp.type,
      transformedOp.position,
      transformedOp.content ?? "",
      transformedOp.attributes ?? {},
      transformedOp.clientVersion,
      nextVersion
    ]
  );

  return {
    ...op,
    ...transformedOp,
    serverVersion: nextVersion
  };
};

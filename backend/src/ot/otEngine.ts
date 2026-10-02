import { query } from '../config/db';
import { OTOperation } from './types';
import { transformOperation } from './transform';

export async function transformAgainstHistory(docId: string, incomingOp: OTOperation): Promise<OTOperation> {
  const historyResult = await query(
    `SELECT op_id, type, position, content, attributes, server_version, user_id, timestamp
     FROM operations
     WHERE doc_id = $1 AND server_version > $2
     ORDER BY server_version ASC`,
    [docId, incomingOp.clientVersion]
  );

  if (historyResult.rows.length === 0) {
    return incomingOp;
  }

  const historicalOperations: OTOperation[] = historyResult.rows.map(row => ({
    opId: row.op_id,
    type: row.type,
    position: row.position,
    content: row.content,
    length: row.type === 'delete' ? (row.content?.length ?? 0) : undefined,
    attributes: row.attributes,
    clientVersion: row.server_version, 
    serverVersion: row.server_version,
    userId: row.user_id,
    timestamp: row.timestamp
  }));

  let transformed = incomingOp;
  for (const historicalOp of historicalOperations) {
    transformed = transformOperation(transformed, historicalOp);
    if (transformed.noop) break; // no point continuing if operation became a no-op
  }
  
  return transformed;
}
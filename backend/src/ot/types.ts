export type OTOperationType = 'insert' | 'delete' | 'format' | 'replace_all';

export interface OTOperation {
  opId: string;
  type: OTOperationType;
  position: number;
  content?: string;       // for insert: text being inserted. for delete: not used
  length?: number;        // for delete: number of characters to delete
  attributes?: Record<string, unknown>;  // for format operations
  clientVersion: number;
  serverVersion?: number;
  userId: string;
  timestamp: string;
  noop?: boolean;
}

export interface TransformResult {
  transformedOp: OTOperation;
}

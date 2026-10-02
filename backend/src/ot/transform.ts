import { OTOperation } from './types';

/**
 * Transforms opToTransform against againstOp.
 * Returns a new operation object without mutating the input.
 */
export function transformOperation(opToTransform: OTOperation, againstOp: OTOperation): OTOperation {
  // Case 6: replace_all
  // If againstOp is a replace_all, the document base content totally changed.
  if (againstOp.type === 'replace_all') {
    return { ...opToTransform, noop: true };
  }

  // Case 5: Format operations
  // Format operations never change other operations' positions when used as the againstOp.
  if (againstOp.type === 'format') {
    return { ...opToTransform };
  }

  const newOp = { ...opToTransform };
  const isInsertOrFormat = opToTransform.type === 'insert' || opToTransform.type === 'format';

  // Case 1: Insert vs Insert (and format for position purposes as per rules)
  if (againstOp.type === 'insert' && isInsertOrFormat) {
    const splitIndex = againstOp.position;
    const againstLength = againstOp.content?.length ?? 0;
    
    if (splitIndex < opToTransform.position) {
      newOp.position = opToTransform.position + againstLength;
    } else if (splitIndex > opToTransform.position) {
      // new position = opToTransform.position (unchanged)
    } else {
      // equal positions: tiebreaker
      if (againstOp.timestamp < opToTransform.timestamp) {
        newOp.position = opToTransform.position + againstLength;
      }
      // else position unchanged
    }
  }
  // Case 2: Insert vs Delete (transforming an insert against a delete that happened)
  else if (againstOp.type === 'delete' && isInsertOrFormat) {
    const deleteStart = againstOp.position;
    const againstLength = againstOp.length ?? 0;
    const deleteEnd = deleteStart + againstLength;

    if (opToTransform.position <= deleteStart) {
      // new position = opToTransform.position (unchanged)
    } else if (opToTransform.position >= deleteEnd) {
      newOp.position = opToTransform.position - againstLength;
    } else {
      // position falls within the deleted range
      newOp.position = deleteStart;
    }
  }
  // Case 3: Delete vs Insert (transforming a delete against an insert that happened)
  else if (againstOp.type === 'insert' && opToTransform.type === 'delete') {
    const againstLength = againstOp.content?.length ?? 0;
    
    if (againstOp.position <= opToTransform.position) {
      newOp.position = opToTransform.position + againstLength;
    } else if (againstOp.position >= opToTransform.position + (opToTransform.length ?? 0)) {
      // new position = opToTransform.position (unchanged)
    } else {
      // insert happened within the delete range
      newOp.length = (opToTransform.length ?? 0) + againstLength;
      // position unchanged
    }
  }
  // Case 4: Delete vs Delete
  else if (againstOp.type === 'delete' && opToTransform.type === 'delete') {
    const aStart = againstOp.position;
    const aLength = againstOp.length ?? 0;
    const aEnd = aStart + aLength;
    
    const bStart = opToTransform.position;
    const bLength = opToTransform.length ?? 0;
    const bEnd = bStart + bLength;

    if (aEnd <= bStart) {
      newOp.position = bStart - aLength;
    } else if (aStart >= bEnd) {
      newOp.position = bStart;
    } else {
      // overlap exists — calculate the non-overlapping remainder
      const newStart = Math.min(bStart, aStart);
      const overlapLength = Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
      
      newOp.length = Math.max(0, bLength - overlapLength);
      newOp.position = (aStart < bStart) ? aStart : bStart;
      
      if (newOp.length === 0) {
        newOp.noop = true;
      }
    }
  }

  return newOp;
}
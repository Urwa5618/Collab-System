import { transformOperation } from './transform';
import { OTOperation } from './types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`PASSED: ${message}`);
  }
}

const baseOp: OTOperation = {
  opId: 'test',
  type: 'insert',
  position: 0,
  clientVersion: 1,
  userId: 'user1',
  timestamp: '2023-01-01T00:00:00Z',
};

// Test 1: Insert vs Insert - against happens before
const t1_against: OTOperation = { ...baseOp, position: 0, content: 'ab', type: 'insert', timestamp: '1' };
const t1_target: OTOperation = { ...baseOp, position: 2, content: 'c', type: 'insert', timestamp: '2' };
const t1_res = transformOperation(t1_target, t1_against);
assert(t1_res.position === 4, 'Test 1: Insert vs Insert - against happens before');

// Test 2: Insert vs Insert - against happens after
const t2_against: OTOperation = { ...baseOp, position: 5, content: 'ab', type: 'insert', timestamp: '1' };
const t2_target: OTOperation = { ...baseOp, position: 2, content: 'c', type: 'insert', timestamp: '2' };
const t2_res = transformOperation(t2_target, t2_against);
assert(t2_res.position === 2, 'Test 2: Insert vs Insert - against happens after');

// Test 3: Insert vs Delete - insert position before delete range
const t3_against: OTOperation = { ...baseOp, position: 5, length: 2, type: 'delete', timestamp: '1' };
const t3_target: OTOperation = { ...baseOp, position: 2, content: 'c', type: 'insert', timestamp: '2' };
const t3_res = transformOperation(t3_target, t3_against);
assert(t3_res.position === 2, 'Test 3: Insert vs Delete - insert position before delete range');

// Test 4: Insert vs Delete - insert position after delete range
const t4_against: OTOperation = { ...baseOp, position: 2, length: 2, type: 'delete', timestamp: '1' };
const t4_target: OTOperation = { ...baseOp, position: 5, content: 'c', type: 'insert', timestamp: '2' };
const t4_res = transformOperation(t4_target, t4_against);
assert(t4_res.position === 3, 'Test 4: Insert vs Delete - insert position after delete range');

// Test 5: Delete vs Insert - insert before delete
const t5_against: OTOperation = { ...baseOp, position: 1, content: 'ab', type: 'insert', timestamp: '1' };
const t5_target: OTOperation = { ...baseOp, position: 2, length: 2, type: 'delete', timestamp: '2' };
const t5_res = transformOperation(t5_target, t5_against);
assert(t5_res.position === 4, 'Test 5: Delete vs Insert - insert before delete');

// Test 6: Delete vs Delete - no overlap
const t6_against: OTOperation = { ...baseOp, position: 1, length: 2, type: 'delete', timestamp: '1' };
const t6_target: OTOperation = { ...baseOp, position: 5, length: 2, type: 'delete', timestamp: '2' };
const t6_res = transformOperation(t6_target, t6_against);
assert(t6_res.position === 3, 'Test 6: Delete vs Delete - no overlap');

// Test 7: Delete vs Delete - full overlap (should be noop)
const t7_against: OTOperation = { ...baseOp, position: 1, length: 5, type: 'delete', timestamp: '1' };
const t7_target: OTOperation = { ...baseOp, position: 2, length: 2, type: 'delete', timestamp: '2' };
const t7_res = transformOperation(t7_target, t7_against);
assert(t7_res.noop === true, 'Test 7: Delete vs Delete - full overlap (should be noop)');

// Test 8: 'abc' -> insert(A,0) and insert(D,3) concurrently -> should converge to 'AabcD'
const t8_against: OTOperation = { ...baseOp, position: 0, content: 'A', type: 'insert', timestamp: '1' };
const t8_target: OTOperation = { ...baseOp, position: 3, content: 'D', type: 'insert', timestamp: '2' };
const t8_res = transformOperation(t8_target, t8_against);
assert(t8_res.position === 4, 'Test 8: The exact scenario from the system design doc (\'abc\' -> insert(A,0) and insert(D,3) concurrently -> should converge to AabcD)');
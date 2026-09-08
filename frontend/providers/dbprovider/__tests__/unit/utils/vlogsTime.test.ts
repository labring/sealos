import assert from 'node:assert/strict';
import test from 'node:test';
import { toVlogsQueryTime } from '../../../src/utils/vlogsTime';

test('serializes a browser timestamp as an unambiguous UTC query time', () => {
  assert.equal(toVlogsQueryTime(1787638417000), '2026-08-25T06:13:37.000Z');
});

test('rejects invalid log query timestamps', () => {
  assert.throws(() => toVlogsQueryTime('not-a-date'), /Invalid log query timestamp/);
});

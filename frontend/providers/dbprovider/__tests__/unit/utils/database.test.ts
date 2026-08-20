import assert from 'node:assert/strict';
import test from 'node:test';
import { selectConnectPodFromMembersStatus } from '../../../src/utils/connectTarget.ts';

test('prefers the leader pod for direct database connections', () => {
  assert.equal(
    selectConnectPodFromMembersStatus([
      { podName: 'db-1' },
      { podName: 'db-2', role: { isLeader: true } }
    ]),
    'db-2'
  );
});

test('falls back to the first available member when no leader is reported', () => {
  assert.equal(
    selectConnectPodFromMembersStatus([
      null,
      { role: { isLeader: false } },
      { podName: 'db-1' },
      { podName: 'db-2' }
    ]),
    'db-1'
  );
});

test('fails when the InstanceSet has no usable member', () => {
  assert.throws(
    () => selectConnectPodFromMembersStatus([null, { role: { isLeader: true } }]),
    /No available members found in InstanceSet status/
  );
});

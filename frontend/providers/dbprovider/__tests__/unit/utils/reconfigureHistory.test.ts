import assert from 'node:assert/strict';
import test from 'node:test';
import { getReconfigureHistoryConfigurations } from '../../../src/utils/reconfigureHistory.ts';

const previousConfigKey = 'cloud.sealos.io/previous-config';

test('maps Reconfiguring OpsRequest values for the operation history', () => {
  assert.deepEqual(
    getReconfigureHistoryConfigurations(
      {
        metadata: {
          annotations: {
            [previousConfigKey]: JSON.stringify({ 'net.maxIncomingConnections': '700' })
          }
        },
        spec: {
          reconfigure: {
            configurations: [
              {
                keys: [
                  {
                    parameters: [{ key: 'net.maxIncomingConnections', value: '900' }]
                  }
                ]
              }
            ]
          }
        }
      },
      previousConfigKey,
      '-'
    ),
    [
      {
        parameterName: 'net.maxIncomingConnections',
        oldValue: '700',
        newValue: '900'
      }
    ]
  );
});

test('uses the operation history placeholder when the previous value is unavailable', () => {
  assert.deepEqual(
    getReconfigureHistoryConfigurations(
      {
        spec: {
          reconfigure: {
            configurations: [
              {
                keys: [{ parameters: [{ key: 'max_connections', value: '900' }] }]
              }
            ]
          }
        }
      },
      previousConfigKey,
      '-'
    ),
    [{ parameterName: 'max_connections', oldValue: '-', newValue: '900' }]
  );
});

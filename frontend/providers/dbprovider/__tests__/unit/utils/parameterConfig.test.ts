import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyParameterDifferences,
  areParameterValuesApplied,
  getParameterDifferences
} from '../../../src/utils/parameterChanges';
import { getParameterHistoryName } from '../../../src/utils/parameterHistory';

test('keeps MySQL submission and runtime paths distinct', () => {
  const differences = getParameterDifferences({
    dbType: 'apecloud-mysql',
    current: {
      'mysqld.max_connections': '700',
      'mysqld.default-time-zone': 'UTC',
      'mysqld.lower_case_table_names': '0'
    },
    requested: {
      isMaxConnectionsCustomized: true,
      maxConnections: '900',
      timeZone: 'UTC',
      lowerCaseTableNames: '0'
    },
    dynamicMaxConnections: 100
  });

  assert.deepEqual(differences, [
    {
      path: 'max_connections',
      currentPath: 'mysqld.max_connections',
      oldValue: '700',
      newValue: '900'
    }
  ]);
});

test('reports success only after the runtime value matches', () => {
  const differences = [
    {
      path: 'max_connections',
      currentPath: 'max_connections',
      oldValue: '700',
      newValue: '900'
    }
  ];

  assert.equal(areParameterValuesApplied({ max_connections: '700' }, differences), false);
  assert.equal(areParameterValuesApplied({ max_connections: '900' }, differences), true);
});

test('updates only the requested configuration item', () => {
  const configuration = {
    metadata: { resourceVersion: '10' },
    spec: {
      configItemDetails: [
        {
          name: 'postgresql-configuration',
          configFileParams: {
            'postgresql.conf': { parameters: { max_connections: '700', timezone: 'UTC' } }
          }
        },
        { name: 'pgbouncer-configuration', configSpec: { name: 'pgbouncer-configuration' } }
      ]
    }
  };

  const updated = applyParameterDifferences({
    configuration,
    configItemName: 'postgresql-configuration',
    configMapKey: 'postgresql.conf',
    differences: [
      {
        path: 'max_connections',
        currentPath: 'max_connections',
        oldValue: '700',
        newValue: '900'
      }
    ]
  });

  assert.equal(
    updated.spec.configItemDetails[0].configFileParams['postgresql.conf'].parameters.max_connections,
    '900'
  );
  assert.equal(
    updated.spec.configItemDetails[0].configFileParams['postgresql.conf'].parameters.timezone,
    'UTC'
  );
  assert.deepEqual(updated.spec.configItemDetails[1], {
    name: 'pgbouncer-configuration',
    configSpec: { name: 'pgbouncer-configuration' }
  });
  assert.equal(updated.metadata.resourceVersion, '10');
});

test('keeps parameter history names within the Kubernetes limit', () => {
  const name = getParameterHistoryName('a'.repeat(30));

  assert.ok(name.length <= 63);
  assert.match(name, /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/);
});

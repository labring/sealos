import assert from 'node:assert/strict';
import test from 'node:test';
import {
  areParameterValuesApplied,
  getPostgreSQLConfigSpecMetadata,
  getPostgreSQLConfigSpecPatch,
  getParameterConfigFromRuntimeValues,
  getParameterDifferences,
  getDefaultMaxConnections,
  mergeRedisParameterValues,
  shouldUseRedisConfigurationFallback,
  toKubeBlocksParameterPairs
} from '../../../src/utils/parameterChanges';
import {
  getParameterHistoryName,
  resolveParameterHistoryStatus
} from '../../../src/utils/parameterHistory';
import { ReconfigStatus } from '../../../src/constants/db';

test('uses Redis Configuration fallback only when runtime ConfigMap values are absent', () => {
  assert.equal(
    shouldUseRedisConfigurationFallback({
      includeConfigurationOverrides: false,
      hasConfigMapValues: false
    }),
    true
  );
  assert.equal(
    shouldUseRedisConfigurationFallback({
      includeConfigurationOverrides: false,
      hasConfigMapValues: true
    }),
    false
  );
});

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

test('does not resubmit an equivalent MySQL timezone representation', () => {
  assert.deepEqual(
    getParameterDifferences({
      dbType: 'apecloud-mysql',
      current: {
        'mysqld.max_connections': '100',
        'mysqld.default-time-zone': '+00:00',
        'mysqld.lower_case_table_names': '0'
      },
      requested: { timeZone: 'UTC' },
      dynamicMaxConnections: 100
    }),
    []
  );
});

test('builds edit form parameters from runtime values', () => {
  assert.deepEqual(
    getParameterConfigFromRuntimeValues({
      dbType: 'postgresql',
      currentValues: { max_connections: '700', timezone: 'UTC' },
      dynamicMaxConnections: 100
    }),
    {
      maxConnections: '700',
      timeZone: 'UTC',
      isMaxConnectionsCustomized: true
    }
  );
});

test('uses the backend Redis default connection formula consistently', () => {
  assert.equal(getDefaultMaxConnections('redis', 100, 256), 225);
  assert.deepEqual(
    getParameterConfigFromRuntimeValues({
      dbType: 'redis',
      currentValues: { maxclients: '225' },
      dynamicMaxConnections: 225
    }),
    {
      maxConnections: '225',
      isMaxConnectionsCustomized: false
    }
  );
});

test('lets Redis Configuration values override stale ConfigMap values', () => {
  assert.deepEqual(
    mergeRedisParameterValues({ maxclients: '700', maxmemory: '1gb' }, { maxclients: 900 }),
    { maxclients: '900', maxmemory: '1gb' }
  );
});

test('serializes parameter differences for a KubeBlocks reconfigure OpsRequest', () => {
  assert.deepEqual(
    toKubeBlocksParameterPairs([
      { path: 'max_connections', oldValue: '700', newValue: '701' }
    ]),
    [
    { key: 'max_connections', value: '701' }
    ]
  );
});

test('preserves KubeBlocks PostgreSQL parameter constraints in generated configurations', () => {
  assert.deepEqual(getPostgreSQLConfigSpecMetadata('12'), {
    constraintRef: 'postgresql12-cc',
    keys: ['postgresql.conf']
  });
  assert.deepEqual(getPostgreSQLConfigSpecMetadata('14'), {
    constraintRef: 'postgresql14-cc',
    keys: ['postgresql.conf']
  });
});

test('repairs missing PostgreSQL parameter constraints for existing configurations', () => {
  assert.deepEqual(
    getPostgreSQLConfigSpecPatch({
      dbVersion: 'postgresql-14.8.0',
      configItemDetails: [
        { name: 'metrics', configSpec: {} },
        { name: 'postgresql-configuration', configSpec: {} }
      ]
    }),
    [
      {
        op: 'add',
        path: '/spec/configItemDetails/1/configSpec/constraintRef',
        value: 'postgresql14-cc'
      },
      {
        op: 'add',
        path: '/spec/configItemDetails/1/configSpec/keys',
        value: ['postgresql.conf']
      }
    ]
  );
});

test('does not patch an existing valid PostgreSQL configuration', () => {
  assert.deepEqual(
    getPostgreSQLConfigSpecPatch({
      dbVersion: 'postgresql-12.14.0',
      configItemDetails: [
        {
          name: 'postgresql-configuration',
          configSpec: {
            constraintRef: 'postgresql12-cc',
            keys: ['postgresql.conf']
          }
        }
      ]
    }),
    []
  );
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

test('keeps parameter history names within the Kubernetes limit', () => {
  const name = getParameterHistoryName('a'.repeat(30));

  assert.ok(name.length <= 63);
  assert.match(name, /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/);
});

test('keeps a submitted parameter change running until runtime values match', () => {
  const history = {
    dbType: 'mongodb' as const,
    status: ReconfigStatus.Running,
    createdAt: '2026-08-12T00:00:00.000Z',
    differences: [
      {
        path: 'net.maxIncomingConnections',
        currentPath: 'net.maxIncomingConnections',
        oldValue: '700',
        newValue: '900'
      }
    ]
  };

  assert.equal(
    resolveParameterHistoryStatus({
      history,
      currentValues: { 'net.maxIncomingConnections': '700' },
      now: Date.parse('2026-08-12T00:01:00.000Z')
    }),
    ReconfigStatus.Running
  );
  assert.equal(
    resolveParameterHistoryStatus({
      history,
      currentValues: { 'net.maxIncomingConnections': '900' },
      now: Date.parse('2026-08-12T00:01:00.000Z')
    }),
    ReconfigStatus.Succeed
  );
});

test('marks a parameter change failed after the apply deadline', () => {
  assert.equal(
    resolveParameterHistoryStatus({
      history: {
        dbType: 'mongodb',
        status: ReconfigStatus.Running,
        createdAt: '2026-08-12T00:00:00.000Z',
        differences: [
          {
            path: 'net.maxIncomingConnections',
            oldValue: '700',
            newValue: '900'
          }
        ]
      },
      currentValues: { 'net.maxIncomingConnections': '700' },
      now: Date.parse('2026-08-12T00:05:00.000Z')
    }),
    ReconfigStatus.Failed
  );
});

test('prefers an applied runtime value over an expired deadline', () => {
  assert.equal(
    resolveParameterHistoryStatus({
      history: {
        dbType: 'mongodb',
        status: ReconfigStatus.Running,
        createdAt: '2026-08-12T00:00:00.000Z',
        differences: [
          {
            path: 'net.maxIncomingConnections',
            oldValue: '700',
            newValue: '900'
          }
        ]
      },
      currentValues: { 'net.maxIncomingConnections': '900' },
      now: Date.parse('2026-08-12T00:10:00.000Z')
    }),
    ReconfigStatus.Succeed
  );
});

import assert from 'node:assert/strict';
import test from 'node:test';
import yaml from 'js-yaml';
import React from 'react';

(globalThis as any).React = React;

let DBTypeEnum: typeof import('../../../src/constants/db').DBTypeEnum;
let adaptDBDetail: typeof import('../../../src/utils/adapt').adaptDBDetail;
let adaptOperationLog: typeof import('../../../src/utils/adapt').adaptOperationLog;
let getDatabaseResourceComponentSpec: typeof import('../../../src/utils/adapt').getDatabaseResourceComponentSpec;
let json2BasicOps: typeof import('../../../src/utils/json2Yaml').json2BasicOps;
let json2ResourceOps: typeof import('../../../src/utils/json2Yaml').json2ResourceOps;
let raw2DatabaseSchema: typeof import('../../../src/services/backend/apis/get-database').raw2schema;

test.before(async () => {
  ({ DBTypeEnum } = await import('../../../src/constants/db'));
  ({ adaptDBDetail, adaptOperationLog, getDatabaseResourceComponentSpec } = await import(
    '../../../src/utils/adapt'
  ));
  ({ json2BasicOps, json2ResourceOps } = await import('../../../src/utils/json2Yaml'));
  ({ raw2schema: raw2DatabaseSchema } = await import(
    '../../../src/services/backend/apis/get-database'
  ));
});

const component = (
  name: string,
  replicas: number,
  cpu = '1000m',
  memory = '1Gi',
  storage?: string
) => ({
  name,
  componentDefRef: name,
  replicas,
  resources: {
    requests: { cpu: '100m', memory: '100Mi' },
    limits: { cpu, memory }
  },
  ...(storage
    ? {
        volumeClaimTemplates: [
          {
            name: 'data',
            spec: {
              accessModes: ['ReadWriteOnce'],
              resources: { requests: { storage } }
            }
          }
        ]
      }
    : {})
});

const form = (storage: number, cpu = 4000, memory = 4096) => ({
  dbType: DBTypeEnum.polardbx,
  dbVersion: 'polardbx-v1.0',
  dbName: 'polardbx',
  replicas: 3,
  cpu,
  memory,
  storage,
  labels: {},
  terminationPolicy: 'Delete'
});

const loadSpec = (
  data: object,
  type: 'VerticalScaling' | 'HorizontalScaling' | 'VolumeExpansion'
) =>
  (yaml.load(json2ResourceOps(data as any, type, (data as any).currentComponentSpecs)) as any).spec;

test('uses dn-0 as the PolarDB-X replica source even when components are unordered', () => {
  const specs = [
    component('cn', 1),
    component('gms', 1),
    component('dn-0', 3),
    component('cdc', 1)
  ];
  assert.equal(getDatabaseResourceComponentSpec('polardbx', specs as any)?.replicas, 3);
  assert.equal(
    adaptDBDetail({
      metadata: {
        name: 'polardbx',
        uid: 'uid',
        creationTimestamp: new Date(),
        labels: {
          'clusterdefinition.kubeblocks.io/name': 'polardbx',
          'clusterversion.kubeblocks.io/name': 'polardbx-v1.0'
        }
      },
      spec: { componentSpecs: specs }
    } as any).replicas,
    3
  );
});

test('keeps PolarDB-X logical storage consistent with the edit form', () => {
  const detail = adaptDBDetail({
    metadata: {
      name: 'polardbx',
      uid: 'uid',
      creationTimestamp: new Date(),
      labels: {
        'clusterdefinition.kubeblocks.io/name': 'polardbx',
        'clusterversion.kubeblocks.io/name': 'polardbx-v1.0'
      }
    },
    spec: {
      componentSpecs: [
        component('gms', 1, '1000m', '1Gi', '3Gi'),
        component('dn-0', 3, '1000m', '1Gi', '1Gi')
      ]
    }
  } as any);
  assert.equal(detail.storage, 4);
  assert.equal(detail.totalStorage, 4);
});

test('expands an old 3Gi PolarDB-X cluster through its existing GMS data volume', () => {
  const specs = [
    component('gms', 1, '1000m', '1Gi', '3Gi'),
    component('dn-0', 3),
    component('cn', 1),
    component('cdc', 1)
  ];
  const spec = loadSpec(
    { ...form(4), currentComponentSpecs: specs },
    'VolumeExpansion'
  ).volumeExpansion;
  assert.deepEqual(spec, [
    { componentName: 'gms', volumeClaimTemplates: [{ name: 'data', storage: '4Gi' }] }
  ]);
});

test('expands only the component that owns the new logical storage', () => {
  const specs = [
    component('gms', 1, '1000m', '1Gi', '3Gi'),
    component('dn-0', 3, '1000m', '1Gi', '1Gi')
  ];
  const spec = loadSpec(
    { ...form(5), currentComponentSpecs: specs },
    'VolumeExpansion'
  ).volumeExpansion;
  assert.deepEqual(spec, [
    { componentName: 'dn-0', volumeClaimTemplates: [{ name: 'data', storage: '2Gi' }] }
  ]);
});

test('adds only the requested delta when an existing volume is already above the preferred split', () => {
  const specs = [
    component('gms', 1, '1000m', '1Gi', '4Gi'),
    component('dn-0', 3, '1000m', '1Gi', '1Gi')
  ];
  const spec = loadSpec(
    { ...form(6), currentComponentSpecs: specs },
    'VolumeExpansion'
  ).volumeExpansion;
  assert.deepEqual(spec, [
    { componentName: 'dn-0', volumeClaimTemplates: [{ name: 'data', storage: '2Gi' }] }
  ]);
});

test('grows GMS first when it is below the preferred storage split', () => {
  const specs = [
    component('gms', 1, '1000m', '1Gi', '2Gi'),
    component('dn-0', 3, '1000m', '1Gi', '2Gi')
  ];
  const spec = loadSpec(
    { ...form(5), currentComponentSpecs: specs },
    'VolumeExpansion'
  ).volumeExpansion;
  assert.deepEqual(spec, [
    { componentName: 'gms', volumeClaimTemplates: [{ name: 'data', storage: '3Gi' }] }
  ]);
});

test('does not submit unchanged PolarDB-X components for a vertical or horizontal change', () => {
  const specs = [
    component('gms', 1),
    component('dn-0', 3),
    component('cn', 1),
    component('cdc', 1)
  ];
  const vertical = loadSpec(
    { ...form(3, 5000), currentComponentSpecs: specs },
    'VerticalScaling'
  ).verticalScaling;
  const horizontal = loadSpec(
    {
      ...form(3, 4000),
      replicas: 1,
      currentComponentSpecs: specs
    },
    'HorizontalScaling'
  ).horizontalScaling;
  assert.deepEqual(
    vertical.map((item: any) => item.componentName),
    ['dn-0']
  );
  assert.deepEqual(vertical[0].limits, { cpu: '2000m', memory: '1024Mi' });
  assert.deepEqual(
    horizontal.map((item: any) => item.componentName),
    ['dn-0']
  );
});

test('generates a non-empty restart list for PolarDB-X', () => {
  const spec = yaml.load(
    json2BasicOps({ dbName: 'polardbx', dbType: 'polardbx', type: 'Restart' })
  ) as any;
  assert.deepEqual(spec.spec.restart, [
    { componentName: 'gms' },
    { componentName: 'dn-0' },
    { componentName: 'cn' },
    { componentName: 'cdc' }
  ]);
});

test('normalizes equivalent quantity units in operation history', () => {
  const configurations = adaptOperationLog(
    {
      metadata: {
        uid: 'uid',
        name: 'ops',
        namespace: 'sealos',
        creationTimestamp: new Date(),
        generation: 1,
        labels: {},
        annotations: {}
      },
      spec: {
        clusterRef: 'polardbx',
        type: 'VerticalScaling',
        verticalScaling: [
          {
            componentName: 'dn-0',
            requests: { cpu: '100m', memory: '100Mi' },
            limits: { cpu: '1000m', memory: '1024Mi' }
          }
        ]
      },
      status: {
        phase: 'Succeed',
        lastConfiguration: {
          components: {
            'dn-0': {
              limits: { cpu: '1000m', memory: '1Gi' },
              requests: { cpu: '100m', memory: '100Mi' },
              replicas: 3,
              volumeClaimTemplates: []
            }
          }
        }
      }
    } as any,
    'polardbx'
  ).configurations;
  assert.deepEqual(configurations, []);
});

test('records PolarDB-X memory history in the same total-resource unit as the edit form', () => {
  const specs = [
    component('gms', 1),
    component('dn-0', 3),
    component('cn', 1),
    component('cdc', 1)
  ];
  const opsRequest = yaml.load(
    json2ResourceOps(form(3, 4000, 8192) as any, 'VerticalScaling', specs as any)
  ) as any;
  opsRequest.metadata = {
    ...opsRequest.metadata,
    uid: 'uid',
    namespace: 'sealos',
    creationTimestamp: new Date()
  };
  opsRequest.status = { phase: 'Succeed' };

  assert.deepEqual(adaptOperationLog(opsRequest, 'polardbx').configurations, [
    {
      parameterName: 'VerticalScalingMemory',
      oldValue: '4.0Gi',
      newValue: '8.0Gi'
    }
  ]);
});

test('converts v1 API resource units back to user-facing cores and GiB', () => {
  const result = raw2DatabaseSchema({
    dbName: 'polardbx',
    dbType: 'polardbx',
    dbVersion: 'polardbx-v1.0',
    cpu: 4000,
    memory: 4096,
    storage: 4,
    replicas: 3,
    totalCpu: 6000,
    totalMemory: 6144,
    totalStorage: 4,
    id: 'uid',
    status: { value: 'Running' },
    createTime: '',
    terminationPolicy: 'Delete',
    source: { hasSource: false, sourceName: '', sourceType: 'app_store' },
    isDiskSpaceOverflow: false
  } as any);
  assert.equal(result.resource.cpu, 4);
  assert.equal(result.resource.memory, 4);
  assert.equal(result.totalResource.cpu, 6);
  assert.equal(result.totalResource.memory, 6);
});

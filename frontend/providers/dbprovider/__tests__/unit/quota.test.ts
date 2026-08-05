import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { before, describe, it } from 'node:test';
import * as React from 'react';
import * as ts from 'typescript';
import type { DBEditType } from '@/types/db';
import type { UserQuotaItemType } from '@/types/user';
import type * as QuotaModule from '@/utils/quota';

let quotaModule: typeof QuotaModule;

before(async () => {
  Object.assign(globalThis, { React });
  quotaModule = await import('@/utils/quota');
});

const createDatabaseForm = (overrides: Partial<DBEditType> = {}): DBEditType => ({
  dbType: 'postgresql',
  dbVersion: 'postgresql-14.8.0',
  dbName: 'test-db',
  replicas: 3,
  cpu: 1000,
  memory: 1024,
  storage: 10,
  labels: {},
  terminationPolicy: 'Delete',
  ...overrides
});

describe('database quota guard', () => {
  it('keeps the quota check in the submit path before createDB', () => {
    const filename = resolve(process.cwd(), 'src/pages/db/edit/index.tsx');
    const sourceFile = ts.createSourceFile(
      filename,
      readFileSync(filename, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );
    const callPositions = new Map<string, number>();

    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        if (node.expression.text === 'checkQuotaAllow' || node.expression.text === 'createDB') {
          callPositions.set(node.expression.text, node.getStart(sourceFile));
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);

    const quotaCheckPosition = callPositions.get('checkQuotaAllow');
    const createDBPosition = callPositions.get('createDB');
    assert.notEqual(quotaCheckPosition, undefined);
    assert.notEqual(createDBPosition, undefined);
    assert.ok(quotaCheckPosition! < createDBPosition!);
  });

  it('counts every PostgreSQL replica, including Pod quota', () => {
    assert.deepEqual(quotaModule.calculateDatabaseQuotaRequest(createDatabaseForm()), {
      cpu: 3,
      memory: 3,
      storage: 30,
      pods: 3
    });
  });

  it('uses the real PolarDB-X component replica distribution', () => {
    const request = quotaModule.calculateDatabaseQuotaRequest(
      createDatabaseForm({
        dbType: 'polardbx',
        dbVersion: 'polardbx-8.4.19',
        cpu: 8000,
        memory: 8192,
        storage: 12
      })
    );

    assert.deepEqual(request, {
      cpu: 18,
      memory: 18,
      storage: 30,
      pods: 6
    });
  });

  it('checks only the additional resources when editing', () => {
    const previous = createDatabaseForm({ replicas: 1 });
    const next = createDatabaseForm({ replicas: 3 });

    assert.deepEqual(quotaModule.calculateDatabaseQuotaDelta(next, previous), {
      cpu: 2,
      memory: 2,
      storage: 20,
      pods: 2
    });
  });

  it('blocks the BUG-45 case when Pod quota is already overused', async () => {
    const quota: UserQuotaItemType[] = [
      { type: 'cpu', used: 1, limit: 100 },
      { type: 'memory', used: 1, limit: 100 },
      { type: 'storage', used: 1, limit: 100 },
      { type: 'pods', used: 15, limit: 1 }
    ];

    const tip = await quotaModule.checkQuotaAvailability({
      loadQuota: async () => quota,
      request: quotaModule.calculateDatabaseQuotaRequest(createDatabaseForm())
    });

    assert.equal(tip, 'app.pods_exceeds_quota');
  });

  it('blocks creation when ephemeral storage has no headroom', async () => {
    const quota: UserQuotaItemType[] = [{ type: 'ephemeral-storage', used: 8, limit: 8 }];

    const tip = await quotaModule.checkQuotaAvailability({
      loadQuota: async () => quota,
      request: quotaModule.calculateDatabaseQuotaRequest(createDatabaseForm()),
      requireHeadroom: ['ephemeral-storage']
    });

    assert.equal(tip, 'app.ephemeral_storage_exceeds_quota');
  });

  it('fails closed when current quota cannot be loaded', async () => {
    const tip = await quotaModule.checkQuotaAvailability({
      loadQuota: async () => Promise.reject(new Error('quota unavailable')),
      request: { pods: 1 }
    });

    assert.equal(tip, 'app.quota_check_failed');
  });

  it('allows a request that reaches the quota exactly', async () => {
    const tip = await quotaModule.checkQuotaAvailability({
      loadQuota: async () => [{ type: 'pods', used: 1, limit: 4 }],
      request: { pods: 3 }
    });

    assert.equal(tip, undefined);
  });

  it('allows a scale-down while the namespace is already over quota', async () => {
    const tip = await quotaModule.checkQuotaAvailability({
      loadQuota: async () => [{ type: 'pods', used: 15, limit: 1 }],
      request: { pods: -2 }
    });

    assert.equal(tip, undefined);
  });
});

import { getDatabase } from '@/services/backend/v2alpha/get-database';
import { vi } from 'vitest';

vi.mock('@/utils/adapt', () => ({
  adaptDBDetail: vi.fn(() => ({
    terminationPolicy: 'Delete',
    dbName: 'test-db',
    dbType: 'redis',
    dbVersion: 'redis-7.2.7',
    cpu: 1000,
    memory: 1024,
    storage: 2,
    replicas: 1,
    id: 'b91a9f8a-ed28-42f1-8379-ff9df6e8711a',
    status: { value: 'Running' },
    createTime: '2026/05/14 17:53'
  }))
}));

const encodeSecretValue = (value: string) => Buffer.from(value).toString('base64');

describe('v2alpha getDatabase', () => {
  it('returns Redis credentials from the Redis account secret', async () => {
    const readNamespacedSecret = vi.fn(async (secretName: string) => {
      if (secretName === 'test-db-redis-account-default') {
        return {
          body: {
            data: {
              username: encodeSecretValue('default'),
              password: encodeSecretValue('redis-password')
            }
          }
        };
      }

      const error: Error & { response?: { statusCode: number } } = new Error(
        `Secret ${secretName} not found`
      );
      error.response = { statusCode: 404 };
      throw error;
    });

    const k8s = {
      namespace: 'ns-t2r0w76e',
      k8sCustomObjects: {
        getNamespacedCustomObject: vi.fn().mockResolvedValue({ body: {} })
      },
      k8sCore: {
        readNamespacedSecret,
        listNamespacedService: vi.fn().mockResolvedValue({
          body: {
            items: [
              {
                metadata: {
                  name: 'test-db-redis-redis',
                  labels: {
                    'app.kubernetes.io/instance': 'test-db'
                  }
                },
                spec: {
                  type: 'ClusterIP',
                  ports: [{ name: 'redis', port: 6379 }]
                }
              }
            ]
          }
        }),
        listNamespacedPod: vi.fn().mockResolvedValue({ body: { items: [] } })
      }
    } as any;

    const result = await getDatabase(k8s, {
      params: { databaseName: 'test-db' }
    });

    expect(readNamespacedSecret).toHaveBeenCalledWith(
      'test-db-redis-account-default',
      'ns-t2r0w76e'
    );
    expect(result.connection.privateConnection).toMatchObject({
      username: 'default',
      password: 'redis-password',
      connectionString:
        'redis://default:redis-password@test-db-redis-redis.ns-t2r0w76e.svc.cluster.local:6379'
    });
  });
});

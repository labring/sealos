import type { NextApiRequest, NextApiResponse } from 'next';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { adaptDBDetail } from '@/utils/adapt';
import { KbPgClusterType } from '@/types/cluster';
import yaml from 'js-yaml';

async function getServiceWithRetry(
  k8s: any,
  serviceName: string,
  maxRetries: number = 5,
  delay: number = 1000
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const { body: service } = await k8s.k8sCore.readNamespacedService(serviceName, k8s.namespace);
      return service;
    } catch (err: any) {
      if (i === maxRetries - 1) {
        throw err;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const kubeconfig = await authSession(req).catch(() => null);
  if (!kubeconfig) {
    return jsonRes(res, {
      code: ResponseCode.UNAUTHORIZED,
      message: ResponseMessages[ResponseCode.UNAUTHORIZED]
    });
  }

  const k8s = await getK8s({ kubeconfig }).catch(() => null);
  if (!k8s) {
    return jsonRes(res, {
      code: ResponseCode.UNAUTHORIZED,
      message: ResponseMessages[ResponseCode.UNAUTHORIZED]
    });
  }

  const { databaseName } = req.query as { databaseName: string };

  if (!databaseName) {
    return jsonRes(res, {
      code: 400,
      message: 'Database name is required'
    });
  }

  if (req.method === 'POST') {
    try {
      // Get database cluster
      const { body: clusterData } = (await k8s.k8sCustomObjects.getNamespacedCustomObject(
        'apps.kubeblocks.io',
        'v1alpha1',
        k8s.namespace,
        'clusters',
        databaseName
      )) as { body: KbPgClusterType };

      const dbDetail = adaptDBDetail(clusterData);

      if (!dbDetail) {
        return jsonRes(res, {
          code: 404,
          message: 'Database not found'
        });
      }

      const portMapping: Record<string, number> = {
        postgresql: 5432,
        mongodb: 27017,
        'apecloud-mysql': 3306,
        redis: 6379,
        kafka: 9092,
        milvus: 19530,
        pulsar: 6650,
        clickhouse: 8123,
        qdrant: 6333,
        nebula: 9669,
        weaviate: 8080
      };

      const labelMap: Record<string, any> = {
        postgresql: {
          'kubeblocks.io/role': 'primary'
        },
        mongodb: {
          'kubeblocks.io/role': 'primary'
        },
        'apecloud-mysql': {
          'kubeblocks.io/role': 'leader'
        },
        redis: {
          'kubeblocks.io/role': 'primary'
        },
        kafka: {
          'apps.kubeblocks.io/component-name': 'kafka-broker'
        },
        milvus: {
          'apps.kubeblocks.io/component-name': 'milvus'
        },
        pulsar: {},
        clickhouse: {},
        qdrant: {},
        nebula: {},
        weaviate: {}
      };

      const serviceName = `${databaseName}-export`;
      const port = portMapping[dbDetail.dbType] || 5432;

      try {
        const existingService = await k8s.k8sCore.readNamespacedService(serviceName, k8s.namespace);

        if (existingService?.body) {
          const nodePort = existingService.body.spec?.ports?.[0]?.nodePort;
          return jsonRes(res, {
            code: 200,
            message: 'Public access already enabled',
            data: {
              dbName: databaseName,
              serviceName,
              operation: 'enable-public-access',
              nodePort,
              port,
              alreadyExists: true,
              createdAt:
                existingService.body.metadata?.creationTimestamp || new Date().toISOString()
            }
          });
        }
      } catch (checkErr: any) {
        // Service doesn't exist, continue to create it
        console.log('Service does not exist, creating new one...');
      }

      // Create service
      const serviceTemplate = {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: {
          name: serviceName,
          namespace: k8s.namespace,
          labels: {
            'app.kubernetes.io/instance': databaseName,
            'app.kubernetes.io/managed-by': 'kubeblocks',
            'apps.kubeblocks.io/component-name': dbDetail.dbType,
            ...labelMap[dbDetail.dbType]
          },
          ownerReferences: [
            {
              apiVersion: 'apps.kubeblocks.io/v1alpha1',
              kind: 'Cluster',
              name: databaseName,
              uid: clusterData.metadata?.uid || '',
              blockOwnerDeletion: true,
              controller: true
            }
          ]
        },
        spec: {
          ports: [
            {
              name: 'tcp',
              protocol: 'TCP',
              port: port,
              targetPort: port
            }
          ],
          selector: {
            'app.kubernetes.io/instance': databaseName,
            'app.kubernetes.io/managed-by': 'kubeblocks',
            ...labelMap[dbDetail.dbType]
          },
          type: 'NodePort'
        }
      };

      const serviceYaml = yaml.dump(serviceTemplate);

      const createResult = await k8s.applyYamlList([serviceYaml], 'create');
      console.log('Service creation result:', createResult);

      await new Promise((resolve) => setTimeout(resolve, 500));

      let nodePort = null;
      try {
        const service = await getServiceWithRetry(k8s, serviceName, 5, 1000);
        nodePort = service?.spec?.ports?.[0]?.nodePort;
      } catch (getErr: any) {
        console.warn(
          'Could not retrieve service after creation, but it may have been created successfully'
        );
      }

      return jsonRes(res, {
        code: 200,
        message: 'Public access enabled successfully',
        data: {
          dbName: databaseName,
          serviceName,
          operation: 'enable-public-access',
          nodePort: nodePort || null,
          port,
          createdAt: new Date().toISOString()
        }
      });
    } catch (err: any) {
      console.error('Error enabling public access:', err);
      console.error('Error details:', err?.body || err?.message);

      if (err?.body?.reason === 'AlreadyExists') {
        try {
          const { body: service } = await k8s.k8sCore.readNamespacedService(
            `${databaseName}-export`,
            k8s.namespace
          );
          const nodePort = service.spec?.ports?.[0]?.nodePort;

          return jsonRes(res, {
            code: 200,
            message: 'Public access already enabled',
            data: {
              dbName: databaseName,
              serviceName: `${databaseName}-export`,
              operation: 'enable-public-access',
              nodePort,
              alreadyExists: true,
              createdAt: service.metadata?.creationTimestamp || new Date().toISOString()
            }
          });
        } catch (readErr) {
          console.error('Could not read existing service:', readErr);
        }
      }

      return jsonRes(res, handleK8sError(err));
    }
  }

  return jsonRes(res, {
    code: 405,
    message: 'Method not allowed'
  });
}

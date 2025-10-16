import { pauseDatabaseSchemas } from '@/types/apis';
import { getK8s } from '../kubernetes';
import { z } from 'zod';
import { getCluster } from '@/pages/api/getDBByName';
import { json2BasicOps } from '@/utils/json2Yaml';
import { PatchUtils } from '@kubernetes/client-node';
import { NextApiRequest } from 'next';
import { raw2schema } from './get-database';
import { adaptDBDetail } from '@/utils/adapt';

export async function pauseDatabase(
  k8s: Awaited<ReturnType<typeof getK8s>>,
  request: {
    params: z.infer<typeof pauseDatabaseSchemas.pathParams>;
  },
  req: NextApiRequest
) {
  try {
    // Check if the service exists and delete it if it does
    const service = await k8s.k8sCore.readNamespacedService(
      `${request.params.databaseName}-export`,
      k8s.namespace
    );
    if (service.response.statusCode === 200) {
      await k8s.k8sCore.deleteNamespacedService(
        `${request.params.databaseName}-export`,
        k8s.namespace
      );
    }
  } catch (err: any) {
    // Service doesn't exist, continue
  }

  // Get cluster information
  const body = await getCluster(req, request.params.databaseName);

  // Disable backup if it's enabled
  if (body.spec.backup?.enabled === true) {
    const patch = [
      {
        op: 'replace',
        path: '/spec/backup/enabled',
        value: false
      }
    ];
    await k8s.k8sCustomObjects.patchNamespacedCustomObject(
      'apps.kubeblocks.io',
      'v1alpha1',
      k8s.namespace,
      'clusters',
      request.params.databaseName,
      patch,
      undefined,
      undefined,
      undefined,
      { headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_PATCH } }
    );
  }

  // Create stop operation YAML and apply it
  const yaml = json2BasicOps({
    dbName: request.params.databaseName,
    type: 'Stop'
  });
  await k8s.applyYamlList([yaml], 'update');

  return { data: raw2schema(adaptDBDetail(body)) };
}

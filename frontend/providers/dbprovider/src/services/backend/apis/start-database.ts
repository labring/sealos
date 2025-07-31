import { startDatabaseSchemas } from '@/types/apis';
import { getK8s } from '../kubernetes';
import { z } from 'zod';
import { getCluster } from '@/pages/api/getDBByName';
import { json2BasicOps } from '@/utils/json2Yaml';
import { PatchUtils } from '@kubernetes/client-node';
import { NextApiRequest } from 'next';

export async function startDatabase(
  k8s: Awaited<ReturnType<typeof getK8s>>,
  request: {
    params: z.infer<typeof startDatabaseSchemas.pathParams>;
  },
  req: NextApiRequest
) {
  // Get cluster information
  const body = await getCluster(req, request.params.databaseName);

  // Enable backup if it's disabled
  if (body.spec.backup?.enabled === false) {
    const patch = [
      {
        op: 'replace',
        path: '/spec/backup/enabled',
        value: true
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

  // Create start operation YAML and apply it
  const yaml = json2BasicOps({
    dbName: request.params.databaseName,
    type: 'Start'
  });
  await k8s.applyYamlList([yaml], 'update');

  return { data: 'start success' };
}

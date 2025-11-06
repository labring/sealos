import { restartDatabaseSchemas } from '@/types/apis';
import { getK8s } from '../kubernetes';
import { z } from 'zod';
import { getCluster } from '@/pages/api/getDBByName';
import { json2BasicOps } from '@/utils/json2Yaml';
import { NextApiRequest } from 'next';
import { adaptDBDetail } from '@/utils/adapt';
import { raw2schema } from './get-database';

export async function restartDatabase(
  k8s: Awaited<ReturnType<typeof getK8s>>,
  request: {
    params: z.infer<typeof restartDatabaseSchemas.pathParams>;
  },
  req: NextApiRequest
) {
  const body = await getCluster(req, request.params.databaseName);
  const rawDbType = body?.metadata?.labels['clusterdefinition.kubeblocks.io/name'];
  if (!rawDbType) {
    throw new Error('Unable to determine database type from cluster metadata');
  }
  const dbType = (rawDbType as string) === 'mysql' ? 'apecloud-mysql' : rawDbType;
  const yaml = json2BasicOps({
    dbName: request.params.databaseName,
    dbType: dbType,
    type: 'Restart'
  });
  await k8s.applyYamlList([yaml], 'update');

  return { data: raw2schema(adaptDBDetail(body)) };
}

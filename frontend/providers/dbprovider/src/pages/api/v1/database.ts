import { BackupSupportedDBTypeList } from '@/constants/db';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { KbPgClusterType } from '@/types/cluster';
import { convertBackupFormToSpec } from '@/utils/adapt';
import { json2Account, json2CreateCluster } from '@/utils/json2Yaml';
import { NextApiRequest, NextApiResponse } from 'next';
import { updateBackupPolicyApi } from '../backup/updatePolicy';
import { createDatabaseSchemas } from '@/types/apis';
import { ResponseCode, ResponseMessages } from '@/types/response';
import { createDatabase } from '@/services/backend/apis/create-database';

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

  if (req.method === 'POST') {
    try {
      const bodyParseResult = createDatabaseSchemas.body.safeParse(req.body);
      if (!bodyParseResult.success) {
        return jsonRes(res, {
          code: 400,
          message: 'Invalid request body.',
          error: bodyParseResult.error.issues
        });
      }

      await createDatabase(k8s, {
        body: bodyParseResult.data
      });

      jsonRes(res, {
        data: 'success create db'
      });
    } catch (err: any) {
      console.log('error create db', err);
      jsonRes(res, handleK8sError(err));
    }
  }

  return jsonRes(res, {
    code: 405,
    message: 'Method not allowed'
  });
}

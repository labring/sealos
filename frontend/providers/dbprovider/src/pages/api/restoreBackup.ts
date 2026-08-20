import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { handleK8sError, jsonRes } from '@/services/backend/response';
import { json2RestoreOpsRequest } from '@/utils/json2Yaml';

export type RestoreBackupProps = {
  databaseName: string;
  backupName: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { databaseName, backupName } = req.body as RestoreBackupProps;

    if (!databaseName || !backupName) {
      return jsonRes(res, {
        code: 400,
        error: 'databaseName and backupName are required'
      });
    }

    const { k8sCustomObjects, namespace, applyYamlList } = await getK8s({
      kubeconfig: await authSession(req)
    });

    // Validate backup existence
    const backupGroup = 'dataprotection.kubeblocks.io';
    const backupVersion = 'v1alpha1';
    const backupPlural = 'backups';

    try {
      await k8sCustomObjects.getNamespacedCustomObject(
        backupGroup,
        backupVersion,
        namespace,
        backupPlural,
        backupName
      );
    } catch (err: any) {
      if (err?.response?.statusCode === 404) {
        return jsonRes(res, {
          code: 404,
          error: 'Backup not found'
        });
      }
      throw err;
    }

    const restoreYaml = json2RestoreOpsRequest({
      clusterName: databaseName,
      namespace,
      backupName
    });

    await applyYamlList([restoreYaml], 'create');

    jsonRes(res, {
      data: 'Restore operation initiated successfully'
    });
  } catch (err: any) {
    console.log('error restore backup', err);
    jsonRes(res, handleK8sError(err));
  }
}

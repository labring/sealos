import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiResp } from '@/services/kubernet';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { withErrorHandler } from '@/services/backend/middleware';
import { json2ManualBackup } from '@/utils/json2Yaml';
import { DBBackupMethodNameMap, DBBackupPolicyNameMap, DBTypeEnum } from '@/constants/db';
import { ResponseCode } from '@/types/response';

export type Props = {
  backupName: string;
  dbName: string;
  remark?: string;
  dbType: `${DBTypeEnum}`;
};

async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  const { backupName, dbName, remark, dbType } = req.body as Props;

  if (!dbName || !backupName || !dbType) {
    return jsonRes(res, {
      code: ResponseCode.BAD_REQUEST,
      message: 'params error'
    });
  }

  const { k8sCustomObjects, namespace, applyYamlList } = await getK8s({
    kubeconfig: await authSession(req)
  });

  const backupPolicyName = `${dbName}-${DBBackupPolicyNameMap[dbType]}-backup-policy`;
  const backupMethod = DBBackupMethodNameMap[dbType];

  if (!backupPolicyName) {
    throw new Error('Cannot find backup policy');
  }

  const backupCr = json2ManualBackup({
    name: backupName,
    backupPolicyName,
    backupMethod,
    remark
  });

  console.info(backupCr);

  // create backup
  await applyYamlList([backupCr], 'create');

  jsonRes(res, { message: 'Backup created successfully' });
}

export default withErrorHandler(handler);

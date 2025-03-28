import { DBBackupPolicyNameMap, DBTypeEnum } from '@/constants/db';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchDBSecret } from '@/utils/database';
import { KubeFileSystem } from '@/utils/kubeFileSystem';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { namespace, k8sExec, k8sCore } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const { dbName, dbType, newPassword } = req.body as {
      dbName: string;
      dbType: DBTypeEnum;
      newPassword: string;
    };

    const firstPodName = `${dbName}-${DBBackupPolicyNameMap[dbType]}-0`;

    const { username, password, host, port } = await fetchDBSecret(
      k8sCore,
      dbName,
      dbType,
      namespace
    );

    const showDatabaseCommand: Map<DBTypeEnum, string[]> = new Map([
      [
        DBTypeEnum.mysql,
        [
          'mysql',
          `-u${username}`,
          `-p${password}`,
          `-h${host}`,
          `-P${port}`,
          `-e "ALTER USER '${username}'@'${host}' IDENTIFIED BY '${newPassword}';"`
        ]
      ],
      [
        DBTypeEnum.postgresql,
        ['psql', '-U', 'postgres', `-c "ALTER USER ${username} PASSWORD '${newPassword}';"`]
      ],
      [
        DBTypeEnum.mongodb,
        [
          'mongo',
          '--quiet',
          `-u${username}`,
          `-p${password}`,
          '--eval',
          `db.changeUserPassword('${username}', '${newPassword}');`
        ]
      ]
    ]);

    const kubefs = new KubeFileSystem(k8sExec);

    if (showDatabaseCommand.get(dbType) === undefined) {
      throw new Error('Database type now not supported');
    }

    const result = await kubefs.execCommand(
      namespace,
      firstPodName,
      DBBackupPolicyNameMap[dbType],
      showDatabaseCommand.get(dbType)!,
      false
    );

    let response;
    switch (dbType) {
      case DBTypeEnum.mysql:
        response = result.split('\n').slice(1, -1);
        break;
      case DBTypeEnum.postgresql:
        response = result.replaceAll(' ', '').split('\n').slice(2, -3);
        break;
      case DBTypeEnum.mongodb:
        response = result.split('\n').slice(0, -1);
        break;
      default:
        response = result;
        break;
    }

    jsonRes(res, { data: response });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

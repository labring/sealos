import { DBBackupPolicyNameMap, DBTypeEnum } from '@/constants/db';
import { ServiceLogConfigs } from '@/constants/log';
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

    const { dbName, dbType } = req.body as {
      dbName: string;
      dbType: DBTypeEnum;
    };

    const firstPodName = `${dbName}-${DBBackupPolicyNameMap[dbType]}-0`;

    const { username, password, host, port } = await fetchDBSecret(
      k8sCore,
      dbName,
      dbType,
      namespace
    );

    const showTableCommand: Map<DBTypeEnum, string[]> = new Map([
      [
        DBTypeEnum.mysql,
        ['mysql', `-u${username}`, `-p${password}`, `-h${host}`, `-P${port}`, `-e SHOW DATABASES;`]
      ],
      [DBTypeEnum.postgresql, ['psql', '-U', 'postgres', '-c', 'SELECT datname FROM pg_database;']],
      [
        DBTypeEnum.mongodb,
        [
          'mongo',
          '--quiet',
          `-u${username}`,
          `-p${password}`,
          '--eval',
          "db.adminCommand('listDatabases').databases.forEach(function(db) {print(db.name);})"
        ]
      ]
    ]);

    const kubefs = new KubeFileSystem(k8sExec);
    const result = await kubefs.execCommand(
      namespace,
      firstPodName,
      DBBackupPolicyNameMap[dbType],
      showTableCommand.get(dbType)!,
      false
    );

    let res_;
    switch (dbType) {
      case DBTypeEnum.mysql:
        res_ = result.split('\n').slice(1, -1);
        break;
      case DBTypeEnum.postgresql:
        res_ = result.replaceAll(' ', '').split('\n').slice(2, -3);
        break;
      case DBTypeEnum.mongodb:
        res_ = result.split('\n').slice(0, -1);
        break;
      default:
        res_ = result;
        break;
    }

    jsonRes(res, { data: res_ });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

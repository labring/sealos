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

    const { dbName, dbType, databaseName } = req.body as {
      dbName: string;
      dbType: DBTypeEnum;
      databaseName: string;
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
        ['mysql', `-u${username}`, `-p${password}`, databaseName, '-e SHOW TABLES;']
      ],
      [
        DBTypeEnum.notapemysql,
        ['mysql', `-u${username}`, `-p${password}`, databaseName, '-e SHOW TABLES;']
      ],
      [
        DBTypeEnum.postgresql,
        [
          'psql',
          `--username=${username}`,
          `--dbname=${databaseName}`,
          `--command=SELECT tablename FROM pg_tables WHERE schemaname = 'public';`
        ]
      ],
      [
        DBTypeEnum.mongodb,
        [
          'mongo',
          '--quiet',
          `-u${username}`,
          `-p${password}`,
          databaseName,
          '--eval',
          'db.getCollectionNames();'
        ]
      ]
    ]);

    const kubefs = new KubeFileSystem(k8sExec);

    if (showTableCommand.get(dbType) === undefined) {
      throw new Error('Database type now not supported');
    }

    const result = await kubefs.execCommand(
      namespace,
      firstPodName,
      DBBackupPolicyNameMap[dbType],
      showTableCommand.get(dbType)!,
      false
    );

    let tableList: string[] = [];
    switch (dbType) {
      case DBTypeEnum.mysql:
        tableList = result.split('\n').slice(1, -1);
        break;
      case DBTypeEnum.notapemysql:
        tableList = result.split('\n').slice(1, -1);
        break;
      case DBTypeEnum.postgresql:
        if (result.split('\n').length >= 3) {
          tableList = result.replaceAll(' ', '').split('\n').slice(2, -3);
        }
        break;
      case DBTypeEnum.mongodb:
        if (result.includes('[')) {
          tableList = result.slice(3, -4).split('", "');
        } else if (result.includes('Error: ')) {
          throw new Error('failed!');
        }
        break;
      default:
        break;
    }

    jsonRes(res, { data: tableList });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

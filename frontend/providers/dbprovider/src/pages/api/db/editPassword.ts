import { DBBackupPolicyNameMap, DBTypeEnum } from '@/constants/db';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { DBType } from '@/types/db';
import { dbTypeMap, fetchDBSecret, getSecretNames } from '@/utils/database';
import { json2BasicOps } from '@/utils/json2Yaml';
import { KubeFileSystem } from '@/utils/kubeFileSystem';
import type { NextApiRequest, NextApiResponse } from 'next';

export type EditPasswordReq = {
  dbName: string;
  dbType: DBType;
  newPassword: string;
};

const updateSecretPassword = async (
  k8sCore: any,
  secretName: string,
  namespace: string,
  newPassword: string,
  dbType: DBType,
  isBackup: boolean = false
) => {
  try {
    const secretRes = await k8sCore.readNamespacedSecret(secretName, namespace);
    if (!secretRes?.body?.data) {
      throw new Error(`Secret ${secretName} has no data`);
    }

    const secret = secretRes.body;
    secret.data = secret.data ?? {};

    let passwordKey = dbTypeMap[dbType].passwordKey;
    if (isBackup) {
      if (dbType === DBTypeEnum.clickhouse || dbType === DBTypeEnum.kafka) {
        passwordKey = 'admin-password';
      }
    }

    secret.data[passwordKey] = Buffer.from(newPassword).toString('base64');

    const k8s_result = await k8sCore.replaceNamespacedSecret(secretName, namespace, secret);
    if (k8s_result.response.statusCode !== 200) {
      throw new Error(`Failed to update secret ${secretName}`);
    }

    return true;
  } catch (error: any) {
    throw error;
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const { namespace, k8sExec, k8sCore, applyYamlList } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const { dbName, dbType, newPassword } = req.body as EditPasswordReq;

    if (!newPassword.match(/^(?!-)[A-Za-z\d~`!\@#%^&\*()\-\_=+\|:,<.>\/? ]{8,32}$/)) {
      throw new Error(
        'Password must be 8-32 characters long and cannot contain certain special characters!'
      );
    }

    const firstPodName = `${dbName}-${DBBackupPolicyNameMap[dbType]}-0`;

    const { username, password, host, port, ...rest } = await fetchDBSecret(
      k8sCore,
      dbName,
      dbType,
      namespace
    );

    let { body } = rest;

    const showDatabaseCommand: Map<DBType, string[]> = new Map([
      [
        DBTypeEnum.mysql,
        [
          'mysql',
          `-u${username}`,
          `-p${password}`,
          `-h${host}`,
          `-P${port}`,
          `-e ALTER USER '${username}'@'localhost' IDENTIFIED BY '${newPassword}';ALTER USER '${username}'@'%' IDENTIFIED BY '${newPassword}';`
        ]
      ],
      [
        DBTypeEnum.postgresql,
        [
          'psql',
          `postgresql://${username}:${password}@${host}:${port}`,
          `-c ALTER USER standby WITH PASSWORD '${newPassword}';ALTER USER ${username} WITH PASSWORD '${newPassword}';`
        ]
      ],
      [
        DBTypeEnum.mongodb,
        [
          'mongosh',
          `mongodb://${username}:${password}@${host}:${port}/admin`,
          '--eval',
          `db.changeUserPassword('${username}', '${newPassword}');`
        ]
      ],
      [
        DBTypeEnum.redis,
        [
          'redis-cli',
          '-h',
          host,
          '-p',
          port,
          '-a',
          password,
          'config',
          'set',
          'requirepass',
          newPassword
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

    if (result.length < 10) {
      throw new Error('Response from server is too short');
    }

    if (newPassword.includes('ERR') || result.includes('failed')) {
      if (result.includes('ERR') || result.includes('failed')) {
        throw new Error('Failed to change password');
      }
    } else {
      if (result.includes('exception') || result.includes('ServerError')) {
        throw new Error('Failed to change password');
      }
    }

    if (!body) {
      throw new Error('Secret not found for updating password');
    }

    const { primary: primarySecretName, backup: backupSecretName } = getSecretNames(dbType, dbName);

    const updatedSecrets: string[] = [];
    const failedSecrets: string[] = [];

    try {
      await updateSecretPassword(k8sCore, primarySecretName, namespace, newPassword, dbType, false);
      updatedSecrets.push(primarySecretName);
    } catch (error: any) {
      failedSecrets.push(`${primarySecretName}: ${error.message}`);
    }

    if (backupSecretName && backupSecretName !== primarySecretName) {
      try {
        await k8sCore.readNamespacedSecret(backupSecretName, namespace);
        await updateSecretPassword(k8sCore, backupSecretName, namespace, newPassword, dbType, true);
        updatedSecrets.push(backupSecretName);
      } catch (error: any) {
        if (error?.response?.statusCode === 404) {
        } else {
          failedSecrets.push(`${backupSecretName}: ${error.message}`);
        }
      }
    }

    if (updatedSecrets.length === 0) {
      throw new Error(`Failed to update any secrets. Errors: ${failedSecrets.join('; ')}`);
    }

    console.log(
      `Password updated for ${updatedSecrets.length} secrets: ${updatedSecrets.join(', ')}`
    );
    const yaml = json2BasicOps({ dbName, dbType, type: 'Restart' });
    await applyYamlList([yaml], 'update');
    jsonRes(res, { data: 'Edit password success.' });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

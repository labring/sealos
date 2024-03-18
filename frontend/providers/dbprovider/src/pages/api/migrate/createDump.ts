import { CloudMigraionLabel } from '@/constants/db';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { DumpForm } from '@/types/migrate';
import { formatTime } from '@/utils/tools';
import yaml from 'js-yaml';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const data = req.body as DumpForm;

    const { namespace, applyYamlList } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const { yamlStr, yamlObj } = await json2DumpCR({
      ...data,
      namespace
    });

    await applyYamlList([yamlStr], 'create');

    return jsonRes(res, {
      data: {
        name: yamlObj.metadata.name
      }
    });
  } catch (err: any) {
    jsonRes(res, {
      code: 500,
      error: err
    });
  }
}

export const json2DumpCR = async (data: { namespace: string } & DumpForm) => {
  const userNS = data.namespace;
  const time = formatTime(new Date(), 'YYYYMMDDHHmmss');

  const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
  const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;
  const MIGRATE_FILE_IMAGE = process.env.MIGRATE_FILE_IMAGE;
  const MINIO_URL = process.env.MINIO_URL;

  const template = {
    apiVersion: 'batch/v1',
    kind: 'Job',
    metadata: {
      name: `${userNS}-${time}-${data.dbName}-file`,
      labels: {
        [CloudMigraionLabel]: data.dbName
      }
    },
    spec: {
      backoffLimit: 3,
      template: {
        metadata: {
          name: `${userNS}-${time}-${data.dbName}-file`,
          labels: {
            [CloudMigraionLabel]: data.dbName
          }
        },
        spec: {
          restartPolicy: 'Never',
          containers: [
            {
              name: `${userNS}-${time}-${data.dbName}-file`,
              image: MIGRATE_FILE_IMAGE,
              env: [
                {
                  name: 'MINIO_ACCESS_KEY',
                  value: MINIO_ACCESS_KEY
                },
                {
                  name: 'MINIO_SECRET_KEY',
                  value: MINIO_SECRET_KEY
                },
                {
                  name: 'MINIO_URL',
                  value: `https://${MINIO_URL}`
                },
                {
                  name: 'DATABASE_USER',
                  value: data.databaseUser
                },
                {
                  name: 'DATABASE_PASSWORD',
                  value: data.databasePassword
                },
                {
                  name: 'DATABASE_HOST',
                  value: data.databaseHost
                },
                {
                  name: 'FILE_NAME',
                  value: data.fileName
                },
                {
                  name: 'DATABASE_TYPE',
                  value: data.databaseType
                },
                {
                  name: 'DATABASE_NAME',
                  value: data.databaseName
                },
                {
                  name: 'COLLECTION_NAME',
                  value: data.collectionName
                },
                { name: 'TABLES_NAME', value: '' }
              ]
            }
          ]
        }
      }
    }
  };

  return { yamlStr: yaml.dump(template), yamlObj: template };
};

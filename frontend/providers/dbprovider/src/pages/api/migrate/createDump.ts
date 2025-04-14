import { CloudMigraionLabel, DBTypeEnum } from '@/constants/db';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { DumpForm } from '@/types/migrate';
import { fetchDBSecret } from '@/utils/database';
import { Command } from '@/utils/kubeFileSystem';
import { formatTime } from '@/utils/tools';
import yaml from 'js-yaml';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResp>) {
  try {
    const data = req.body as DumpForm;

    const { namespace, k8sCore, applyYamlList } = await getK8s({
      kubeconfig: await authSession(req)
    });

    const secret = await fetchDBSecret(k8sCore, data.dbName, data.dbType, namespace);

    if (
      !Boolean(
        process.env.MINIO_ACCESS_KEY &&
          process.env.MINIO_SECRET_KEY &&
          process.env.MINIO_URL &&
          process.env.MINIO_BUCKET_NAME &&
          process.env.MIGRATE_FILE_IMAGE
      )
    ) {
      throw new Error('MinIO related environment variables are not configured!');
    }
    const yamlObj = await json2DumpCR({
      ...data,
      ...secret,
      namespace
    });

    if (yamlObj === undefined) {
      throw new Error('Failed to generate yaml file. Please check the input parameters.');
    }

    await applyYamlList([yaml.dump(yamlObj)], 'create');

    return jsonRes(res, {
      data: {
        test: yamlObj,
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

export const json2DumpCR = async (
  data: { namespace: string } & Awaited<ReturnType<typeof fetchDBSecret>> & DumpForm
) => {
  const userNS = data.namespace;
  const time = formatTime(new Date(), 'YYYYMMDDHHmmss');

  const commands = new Command();
  commands.add('wget https://objectstorageapi.gzg.sealos.run/7nl57qi8-test/mc -O mc');
  commands.add('chmod +x mc');
  // Configure MinIO
  commands.add(`./mc alias set migrationTask $MINIO_URL $MINIO_AK $MINIO_SK`);
  commands.add(`./mc cp migrationTask/$BUCKET/${data.fileName} /root`);

  const secretMysql = `--host=$HOST --port=$PORT --user=$USERNAME --password=$PASSWORD`;
  const secretPg = `--host=$HOST --port=$PORT --user=$USERNAME -w`;
  const secretMg = `--host $HOST --port $PORT -u $USERNAME -p $PASSWORD`;
  // 检查并创建数据库
  if (!data.databaseExist) {
    commands.echo(`Database ${data.databaseName} does not exist. Creating...`);
    switch (data.dbType) {
      case DBTypeEnum.mysql:
        commands.add(`mysql ${secretMysql} -e "CREATE DATABASE ${data.databaseName};"`);
        break;
      case DBTypeEnum.postgresql:
        commands.add(`psql ${secretPg} -c "CREATE DATABASE ${data.databaseName};"`);
        break;
      case DBTypeEnum.mongodb:
        commands.add(
          `mongosh ${secretMg} --eval "db.getSiblingDB('${data.databaseName}').createCollection('init_collection');"`
        );
        break;
    }
  }

  switch (data.dbType) {
    case DBTypeEnum.mysql:
      commands.add(`mysql ${secretMysql} ${data.databaseName} `);
      break;
    case DBTypeEnum.postgresql:
      commands.add(`psql ${secretPg} -d ${data.databaseName}`);
      break;
    case DBTypeEnum.mongodb:
      commands.add(
        `mongoimport ${secretMg} --db=${data.databaseName} --collection=${data.tableName} `
      );
      break;
  }

  const filenameExtension = data.fileName.split('.').at(-1);
  const filePath = `/root/${data.fileName}`;

  switch (filenameExtension) {
    case 'sql':
      switch (data.dbType) {
        case DBTypeEnum.mysql:
          commands.push(`< ${filePath}`);
          break;
        case DBTypeEnum.postgresql:
          commands.push(`-f ${filePath}`);
          break;
        case DBTypeEnum.mongodb:
          commands.push(`--file=${filePath}`);
          break;
      }
      break;
    case 'csv':
      switch (data.dbType) {
        case DBTypeEnum.mysql:
          commands.push(
            `-e "LOAD DATA LOCAL INFILE '${filePath}' INTO TABLE ${data.databaseName} FIELDS TERMINATED BY ',' ENCLOSED BY '\\"' LINES TERMINATED BY '\\n';"`
          );
          break;
        case DBTypeEnum.postgresql:
          commands.push(`-c "\\COPY $TABLE_NAME FROM '${filePath}' CSV HEADER;"`);
          break;
        case DBTypeEnum.mongodb:
          commands.push(`--type=csv --file=${filePath} --headerline`);
          break;
      }
    case 'json':
      switch (data.dbType) {
        case DBTypeEnum.mongodb:
          commands.push(`--file=${filePath} --jsonArray`);
          break;
        default:
          throw new Error(`Unsupported '${filenameExtension}' for ${data.dbType}`);
      }
      break;
    case 'bson':
      switch (data.dbType) {
        case DBTypeEnum.mongodb:
          commands.push(`--drop --dir=${filePath}`);
          break;
        default:
          throw new Error(`Unsupported '${filenameExtension}' for ${data.dbType}`);
      }
      break;
    default:
      throw new Error(`Unsupported file extension: ${filenameExtension}`);
  }

  const Obj = {
    apiVersion: 'batch/v1',
    kind: 'Job',
    metadata: {
      name: `${userNS}-${time}-${data.dbName}-file`,
      namespace: userNS,
      labels: {
        [CloudMigraionLabel]: data.dbName
      }
    },
    spec: {
      template: {
        spec: {
          restartPolicy: 'Never',
          containers: [
            {
              name: 'import-data',
              image: process.env.MIGRATE_FILE_IMAGE,
              env: [
                {
                  name: 'MINIO_AK',
                  value: process.env.MINIO_ACCESS_KEY
                },
                {
                  name: 'MINIO_SK',
                  value: process.env.MINIO_SECRET_KEY
                },
                {
                  name: 'MINIO_URL',
                  value: `http://${process.env.MINIO_URL}`
                },
                {
                  name: 'BUCKET',
                  value: process.env.MINIO_BUCKET_NAME
                },
                { name: 'USERNAME', value: data.username },
                {
                  name: data.dbType === DBTypeEnum.postgresql ? 'PGPASSWORD' : 'PASSWORD',
                  value: data.password
                },
                {
                  name: 'HOST',
                  value: data.host
                },
                {
                  name: 'PORT',
                  value: data.port
                }
              ],
              command: commands.get()
            }
          ]
        }
      }
    }
  };

  return Obj;
};

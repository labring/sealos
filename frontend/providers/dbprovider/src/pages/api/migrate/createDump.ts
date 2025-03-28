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
  commands.push(['/bin/sh', '-c']);
  commands.push('mc alias set migrationTask $MINIO_URL $MINIO_ACCESS_KEY $MINIO_SECRET_KEY');
  commands.push('mc cp migrationTask/$MINIO_BUCKET/$FILE_NAME $IMPORT_DIR');

  const secret = `--host=${data.host} --port=${data.port} --username=${data.username} --password=${data.password}`;
  const filePath = `$/root/${data.fileName}`;

  const filenameExtension = data.fileName.split('.').at(-1);

  if (!data.tableExist) {
    commands.echo('Database $DB_NAME does not exist. Creating...');
    switch (data.dbType) {
      case DBTypeEnum.mysql:
        commands.add(`mysql ${secret} -e "CREATE DATABASE $DB_NAME;"`);
        break;
      case DBTypeEnum.postgresql:
        commands.add(`psql ${secret} -d ${data.databaseName} -c "CREATE DATABASE $DB_NAME;"`);
        break;
      case DBTypeEnum.mongodb:
        commands.add(
          `mongo ${secret} --eval "db.getSiblingDB('$DB_NAME').createCollection('init_collection');"`
        );
        break;
    }
  }

  switch (filenameExtension) {
    case 'sql':
      switch (data.dbType) {
        case DBTypeEnum.mysql:
          commands.add(`mysql ${secret} ${data.databaseName} < ${filePath}`);
          break;
        case DBTypeEnum.postgresql:
          commands.add(`psql ${secret} -d ${data.databaseName} -f ${filePath}`);
          break;
        case DBTypeEnum.mongodb:
          commands.add(
            `mongoimport ${secret} --db=${data.databaseName} --collection=${data.tableName} --file=${filePath}`
          );
          break;
      }
      break;
    case 'csv':
      switch (data.dbType) {
        case DBTypeEnum.mysql:
          commands.add(
            `mysql ${secret} ${data.databaseName} -e "LOAD DATA LOCAL INFILE '$IMPORT_DIR/$FILE_NAME' INTO TABLE $TABLE_NAME FIELDS TERMINATED BY ',' ENCLOSED BY '\"' LINES TERMINATED BY '\n';"`
          );
          break;
        case DBTypeEnum.postgresql:
          commands.add(
            `psql ${secret} -d ${data.databaseName} -c "\COPY $TABLE_NAME FROM '${filePath}' CSV HEADER;"`
          );
          break;
        case DBTypeEnum.mongodb:
          commands.add(
            `mongoimport ${secret} --db=${data.databaseName} --collection=${data.tableName} --type=csv --file=${filePath} --headerline`
          );
          break;
      }
    case 'json':
      switch (data.dbType) {
        case DBTypeEnum.mongodb:
          commands.add(
            `mongoimport ${secret} --db=${data.databaseName} --collection=${data.tableName} --file=${filePath} --jsonArray`
          );
          break;
        default:
          throw new Error(`Unsupported DB_TYPE: ${data.dbType}`);
      }
    case 'bson':
      switch (data.dbType) {
        case DBTypeEnum.mongodb:
          commands.add(
            `mongoimport ${secret} --db=${data.databaseName} --collection=${data.tableName} --drop --dir=${filePath}`
          );
          break;
        default:
          throw new Error(`Unsupported DB_TYPE: ${data.dbType}`);
      }
  }

  console.log('Final import statement:', commands.get());

  return {
    apiVersion: 'batch/v1',
    kind: 'Job',
    metadata: {
      name: `${userNS}-${time}-${data.dbName}-file`,
      namespace: userNS
    },
    spec: {
      template: {
        spec: {
          containers: [
            {
              name: 'import-data',
              image: process.env.MIGRATE_FILE_IMAGE,
              // env: [
              //   {
              //     name: 'DB_TYPE',
              //     value: data.dbType
              //   },
              //   {
              //     name: 'DB_HOST',
              //     value: data.host
              //   },
              //   {
              //     name: 'DB_PORT',
              //     value: data.port
              //   },
              //   {
              //     name: 'DB_USER',
              //     value: data.username
              //   },
              //   {
              //     name: 'DB_PASS',
              //     value: data.password
              //   },
              //   {
              //     name: 'DB_NAME',
              //     value: data.databaseName
              //   },
              //   {
              //     name: 'TABLE_NAME',
              //     value: data.tableName
              //   },
              //   {
              //     name: 'MINIO_URL',
              //     value: `https://${process.env.MINIO_URL}`
              //   },
              //   {
              //     name: 'MINIO_ACCESS_KEY',
              //     value: process.env.MINIO_ACCESS_KEY
              //   },
              //   {
              //     name: 'MINIO_SECRET_KEY',
              //     value: process.env.MINIO_SECRET_KEY
              //   },
              //   {
              //     name: 'MINIO_BUCKET',
              //     value: process.env.MINIO_BUCKET_NAME
              //   },
              //   {
              //     name: 'IMPORT_DIR',
              //     value: '/root'
              //   }
              // ],
              command: commands.get()
            }
          ]
        }
      }
    }
  };
};

import { CloudMigraionLabel } from '@/constants/db';
import { authSession } from '@/services/backend/auth';
import { getK8s } from '@/services/backend/kubernetes';
import { jsonRes } from '@/services/backend/response';
import { ApiResp } from '@/services/kubernet';
import { DumpForm } from '@/types/migrate';
import { fetchDBSecret } from '@/utils/database';
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
        process.env.MIGRATE_FILE_FETCH_FILE_IMAGE &&
        process.env.MIGRATE_FILE_IMPORT_DATA_IMAGE
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

  const filenameExtension = data.fileName.split('.').at(-1);

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
          volumes: [{ name: 'import-data', emptyDir: { sizeLimit: '6Gi' } }],
          initContainers: [
            {
              name: 'fetch-file',
              image: process.env.MIGRATE_FILE_FETCH_FILE_IMAGE,
              resources: {
                requests: {
                  cpu: '50m',
                  memory: '64Mi',
                  'ephemeral-storage': '2Gi'
                },
                limits: {
                  cpu: '2000m',
                  memory: '4Gi',
                  'ephemeral-storage': '6Gi'
                }
              },
              env: [
                {
                  name: 'MINIO_URL',
                  value: `http://${process.env.MINIO_URL}`
                },
                {
                  name: 'MINIO_ACCESS_KEY',
                  value: process.env.MINIO_ACCESS_KEY
                },
                {
                  name: 'MINIO_SECRET_KEY',
                  value: process.env.MINIO_SECRET_KEY
                },
                {
                  name: 'MINIO_BUCKET',
                  value: process.env.MINIO_BUCKET_NAME
                },
                {
                  name: 'FILE_NAME',
                  value: data.fileName
                }
              ],
              command: [
                '/bin/sh',
                '-c',
                `
mc alias set migrationTask $MINIO_URL $MINIO_ACCESS_KEY $MINIO_SECRET_KEY
mc cp migrationTask/$MINIO_BUCKET/$FILE_NAME /data/$FILE_NAME
                `
              ],
              volumeMounts: [
                {
                  name: 'import-data',
                  mountPath: '/data'
                }
              ]
            }
          ],
          containers: [
            {
              name: 'import-data',
              image: process.env.MIGRATE_FILE_IMPORT_DATA_IMAGE,
              resources: {
                requests: {
                  cpu: '50m',
                  memory: '64Mi',
                  'ephemeral-storage': '2Gi'
                },
                limits: {
                  cpu: '2000m',
                  memory: '4Gi',
                  'ephemeral-storage': '6Gi'
                }
              },
              env: [
                {
                  name: 'DB_TYPE',
                  value: data.dbType
                },
                {
                  name: 'DB_HOST',
                  value: data.host
                },
                {
                  name: 'DB_PORT',
                  value: data.port
                },
                {
                  name: 'DB_USER',
                  value: data.username
                },
                {
                  name: 'DB_PASS',
                  value: data.password
                },
                {
                  name: 'DB_NAME',
                  value: data.databaseName
                },
                {
                  name: 'TABLE_NAME',
                  value: data.tableName
                },
                {
                  name: 'IMPORT_FORMAT',
                  value: filenameExtension
                },
                {
                  name: 'FILE_NAME',
                  value: data.fileName
                },
                {
                  name: 'PGPASSWORD',
                  value: data.password
                }
              ],
              command: [
                '/bin/sh',
                '-c',
                `
set -e

IMPORT_DIR="/data"
FILE="$IMPORT_DIR/$FILE_NAME"

if [ "$DB_TYPE" = "mysql" ] || [ "$DB_TYPE" = "apecloud-mysql" ]; then
  echo "检查并导入 MySQL..."
  DB_EXISTS=$(mysql -h $DB_HOST -P $DB_PORT -u$DB_USER -p$DB_PASS -e "SHOW DATABASES LIKE '$DB_NAME';" | grep "$DB_NAME" || true)
  if [ -z "$DB_EXISTS" ]; then
    mysql -h $DB_HOST -P $DB_PORT -u$DB_USER -p$DB_PASS -e "CREATE DATABASE $DB_NAME;"
  fi

  if [ "$IMPORT_FORMAT" = "sql" ]; then
    mysql -h $DB_HOST -P $DB_PORT -u$DB_USER -p$DB_PASS $DB_NAME < $FILE
  elif [ "$IMPORT_FORMAT" = "csv" ]; then
    mysql --local-infile=1 -h $DB_HOST -P $DB_PORT -u$DB_USER -p$DB_PASS $DB_NAME -e "LOAD DATA LOCAL INFILE '$FILE' INTO TABLE $TABLE_NAME FIELDS TERMINATED BY ',' ENCLOSED BY '\\\"' LINES TERMINATED BY '\\n';"
  fi

elif [ "$DB_TYPE" = "postgresql" ]; then
  echo "检查并导入 PostgreSQL..."
  DB_EXISTS=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -w -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';")
  if [ "$DB_EXISTS" != "1" ]; then
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -w -c "CREATE DATABASE $DB_NAME;"
  fi

  if [ "$IMPORT_FORMAT" = "sql" ]; then
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -w -d $DB_NAME -f $FILE
  elif [ "$IMPORT_FORMAT" = "csv" ]; then
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -w -d $DB_NAME -c "\\COPY $TABLE_NAME FROM '$FILE' CSV HEADER;"
  fi

elif [ "$DB_TYPE" = "mongodb" ]; then
  echo "检查并导入 MongoDB..."
  if [ "$IMPORT_FORMAT" = "json" ]; then
    mongoimport --host=$DB_HOST --port=$DB_PORT --username=$DB_USER --password=$DB_PASS --db=$DB_NAME --collection=$TABLE_NAME --file=$FILE --jsonArray
  elif [ "$IMPORT_FORMAT" = "bson" ]; then
    mongorestore --host=$DB_HOST --port=$DB_PORT --username=$DB_USER --password=$DB_PASS --db=$DB_NAME --drop --dir=$FILE
  elif [ "$IMPORT_FORMAT" = "csv" ]; then
    mongoimport --host=$DB_HOST --port=$DB_PORT --username=$DB_USER --password=$DB_PASS --db=$DB_NAME --collection=$TABLE_NAME --type=csv --file=$FILE --headerline
  fi
else
  echo "Unsupported DB_TYPE: $DB_TYPE"
  exit 1
fi
`
              ],
              volumeMounts: [
                {
                  name: 'import-data',
                  mountPath: '/data'
                }
              ]
            }
          ]
        }
      }
    }
  };

  return Obj;
};

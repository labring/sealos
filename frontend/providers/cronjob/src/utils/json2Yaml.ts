import yaml from 'js-yaml';
import type { DBEditType, DBType } from '@/types/db';
import { str2Num } from '@/utils/tools';
import { DBTypeEnum, DBComponentNameMap, RedisHAConfig } from '@/constants/db';
import { crLabelKey } from '@/constants/db';
import { getUserNamespace } from './user';
import dayjs from 'dayjs';
import { BACKUP_REMARK_LABEL_KEY, BACKUP_LABEL_KEY } from '@/constants/backup';
import { StorageClassName } from '@/store/static';
import { CronJobEditType } from '@/types/job';

export const json2CronJob = (data: CronJobEditType) => {
  const { JobName, schedule, imageName } = data;

  const template = {
    apiVersion: 'batch/v1',
    kind: 'CronJob',
    metadata: {
      name: JobName
    },
    spec: {
      schedule: schedule,
      jobTemplate: {
        spec: {
          template: {
            spec: {
              containers: [
                {
                  name: 'hello',
                  image: imageName,
                  imagePullPolicy: 'IfNotPresent',
                  command: ['/bin/sh', '-c', 'date; echo Hello from the Kubernetes cluster']
                }
              ],
              restartPolicy: 'OnFailure'
            }
          }
        }
      }
    }
  };

  return yaml.dump(template);
};

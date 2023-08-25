import { CronJobEditType } from '@/types/job';
import { time2Cron } from '@/utils/tools';
import yaml from 'js-yaml';

export const json2CronJob = (data: CronJobEditType) => {
  const _schedule = time2Cron(data);

  const metadata = {
    name: data.jobName,
    annotations: {
      originImageName: data.imageName
    }
  };

  const imagePullSecrets = data.secret.use
    ? [
        {
          name: data.jobName
        }
      ]
    : undefined;

  const commonContainer = {
    name: data.jobName,
    image: `${data.secret.use ? `${data.secret.serverAddress}/` : ''}${data.imageName}`,
    env:
      data.envs.length > 0
        ? data.envs.map((env) => ({
            name: env.key,
            value: env.valueFrom ? undefined : env.value,
            valueFrom: env.valueFrom
          }))
        : [],

    args: data.cmdParam ? [data.cmdParam] : [],
    imagePullPolicy: 'Always'
  };

  const template = {
    apiVersion: 'batch/v1',
    kind: 'CronJob',
    metadata: metadata,
    spec: {
      schedule: _schedule,
      successfulJobsHistoryLimit: 3,
      failedJobsHistoryLimit: 3,
      jobTemplate: {
        spec: {
          template: {
            spec: {
              imagePullSecrets,
              containers: [
                {
                  ...commonContainer
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

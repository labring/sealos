import { CronJobEditType } from '@/types/job';
import { getUserTimeZone, str2Num } from '@/utils/tools';
import yaml from 'js-yaml';
import { getUserKubeConfig, getUserServiceAccount } from './user';
import { cronJobKey } from '@/constants/keys';
import useEnvStore from '@/store/env';

export const json2CronJob = (data: CronJobEditType) => {
  const serviceAccount = getUserServiceAccount();
  const timeZone = getUserTimeZone();
  const kcHeader = encodeURIComponent(getUserKubeConfig());
  const { applaunchpadUrl } = useEnvStore.getState().SystemEnv;

  const metadata = {
    name: data.jobName,
    annotations: {},
    labels: {
      'cronjob-type': data.jobType,
      'cronjob-launchpad-name': data.launchpadName,
      [cronJobKey]: data.jobName
    }
  };

  const imagePullSecrets = data.secret.use
    ? [
        {
          name: data.jobName
        }
      ]
    : undefined;

  // handle cron type
  if (data.jobType === 'url') {
    data.imageName = 'curlimages/curl';
    data.cmdParam = `["/bin/sh", "-c", "curl ${data.url}"]`;
  }

  if (data.jobType === 'launchpad') {
    data.imageName = 'nowinkey/curl-kubectl:v1.0.4';
    data.runCMD = `["/bin/sh", "-c"]`;
    const resources = {
      requests: {
        cpu: `${str2Num(Math.floor(data.cpu * 0.1))}m`,
        memory: `${str2Num(Math.floor(data.memory * 0.1))}Mi`
      },
      limits: {
        cpu: `${str2Num(data.cpu)}m`,
        memory: `${str2Num(data.memory)}Mi`
      }
    };
    const getArgs = () => {
      let command = '';
      if (data.enableNumberCopies && applaunchpadUrl) {
        command += `curl -X POST -H "Authorization: ${kcHeader}" -d "appName=${data.launchpadName}&replica=${data.replicas}" http://${applaunchpadUrl}/api/v1alpha/updateReplica`;
      }
      if (data.enableResources) {
        if (command) {
          command += ' && ';
        }
        command += `kubectl set resources deployment ${data.launchpadName} --limits=cpu=${resources.limits.cpu},memory=${resources.limits.memory} --requests=cpu=${resources.requests.cpu},memory=${resources.requests.memory}`;
      }

      return command.replace(/\n/g, '') || '';
    };

    data.cmdParam = getArgs();
    metadata.annotations = {
      enableNumberCopies: `${data.enableNumberCopies}`,
      enableResources: `${data.enableResources}`,
      cpu: `${str2Num(data.cpu)}m`,
      memory: `${str2Num(data.memory)}Mi`,
      launchpadName: data.launchpadName,
      launchpadId: data.launchpadId,
      replicas: `${data.replicas}`
    };
  }

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
    command: (() => {
      if (!data.runCMD) return undefined;
      try {
        return JSON.parse(data.runCMD) as string[];
      } catch (error) {
        return data.runCMD.split(' ').filter((item) => item);
      }
    })(),
    args: (() => {
      if (!data.cmdParam) return undefined;
      try {
        return JSON.parse(data.cmdParam) as string[];
      } catch (error) {
        return [data.cmdParam];
      }
    })(),
    imagePullPolicy: 'IfNotPresent'
  };

  const template = {
    apiVersion: 'batch/v1',
    kind: 'CronJob',
    metadata: metadata,
    spec: {
      schedule: data.schedule,
      concurrencyPolicy: 'Replace',
      startingDeadlineSeconds: 60,
      successfulJobsHistoryLimit: 3,
      failedJobsHistoryLimit: 3,
      timeZone: timeZone,
      jobTemplate: {
        activeDeadlineSeconds: 600,
        spec: {
          template: {
            spec: {
              serviceAccountName: serviceAccount,
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

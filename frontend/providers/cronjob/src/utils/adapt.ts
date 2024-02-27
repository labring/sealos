import { CronJobStatusMap, StatusEnum } from '@/constants/job';
import { AppListItemType } from '@/types/app';
import {
  CronJobAnnotations,
  CronJobEditType,
  CronJobListItemType,
  JobEvent,
  JobList
} from '@/types/job';
import { cpuFormatToM, cron2Time, formatPodTime, memoryFormatToMi } from '@/utils/tools';
import {
  CoreV1EventList,
  V1CronJob,
  V1Deployment,
  V1Job,
  V1Pod,
  V1ServiceAccount
} from '@kubernetes/client-node';
import dayjs from 'dayjs';
import cronstrue from 'cronstrue';
import 'cronstrue/locales/zh_CN';
import 'cronstrue/locales/en';
import cronParser from 'cron-parser';
import { getLangStore } from './cookieUtils';
import { getJobEvents, getJobPodList } from '@/api/job';

export const adaptCronJobList = (job: V1CronJob): CronJobListItemType => {
  const LANG_KEY = getLangStore() === 'en' ? 'en' : 'zh_CN';
  const status_str = job.spec?.suspend ? StatusEnum.Stopped : StatusEnum.Running;
  let _schedule = cronstrue.toString(job.spec?.schedule || '* * * * *', { locale: LANG_KEY });
  let nextTime = cronParser
    .parseExpression(job.spec?.schedule || '* * * * *')
    .next()
    .toString();

  return {
    id: job.metadata?.uid || '',
    name: job.metadata?.name || 'job name',
    createTime: dayjs(job.metadata?.creationTimestamp).format('YYYY/MM/DD HH:mm'),
    status: CronJobStatusMap[status_str]
      ? CronJobStatusMap[status_str]
      : CronJobStatusMap['UnKnow'],
    schedule: _schedule,
    lastScheduleTime: dayjs(job?.status?.lastScheduleTime).format('YYYY/MM/DD HH:mm'),
    lastSuccessfulTime: dayjs(job?.status?.lastSuccessfulTime).format('YYYY/MM/DD HH:mm'),
    nextExecutionTime: dayjs(nextTime).format('YYYY/MM/DD HH:mm')
  };
};

export const adaptCronJobDetail = async (job: V1CronJob): Promise<CronJobEditType> => {
  const LANG_KEY = getLangStore() === 'en' ? 'en' : 'zh_CN';
  let _schedule = cronstrue.toString(job.spec?.schedule || '* * * * *', { locale: LANG_KEY });
  let nextTime = cronParser
    .parseExpression(job.spec?.schedule || '* * * * *')
    .next()
    .toString();
  const status_str = job.spec?.suspend ? StatusEnum.Stopped : StatusEnum.Running;
  const { cpu, enableNumberCopies, enableResources, launchpadId, launchpadName, memory, replicas } =
    job.metadata?.annotations as CronJobAnnotations;

  const getUrl = (): string => {
    const commands = job.spec?.jobTemplate?.spec?.template?.spec?.containers?.[0]?.args;
    if (!commands) return '';
    const curlCommand = commands.find((command) => /^curl\s+(\S+)/.test(command));
    const curlAddress = curlCommand ? curlCommand.split(/\s+/)[1] : '';
    return curlAddress;
  };

  return {
    jobType: job.metadata?.labels?.['cronjob-type'] as 'url' | 'image' | 'launchpad',
    jobName: job.metadata?.name || '',
    schedule: job.spec?.schedule || '',
    imageName:
      job?.metadata?.annotations?.originImageName ||
      job.spec?.jobTemplate?.spec?.template?.spec?.containers?.[0]?.image ||
      '',
    runCMD: JSON.stringify(job.spec?.jobTemplate?.spec?.template?.spec?.containers?.[0]?.command),
    cmdParam: JSON.stringify(job.spec?.jobTemplate?.spec?.template?.spec?.containers?.[0]?.args),
    secret: {
      use: false,
      username: '',
      password: '',
      serverAddress: 'docker.io'
    },
    envs:
      job.spec?.jobTemplate?.spec?.template?.spec?.containers?.[0]?.env?.map((env) => {
        return {
          key: env.name,
          value: env.value || '',
          valueFrom: env.valueFrom
        };
      }) || [],
    // cronjob type url
    url: getUrl(),
    // launchpad
    enableNumberCopies: Boolean(enableNumberCopies),
    enableResources: Boolean(enableResources),
    replicas: Number(replicas) || 0,
    cpu: cpuFormatToM(cpu || '0'),
    memory: memoryFormatToMi(memory || '0'),
    launchpadName: launchpadName || '',
    launchpadId: launchpadId || '',
    serviceAccountName: 'userns',
    // detail page
    status: CronJobStatusMap[status_str]
      ? CronJobStatusMap[status_str]
      : CronJobStatusMap['UnKnow'],
    isPause: !!job.spec?.suspend,
    creatTime: dayjs(job.metadata?.creationTimestamp).format('YYYY-MM-DD HH:mm'),
    _schedule: _schedule,
    nextExecutionTime: dayjs(nextTime).format('YYYY/MM/DD HH:mm')
  };
};

export const sliderNumber2MarkList = ({
  val,
  type,
  gpuAmount = 1
}: {
  val: number[];
  type: 'cpu' | 'memory';
  gpuAmount?: number;
}) => {
  const newVal = val.map((item) => item * gpuAmount);

  return newVal.map((item) => ({
    label: type === 'memory' ? (item >= 1024 ? `${item / 1024} G` : `${item} M`) : `${item / 1000}`,
    value: item
  }));
};

export const adaptAppListItem = (app: V1Deployment): AppListItemType => {
  return {
    id: app.metadata?.uid || ``,
    name: app.metadata?.name || 'app name',
    label: app.metadata?.name || 'app name',
    createTime: dayjs(app.metadata?.creationTimestamp).format('YYYY/MM/DD HH:mm'),
    cpu: cpuFormatToM(app.spec?.template?.spec?.containers?.[0]?.resources?.limits?.cpu || '0'),
    memory: memoryFormatToMi(
      app.spec?.template?.spec?.containers?.[0]?.resources?.limits?.memory || '0'
    ),
    replicas: app.spec?.replicas || 0
  };
};

export const adaptServiceAccountList = (
  serviceAccount: V1ServiceAccount
): { id: string; name: string; namespace: string } => {
  return {
    id: serviceAccount.metadata?.uid || '',
    name: serviceAccount.metadata?.name || '',
    namespace: serviceAccount.metadata?.namespace || ''
  };
};

export const adaptJobItemList = (jobs: V1Job[]): JobList => {
  const total = jobs.length;
  let successAmount = 0;
  const history = jobs
    .map((item) => {
      if (!!item.status?.succeeded) successAmount++;
      const startTimeTimestamp = dayjs(item.status?.startTime).unix();
      return {
        status: !!item.status?.succeeded,
        startTime: dayjs(item.status?.startTime).format('YYYY-MM-DD HH:mm'),
        completionTime: dayjs(item.status?.completionTime).format('YYYY-MM-DD HH:mm'),
        uid: item.metadata?.uid,
        name: item.metadata?.name,
        events: [] as JobEvent[],
        logs: '',
        podName: '',
        startTimeTimestamp: startTimeTimestamp
      };
    })
    .sort((a, b) => {
      return b.startTimeTimestamp - a.startTimeTimestamp;
    });

  return {
    total,
    successAmount,
    history
  };
};

export const adaptEvents = (events: CoreV1EventList): JobEvent[] => {
  return events.items.map((item) => ({
    id: item.metadata.uid || `${Date.now()}`,
    reason: item.reason || '',
    message: item.message || '',
    count: item.count || 0,
    type: item.type || 'Warning',
    firstTime: formatPodTime(item.firstTimestamp || item.metadata?.creationTimestamp),
    lastTime: formatPodTime(item.lastTimestamp || item?.eventTime)
  }));
};

export const adaptJobDetail = async (jobs: JobList): Promise<JobList> => {
  const jobNames = jobs.history.map((item) => item.name);
  try {
    const podJobMap = new Map<string, V1Pod>();
    const podList = await getJobPodList(jobNames as string[]);
    podList.items.forEach((pod) => {
      const labels = pod.metadata?.labels || {};
      const podJobName = labels['job-name'];
      if (podJobName) {
        podJobMap.set(podJobName, pod);
      }
    });

    await Promise.all(
      jobs.history.map(async (job) => {
        if (!job?.name) return;
        const events = await getJobEvents(job.name);
        job.events = events;
        const jobPod = podJobMap.get(job.name);
        if (!jobPod?.metadata?.name) return;
        job.podName = jobPod?.metadata?.name;
      })
    );

    return {
      total: jobs.total || 0,
      successAmount: jobs.successAmount || 0,
      history: jobs.history || []
    };
  } catch (error) {
    throw error;
  }
};

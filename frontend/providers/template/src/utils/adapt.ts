import {
  componentLabel,
  maxReplicasKey,
  minReplicasKey,
  pauseKey,
  templateDisplayNameKey
} from '@/constants/keys';
import { StatusEnum, StatusMap } from '@/constants/status';
import { InstanceListItemType, TemplateInstanceType } from '@/types/app';
import { AppCrdType } from '@/types/appCRD';
import { CronJobListItemType } from '@/types/cronJob';
import { DBListItemType, KbPgClusterType } from '@/types/db';
import { AppListItemType } from '@/types/launchpad';
import { ResourceListItemType, ResourceKindType } from '@/types/resource';
import {
  V1CronJob,
  V1Deployment,
  V1Job,
  V1Secret,
  V1Service,
  V1StatefulSet
} from '@kubernetes/client-node';
import cronParser from 'cron-parser';
import cronstrue from 'cronstrue';
import 'cronstrue/locales/en';
import 'cronstrue/locales/zh_CN';
import dayjs from 'dayjs';
import { flatMap } from 'lodash';
import { getLangStore } from './cookieUtils';
import { cpuFormatToM, memoryFormatToMi } from './tools';

export function sortItemsByCreateTime<T extends { createTime: string }>(items: T[]): T[] {
  return items.sort((a, b) => {
    const dateA = new Date(b.createTime);
    const dateB = new Date(a.createTime);
    return dateA.getTime() - dateB.getTime();
  });
}

export function adaptInstanceListItem(item: TemplateInstanceType): InstanceListItemType {
  return {
    id: item.metadata?.name,
    createTime: dayjs(item.metadata?.creationTimestamp).format('YYYY-MM-DD HH:mm'),
    author: item.spec?.author,
    description: item.spec?.description,
    gitRepo: item.spec?.gitRepo,
    icon: item.spec?.icon,
    readme: item.spec?.readme,
    templateType: item.spec?.templateType,
    title: item.spec?.title,
    url: item.spec?.url,
    yamlCR: item,
    displayName: item.metadata?.labels?.[templateDisplayNameKey]
  };
}

export const adaptAppListItem = (app: V1Deployment & V1StatefulSet): AppListItemType => {
  // compute store amount
  const storeAmount = app.spec?.volumeClaimTemplates
    ? app.spec?.volumeClaimTemplates.reduce(
        (sum, item) => sum + Number(item?.metadata?.annotations?.value),
        0
      )
    : 0;

  return {
    id: app.metadata?.uid || ``,
    name: app.metadata?.name || 'app name',
    isPause: !!app?.metadata?.annotations?.[pauseKey],
    status:
      app.status?.readyReplicas === app.status?.replicas
        ? StatusMap[StatusEnum.Running]
        : StatusMap[StatusEnum.Waiting],
    // isPause: !!app?.metadata?.annotations?.[pauseKey],
    createTime: dayjs(app.metadata?.creationTimestamp).format('YYYY/MM/DD HH:mm'),
    cpu: cpuFormatToM(app.spec?.template?.spec?.containers?.[0]?.resources?.limits?.cpu),
    memory: memoryFormatToMi(app.spec?.template?.spec?.containers?.[0]?.resources?.limits?.memory),
    activeReplicas: app.status?.readyReplicas || 0,
    maxReplicas: +(app.metadata?.annotations?.[maxReplicasKey] || app.status?.readyReplicas || 0),
    minReplicas: +(app.metadata?.annotations?.[minReplicasKey] || app.status?.readyReplicas || 0),
    storeAmount
  };
};

export const adaptDBListItem = (db: KbPgClusterType): DBListItemType => {
  return {
    id: db.metadata?.uid || ``,
    name: db.metadata?.name || 'db name',
    dbType: db?.metadata?.labels['clusterdefinition.kubeblocks.io/name'] || 'postgresql',
    status: StatusMap[db?.status?.phase || 'Waiting']
      ? StatusMap[db?.status?.phase || 'Waiting']
      : StatusMap[StatusEnum.Waiting],
    createTime: dayjs(db.metadata?.creationTimestamp).format('YYYY/MM/DD HH:mm'),
    cpu: cpuFormatToM(db.spec?.componentSpecs?.[0]?.resources.limits.cpu),
    memory: memoryFormatToMi(db.spec?.componentSpecs?.[0]?.resources.limits.memory),
    storage:
      db.spec?.componentSpecs?.[0]?.volumeClaimTemplates?.[0]?.spec?.resources?.requests?.storage ||
      '-',
    conditions: db?.status?.conditions || []
  };
};

export const adaptCronJobList = (job: V1CronJob): CronJobListItemType => {
  const LANG_KEY = getLangStore() === 'en' ? 'en' : 'zh_CN';
  let _schedule = cronstrue.toString(job.spec?.schedule || '* * * * *', { locale: LANG_KEY });
  let nextTime = cronParser
    .parseExpression(job.spec?.schedule || '* * * * *')
    .next()
    .toString();

  return {
    id: job.metadata?.uid || '',
    name: job.metadata?.name || 'job name',
    createTime: dayjs(job.metadata?.creationTimestamp).format('YYYY/MM/DD HH:mm'),
    status: job.spec?.suspend ? StatusMap[StatusEnum.Stopped] : StatusMap[StatusEnum.Running],
    schedule: _schedule,
    lastScheduleTime: dayjs(job?.status?.lastScheduleTime).format('YYYY/MM/DD HH:mm'),
    lastSuccessfulTime: dayjs(job?.status?.lastSuccessfulTime).format('YYYY/MM/DD HH:mm'),
    nextExecutionTime: dayjs(nextTime).format('YYYY/MM/DD HH:mm')
  };
};

export const adaptOtherList = (
  data: (AppCrdType[] | V1Secret[] | V1Job[] | V1Service[])[]
): ResourceListItemType[] => {
  return flatMap(data, (innerArray) => {
    return innerArray.map((item) => {
      const labels: { [key: string]: string } = item.metadata?.labels || {};
      const kind = item.kind as ResourceKindType;
      return {
        id: item.metadata?.uid || '',
        name: item.metadata?.name || '',
        createTime: dayjs(item.metadata?.creationTimestamp).format('YYYY/MM/DD HH:mm'),
        kind: kind,
        label: labels[componentLabel] ?? '',
        apiVersion: item.apiVersion,
        servicePorts: kind === 'Service' ? (item as V1Service)?.spec?.ports || [] : [],
        serviceType: (item as V1Service)?.spec?.type || 'ClusterIP'
      };
    });
  });
};

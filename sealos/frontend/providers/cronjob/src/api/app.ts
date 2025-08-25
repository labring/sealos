import { GET } from '@/services/request';
import { AppListItemType } from '@/types/app';
import { adaptAppListItem, adaptServiceAccountList } from '@/utils/adapt';
import { V1Deployment, V1ServiceAccount } from '@kubernetes/client-node';

export const getMyApps = () => GET<AppListItemType[]>('/api/launchpad/getApps');

export const getMyServiceAccount = () =>
  GET<V1ServiceAccount[]>('/api/launchpad/getServiceAccount').then((res) =>
    res.map(adaptServiceAccountList)
  );

export const getAppByName = (name: string) =>
  GET<V1Deployment>(`/api/launchpad/getAppByAppName?appName=${name}`);

import { V1ServicePort } from '@kubernetes/client-node';

export type ResourceKindType =
  | 'DataBase'
  | 'AppLaunchpad'
  | 'CronJob'
  | 'App'
  | 'Job'
  | 'Secret'
  | 'Issuer'
  | 'Role'
  | 'RoleBinding'
  | 'ServiceAccount'
  | 'ConfigMap'
  | 'Instance'
  | 'Service'
  | 'PersistentVolumeClaim';

export type ResourceListItemType = {
  id: string;
  name: string;
  kind: ResourceKindType;
  createTime?: string;
  label?: string;
  apiVersion?: string;
  servicePorts?: V1ServicePort[];
  serviceType?: string;
};

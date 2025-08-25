import { V1ServicePort } from '@kubernetes/client-node';

export type AllResourceKindType =
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
  | 'ObjectStorageBucket'
  | 'PersistentVolumeClaim'
  | 'Devbox';

export type DeleteResourceFunction = (instanceName: string) => void;

export type ResourceListItemType = {
  id: string;
  name: string;
  kind: AllResourceKindType;
  apiVersion?: string;
  createTime?: string;
  label?: string;
  servicePorts?: V1ServicePort[];
  serviceType?: string;
};

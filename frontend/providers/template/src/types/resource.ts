export type BaseResourceType = {
  id: string;
  name: string;
  kind: ResourceKindType;
};

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
  | 'Instance';

export type OtherResourceListItemType = {
  id: string;
  name: string;
  createTime: string;
  kind: ResourceKindType;
  label: string;
};

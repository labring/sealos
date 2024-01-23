import { DELETE } from '@/services/request';
import { ResourceListItemType, ResourceKindType } from '@/types/resource';

export const delCronJobByName = (instanceName: string) =>
  DELETE('/api/resource/deleteCronjob', { instanceName });

export const deleteAppCRD = (instanceName: string) =>
  DELETE('/api/resource/deleteAppCRD', { instanceName });

export const deleteSecret = (instanceName: string) =>
  DELETE('/api/resource/deleteSecret', { instanceName });

export const delApplaunchpad = (instanceName: string) =>
  DELETE('/api/resource/delApplaunchpad', { instanceName });

export const delDBByName = (instanceName: string) =>
  DELETE('/api/resource/delDBByName', { instanceName });

export const delInstanceByName = (instanceName: string) =>
  DELETE('/api/instance/deleteByName', { instanceName });

export const delJobByName = (instanceName: string) =>
  DELETE('/api/resource/delJob', { instanceName });

export const delConfigMapByName = (instanceName: string) =>
  DELETE('/api/resource/delConfigMap', { instanceName });

export const delIssuerByName = (instanceName: string) =>
  DELETE('/api/resource/deleteIssuer', { instanceName });

export const delRoleByName = (instanceName: string) =>
  DELETE('/api/resource/delRole', { instanceName });

export const delRoleBindingByName = (instanceName: string) =>
  DELETE('/api/resource/delRoleBinding', { instanceName });

export const delServiceAccountByName = (instanceName: string) =>
  DELETE('/api/resource/delServiceAccount', { instanceName });

export const delPersistentVolumeClaim = (instanceName: string) =>
  DELETE('/api/resource/delPersistentVolumeClaim', { instanceName });

export const delCR = (data: Record<'kind' | 'name' | 'apiVersion', string>) =>
  DELETE('/api/resource/delCR', data);

export const delServiceByName = (instanceName: string) =>
  DELETE('/api/resource/delService', { instanceName });

const deleteResourceByKind: Record<ResourceKindType, undefined | ((instanceName: string) => void)> =
  {
    CronJob: (instanceName: string) => delCronJobByName(instanceName),
    App: (instanceName: string) => deleteAppCRD(instanceName),
    Secret: (instanceName: string) => deleteSecret(instanceName),
    AppLaunchpad: (instanceName: string) => delApplaunchpad(instanceName),
    DataBase: (instanceName: string) => delDBByName(instanceName),
    Instance: (instanceName: string) => delInstanceByName(instanceName),
    Job: (instanceName: string) => delJobByName(instanceName),
    ConfigMap: (instanceName: string) => delConfigMapByName(instanceName),
    Issuer: (instanceName: string) => delIssuerByName(instanceName),
    Role: (instanceName: string) => delRoleByName(instanceName),
    RoleBinding: (instanceName: string) => delRoleBindingByName(instanceName),
    ServiceAccount: (instanceName: string) => delServiceAccountByName(instanceName),
    PersistentVolumeClaim: delPersistentVolumeClaim,
    Service: delServiceByName
  };

export const deleteAllResources = async (resources: ResourceListItemType[]) => {
  const deletePromises = resources.map((resource) => {
    const fn = deleteResourceByKind[resource.kind];
    if (!!fn) {
      return fn(resource.name);
    } else {
      console.log(fn, resource);
      delCR({
        name: resource.name,
        apiVersion: resource.apiVersion!,
        kind: resource.kind!
      });
    }
  });
  const reuslt = await Promise.allSettled(deletePromises);
  console.log(reuslt);
  return reuslt;
};

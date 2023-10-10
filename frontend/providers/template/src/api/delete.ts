import { DELETE } from '@/services/request';
import { BaseResourceType, ResourceKindType } from '@/types/resource';

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

export const deleteResourceByKind = (instanceName: string, kind: ResourceKindType) => {
  switch (kind) {
    case 'CronJob':
      return delCronJobByName(instanceName);
    case 'App':
      return deleteAppCRD(instanceName);
    case 'Secret':
      return deleteSecret(instanceName);
    case 'AppLaunchpad':
      return delApplaunchpad(instanceName);
    case 'DataBase':
      return delDBByName(instanceName);
    case 'Instance':
      return delInstanceByName(instanceName);
    case 'Job':
      return delJobByName(instanceName);
    default:
      throw new Error(`Unsupported kind: ${kind}`);
  }
};

export const deleteAllResources = async (resources: BaseResourceType[]) => {
  const deletePromises = resources.map((resource) => {
    return deleteResourceByKind(resource.name, resource.kind);
  });
  const reuslt = await Promise.allSettled(deletePromises);
  console.log(reuslt);
  return reuslt;
};

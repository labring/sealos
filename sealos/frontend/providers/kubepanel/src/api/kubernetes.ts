import {
  KubeJsonApiDataFor,
  KubeObject,
  isJsonApiData,
  isPartialJsonApiData
} from '@/k8slens/kube-object';
import { bindPredicate, hasTypedProperty, isTypedArray } from '@/k8slens/utilities';
import { ErrnoCode, buildErrno } from '@/services/backend/error';
import { DELETE, GET, POST, PUT } from '@/services/request';
import { KubeList } from '@/types/kube-resource';
import { isKubeList } from '@/utils/types';

/**
 * Retrieves a yaml-like template of a specified kind from Backend API.
 *
 * @param kind The kind of resource to retrieve.
 * @returns A promise that resolves to a `SuccessResponse` containing the yaml-like template.
 */
export function getTemplate(kind: string) {
  return GET<SuccessResponse<string>>(`/api/kubernetes/template?kind=${kind}`);
}

/**
 * Retrieves a list of resources of a specified kind from the Backend API.
 *
 * @param kind The kind of resource to retrieve.
 * @returns A promise that resolves to a `SuccessResponse` containing the list of resources.
 */
export async function listResources<
  Object extends KubeObject = KubeObject,
  Data extends KubeJsonApiDataFor<Object> = KubeJsonApiDataFor<Object>
>(kind: string): Promise<SuccessResponse<KubeList<Data>>> {
  const res = await GET<SuccessResponse<KubeList<Data>>>(`/api/kubernetes/list?kind=${kind}`);

  if (
    isKubeList<Data>(res.data) &&
    hasTypedProperty(res.data, 'items', bindPredicate(isTypedArray, isPartialJsonApiData))
  ) {
    return res;
  }

  throw buildErrno('Response is not correct type', ErrnoCode.ServerInternalError);
}

/**
 * Creates a resource of the specified kind using the provided data.
 *
 * @param kind The kind of resource to create.
 * @param data The data to use for creating the resource.
 * @returns A Promise that resolves to a `SuccessResponse` containing the created resource data.
 */
export async function createResource<
  Object extends KubeObject = KubeObject,
  Data extends KubeJsonApiDataFor<Object> = KubeJsonApiDataFor<Object>
>(kind: string, data: string): Promise<SuccessResponse<Data>> {
  const res = await POST<SuccessResponse<Data>>(`/api/kubernetes/create?kind=${kind}`, {
    data
  });

  if (isJsonApiData(res.data)) {
    return res;
  }

  throw buildErrno('Response is not correct type', ErrnoCode.ServerInternalError);
}

/**
 * Deletes a resource from the Kubernetes cluster.
 *
 * @param kind The kind of resource to delete.
 * @param name The name of the resource to delete.
 * @return A promise that resolves with a `SuccessResponse` containing the data, which is old resource data,
 * if the resource is deleted successfully.
 */
export async function deleteResource<
  Object extends KubeObject = KubeObject,
  Data extends KubeJsonApiDataFor<Object> = KubeJsonApiDataFor<Object>
>(kind: string, name: string): Promise<SuccessResponse<Data>> {
  const res = await DELETE<SuccessResponse<Data>>('/api/kubernetes/delete', {
    kind,
    name
  });

  if (isJsonApiData(res.data)) {
    return res;
  }

  throw buildErrno('Response is not correct type', ErrnoCode.ServerInternalError);
}

/**
 * Updates a resource in the Kubernetes API.
 *
 * @param kind The type of resource to update.
 * @param name The name of the resource to update.
 * @param data The updated data for the resource.
 * @return A promise that resolves to a `SuccessResponse` containing the old data.
 */
export async function updateResource<
  Object extends KubeObject = KubeObject,
  Data extends KubeJsonApiDataFor<Object> = KubeJsonApiDataFor<Object>
>(kind: string, name: string, data: string): Promise<SuccessResponse<Data>> {
  const res = await PUT<SuccessResponse<Data>>(`/api/kubernetes/update?kind=${kind}&name=${name}`, {
    data
  });

  if (isJsonApiData(res.data)) {
    return res;
  }

  throw buildErrno('Response is not correct type', ErrnoCode.ServerInternalError);
}

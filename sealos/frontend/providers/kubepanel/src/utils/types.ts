import { hasOptionalTypedProperty, hasOwnProperty, hasTypedProperty } from '@/k8slens/utilities';
import { KubeList } from '@/types/kube-resource';
import { isArray, isNumber, isObject, isString } from 'lodash';

export function isSuccessResponse<T>(data: unknown): data is SuccessResponse<T> {
  return isObject(data) && hasTypedProperty(data, 'code', isNumber) && hasOwnProperty(data, 'data');
}

function isAPIError(data: unknown): data is {
  errno: number;
  message: string;
  reason: string;
} {
  return (
    isObject(data) &&
    hasTypedProperty(data, 'errno', isNumber) &&
    hasTypedProperty(data, 'message', isString) &&
    hasTypedProperty(data, 'reason', isString)
  );
}

export function isErrorResponse(data: unknown): data is ErrorResponse {
  return (
    isObject(data) &&
    hasTypedProperty(data, 'code', isNumber) &&
    hasTypedProperty(data, 'error', isAPIError)
  );
}

function isKubeListMetadata(
  data: unknown
): data is { resourceVersion: string; continue?: string; remainingItemCount?: number } {
  return (
    isObject(data) &&
    hasTypedProperty(data, 'resourceVersion', isString) &&
    hasOptionalTypedProperty(data, 'continue', isString) &&
    hasOptionalTypedProperty(data, 'remainingItemCount', isNumber)
  );
}

export function isKubeList<T>(data: unknown): data is KubeList<T> {
  return (
    isObject(data) &&
    hasTypedProperty(data, 'apiVersion', isString) &&
    hasTypedProperty(data, 'items', isArray) &&
    hasTypedProperty(data, 'kind', isString) &&
    hasTypedProperty(data, 'metadata', isKubeListMetadata)
  );
}

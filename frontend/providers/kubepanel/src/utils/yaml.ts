import { KubeObject } from '@/k8slens/kube-object';
import { dump } from 'js-yaml';
import { PartialDeep } from 'type-fest';

export function dumpKubeObject<K extends KubeObject = KubeObject>(obj: PartialDeep<K>) {
  const objWithoutFunction: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value !== 'function') {
      objWithoutFunction[key] = value;
    }
  }

  // Remove managedFields from metadata if it exists
  if (objWithoutFunction.metadata) {
    if (objWithoutFunction.metadata.managedFields) {
      delete objWithoutFunction.metadata.managedFields;
    }
    // Remove last-applied-configuration annotation
    if (
      objWithoutFunction.metadata.annotations &&
      objWithoutFunction.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration']
    ) {
      delete objWithoutFunction.metadata.annotations[
        'kubectl.kubernetes.io/last-applied-configuration'
      ];
    }
  }

  // Reorder keys: apiVersion, kind, metadata, ...others, spec, status
  const { apiVersion, kind, metadata, spec, status, ...others } = objWithoutFunction;
  const orderedObj: Record<string, any> = {};

  if (apiVersion) orderedObj.apiVersion = apiVersion;
  if (kind) orderedObj.kind = kind;
  if (metadata) orderedObj.metadata = metadata;

  Object.assign(orderedObj, others);

  if (spec) orderedObj.spec = spec;
  if (status) orderedObj.status = status;

  return dump(orderedObj);
}

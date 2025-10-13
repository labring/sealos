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
  if (objWithoutFunction.metadata && objWithoutFunction.metadata.managedFields) {
    delete objWithoutFunction.metadata.managedFields;
  }
  
  return dump(objWithoutFunction);
}

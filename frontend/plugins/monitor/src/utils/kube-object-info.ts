import { KubeObject, KubeObjectMetadata, KubeObjectScope } from '@/k8slens/kube-object';

export type OwnerRef<
  Metadata extends KubeObjectMetadata<KubeObjectScope> = KubeObjectMetadata<KubeObjectScope>
> = {
  namespace: Metadata['namespace'];
  apiVersion: string;
  kind: string;
  name: string;
  uid: string;

  controller?: boolean | undefined;
  blockOwnerDeletion?: boolean | undefined;
};

export type KubeObjectInfo = {
  creationTimestamp?: string;
  name: string;
  uid: string;
  resourceVersion: string;
  labels: Array<string>;
  annotations: Array<string>;
  finalizers: Array<string>;
  ownerRefs: Array<OwnerRef>;
};

export const getKubeObjectInfo = <K extends KubeObject = KubeObject>(obj: K): KubeObjectInfo => {
  return {
    creationTimestamp: obj.metadata.creationTimestamp,
    name: obj.metadata.name,
    uid: obj.getId(),
    resourceVersion: obj.getResourceVersion(),
    labels: obj.getLabels(),
    annotations: obj.getAnnotations(),
    finalizers: obj.getFinalizers(),
    ownerRefs: obj.getOwnerRefs()
  };
};

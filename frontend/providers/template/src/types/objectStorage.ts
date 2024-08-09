import { AllResourceKindType } from './resource';
import { StatusMapType } from './status';

export interface ObjectStorageCR {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
    labels?: {
      [key: string]: string;
    };
    annotations?: {
      [key: string]: string;
    };
    creationTimestamp: string;
    generation: number;
    resourceVersion: string;
    uid: string;
  };
  spec: {
    policy: string;
  };
  status: {
    name: string;
  };
}

export interface ObjectStorageItemType {
  id: string;
  name: string;
  policy: string;
  createTime: string;
  status: StatusMapType;
  apiVersion: string;
  kind: AllResourceKindType;
}

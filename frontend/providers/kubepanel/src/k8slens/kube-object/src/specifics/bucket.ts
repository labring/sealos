import { KubeObjectMetadata, KubeObjectScope } from '../api-types';
import { KubeObject } from '../kube-object';

export interface BucketSpec {
  policy?: string;
}

export interface BucketStatus {
  name?: string;
}

export class Bucket extends KubeObject<
  KubeObjectMetadata<KubeObjectScope.Namespace>,
  BucketStatus,
  BucketSpec
> {
  static readonly kind = 'Bucket';
  static readonly namespaced = true;
  static readonly apiBase = '/apis/objectstorage.sealos.io/v1/objectstoragebuckets';

  getPolicy(): string {
    return this.spec?.policy || '';
  }

  getBucketName(): string {
    return this.status?.name || '';
  }
}

import { ErrorResponse } from './api/base';

/**
 * Kubernetes basic object data
 */
type KubeBasicData<Meta> = {
  apiVersion: string;
  kind: string;
  metadata: Meta;
};

/**
 * Kubernetes StatusDetails
 *
 * @link https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/#statusdetails-v1-meta
 */
type KubeStatusDetails = {
  causes?: Array<{
    field: string;
    message: string;
    reason: string;
  }>;
  group: string;
  kind: string;
  name: string;
  retryAfterSeconds: number;
  uid: string;
};

/**
 * Kubernetes Status
 *
 * @link https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/#status-v1-meta
 */
type KubeStatus = Merge<
  KubeBasicData<KubeListMeta>,
  {
    code: number;
    details?: KubeStatusDetails;
    message: string;
    reason: string;
    status: 'Success' | 'Failure';
  }
>;

/**
 * Kubernetes ListMeta
 * @link https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/#listmeta-v1-meta
 */
type KubeListMeta = {
  continue?: string;
  remainingItemCount?: number;
  resourceVersion: string;
};

/**
 * Kubernetes List
 *
 * @typeParam Type of a specific `KubeBasicData`
 * @link https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/#listmeta-v1-meta
 */
type KubeList<T> = Merge<
  KubeBasicData<KubeListMeta>,
  {
    items: T[];
  }
>;
/**
 * Kubernetes WatchEvent
 *
 * @typeParam Type of a specific `KubeBasicData`
 * @link https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/#watchevent-v1-meta
 */
type WatchEvent<T> =
  | {
      object: T;
      type: 'ADDED' | 'MODIFIED' | 'DELETED';
    }
  | {
      object?: T;
      type: 'ERROR';
    }
  | {
      object: KubeBasicData<{ resourceVersion: string }>;
      type: 'BOOKMARK';
    };

/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { KubeObject } from "./kube-object";

/**
 * The metadata for LIST requests to the KubeApi
 */
export interface KubeJsonApiListMetadata {
  resourceVersion: string;
  selfLink?: string;
}

export interface KubeJsonApiDataList<T = KubeJsonApiData> {
  kind: string;
  apiVersion: string;
  items: T[];
  metadata: KubeJsonApiListMetadata;
}

export interface KubeJsonApiData<
  Metadata extends KubeJsonApiObjectMetadata = KubeJsonApiObjectMetadata,
  Status = unknown,
  Spec = unknown,
> {
  readonly kind: string;
  readonly apiVersion: string;
  metadata: Metadata;
  status?: Status;
  spec?: Spec;
  [otherKeys: string]: unknown;
}

export type KubeJsonApiDataFor<K> = K extends KubeObject<infer Metadata, infer Status, infer Spec>
  ? KubeJsonApiData<Metadata, Status, Spec>
  : never;

export interface KubeObjectConstructorData {
  readonly kind?: string;
  readonly namespaced?: boolean;
  readonly apiBase?: string;
}

export type KubeObjectConstructor<K extends KubeObject, Data> = (new (data: Data) => K) & KubeObjectConstructorData;

export interface OwnerReference {
  apiVersion: string;
  kind: string;
  name: string;
  uid: string;
  controller?: boolean;
  blockOwnerDeletion?: boolean;
}

export type KubeTemplateObjectMetadata<Namespaced extends KubeObjectScope> = Pick<
  KubeJsonApiObjectMetadata<KubeObjectScope>,
  "annotations" | "finalizers" | "generateName" | "labels" | "ownerReferences"
> & {
  name?: string;
  namespace?: ScopedNamespace<Namespaced>;
};

export interface BaseKubeJsonApiObjectMetadata<Namespaced extends KubeObjectScope> {
  /**
   * Annotations is an unstructured key value map stored with a resource that may be set by
   * external tools to store and retrieve arbitrary metadata. They are not queryable and should be
   * preserved when modifying objects.
   *
   * More info: http://kubernetes.io/docs/user-guide/annotations
   */
  annotations?: Partial<Record<string, string>>;

  /**
   * The name of the cluster which the object belongs to. This is used to distinguish resources
   * with same name and namespace in different clusters. This field is not set anywhere right now
   * and api server is going to ignore it if set in create or update request.
   */
  clusterName?: string;

  /**
   * CreationTimestamp is a timestamp representing the server time when this object was created. It
   * is not guaranteed to be set in happens-before order across separate operations. Clients may
   * not set this value. It is represented in RFC3339 form and is in UTC.  Populated by the system.
   *
   * More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata
   */
  readonly creationTimestamp?: string;

  /**
   * Number of seconds allowed for this object to gracefully terminate before it will be removed
   * from the system. Only set when deletionTimestamp is also set. May only be shortened.
   */
  readonly deletionGracePeriodSeconds?: number;

  /**
   * DeletionTimestamp is RFC 3339 date and time at which this resource will be deleted. This field
   * is set by the server when a graceful deletion is requested by the user, and is not directly
   * settable by a client. The resource is expected to be deleted (no longer visible from resource
   * lists, and not reachable by name) after the time in this field, once the finalizers list is
   * empty. As long as the finalizers list contains items, deletion is blocked. Once the
   * `deletionTimestamp` is set, this value may not be unset or be set further into the future,
   * although it may be shortened or the resource may be deleted prior to this time. For example,
   * a user may request that a pod is deleted in 30 seconds. The Kubelet will react by sending a
   * graceful termination signal to the containers in the pod. After that 30 seconds, the Kubelet
   * will send a hard termination signal (SIGKILL) to the container and after cleanup, remove the
   * pod from the API. In the presence of network partitions, this object may still exist after
   * this timestamp, until an administrator or automated process can determine the resource is
   * fully terminated. If not set, graceful deletion of the object has not been requested.
   * Populated by the system when a graceful deletion is requested.
   *
   * More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata
   */
  readonly deletionTimestamp?: string;

  /**
   * Must be empty before the object is deleted from the registry. Each entry is an identifier for
   * the responsible component that will remove the entry from the list. If the deletionTimestamp
   * of the object is non-nil, entries in this list can only be removed. Finalizers may be
   * processed and removed in any order.  Order is NOT enforced because it introduces significant
   * risk of stuck finalizers. finalizers is a shared field, any actor with permission can reorder
   * it. If the finalizer list is processed in order, then this can lead to a situation in which
   * the component responsible for the first finalizer in the list is waiting for a signal (field
   * value, external system, or other) produced by a component responsible for a finalizer later in
   * the list, resulting in a deadlock. Without enforced ordering finalizers are free to order
   * amongst themselves and are not vulnerable to ordering changes in the list.
   */
  finalizers?: string[];

  /**
   * GenerateName is an optional prefix, used by the server, to generate a unique name ONLY IF the
   * Name field has not been provided. If this field is used, the name returned to the client will
   * be different than the name passed. This value will also be combined with a unique suffix. The
   * provided value has the same validation rules as the Name field, and may be truncated by the
   * length of the suffix required to make the value unique on the server.  If this field is
   * specified and the generated name exists, the server will NOT return a 409 - instead, it will
   * either return 201 Created or 500 with Reason ServerTimeout indicating a unique name could not
   * be found in the time allotted, and the client should retry (optionally after the time indicated
   * in the Retry-After header). Applied only if Name is not specified.
   *
   * More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#idempotency
   */
  generateName?: string;

  /**
   * A sequence number representing a specific generation of the desired state. Populated by the
   * system.
   */
  readonly generation?: number;

  /**
   * Map of string keys and values that can be used to organize and categorize (scope and select)
   * objects. May match selectors of replication controllers and services.
   *
   * More info: http://kubernetes.io/docs/user-guide/labels
   */
  labels?: Partial<Record<string, string>>;

  /**
   * ManagedFields maps workflow-id and version to the set of fields that are managed by that
   * workflow. This is mostly for internal housekeeping, and users typically shouldn't need to set
   * or understand this field. A workflow can be the user's name, a controller's name, or the name
   * of a specific apply path like "ci-cd". The set of fields is always in the version that the
   * workflow used when modifying the object.
   */
  managedFields?: unknown[];

  /**
   * Name must be unique within a namespace. Is required when creating resources, although some
   * resources may allow a client to request the generation of an appropriate name automatically.
   * Name is primarily intended for creation idempotence and configuration definition.
   *
   * More info: http://kubernetes.io/docs/user-guide/identifiers#names
   */
  readonly name: string;

  /**
   * Namespace defines the space within which each name must be unique. An empty namespace is
   * equivalent to the "default" namespace, but "default" is the canonical representation. Not all
   * objects are required to be scoped to a namespace - the value of this field for those objects
   * will be empty.  Must be a DNS_LABEL. Cannot be updated. More info: http://kubernetes.io/docs/user-guide/namespaces
   */
  readonly namespace?: ScopedNamespace<Namespaced>;

  /**
   * List of objects depended by this object. If ALL objects in the list have been deleted, this
   * object will be garbage collected. If this object is managed by a controller, then an entry in
   * this list will point to this controller, with the controller field set to true. There cannot
   * be more than one managing controller.
   */
  ownerReferences?: OwnerReference[];

  /**
   * An opaque value that represents the internal version of this object that can be used by
   * clients to determine when objects have changed. May be used for optimistic concurrency, change
   * detection, and the watch operation on a resource or set of resources. Clients must treat these
   * values as opaque and passed unmodified back to the server. They may only be valid for a
   * particular resource or set of resources. Populated by the system. Value must be treated as
   * opaque by clients.
   *
   * More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#concurrency-control-and-consistency
   */
  readonly resourceVersion?: string;

  /**
   * SelfLink is a URL representing this object. Populated by the system.
   */
  readonly selfLink?: string;

  /**
   * UID is the unique in time and space value for this object. It is typically generated by the
   * server on successful creation of a resource and is not allowed to change on PUT operations.
   * Populated by the system.
   *
   * More info: http://kubernetes.io/docs/user-guide/identifiers#uids
   */
  readonly uid?: string;

  [key: string]: unknown;
}

export type KubeJsonApiObjectMetadata<Namespaced extends KubeObjectScope = KubeObjectScope> =
  BaseKubeJsonApiObjectMetadata<Namespaced> &
    (Namespaced extends KubeObjectScope.Namespace ? { readonly namespace: string } : {});

export type KubeObjectMetadata<Namespaced extends KubeObjectScope = KubeObjectScope> =
  KubeJsonApiObjectMetadata<Namespaced> & {
    readonly selfLink: string;
  };

export type NamespaceScopedMetadata = KubeObjectMetadata<KubeObjectScope.Namespace>;
export type ClusterScopedMetadata = KubeObjectMetadata<KubeObjectScope.Cluster>;

export interface KubeStatusData {
  kind: string;
  apiVersion: string;
  code: number;
  message?: string;
  reason?: string;
  status?: string;
}

export interface EvictionObject {
  kind: "Eviction";
  apiVersion: string | "policy/v1";
  metadata: Partial<KubeObjectMetadata>;
  deleteOptions?: {
    kind?: string;
    apiVersion?: string;
    dryRun?: string[];
    gracePeriodSeconds?: number;
    orphanDependents?: boolean;
    propagationPolicy?: string;
    preconditions?: {
      resourceVersion: string;
      uid: string;
    }[];
  };
}

export interface BaseKubeObjectCondition {
  /**
   * Last time the condition transit from one status to another.
   *
   * @type Date
   */
  lastTransitionTime?: string;
  /**
   * A human readable message indicating details about last transition.
   */
  message?: string;
  /**
   * brief (usually one word) reason for the condition's last transition.
   */
  reason?: string;
  /**
   * Status of the condition
   */
  status: "True" | "False" | "Unknown";
  /**
   * Type of the condition
   */
  type: string;
}

export interface KubeObjectStatus {
  conditions?: BaseKubeObjectCondition[];
}

export type KubeMetaField = keyof KubeJsonApiObjectMetadata;

export class KubeCreationError extends Error {
  constructor(message: string, public data: unknown) {
    super(message);
  }
}

export type LabelMatchExpression = {
  /**
   * The label key that the selector applies to.
   */
  key: string;
} & (
  | {
      /**
       * This represents the key's relationship to a set of values.
       */
      operator: "Exists" | "DoesNotExist";
      values?: undefined;
    }
  | {
      operator: "In" | "NotIn";
      /**
       * The set of values for to match according to the operator for the label.
       */
      values: string[];
    }
);

export interface Toleration {
  key?: string;
  operator?: string;
  effect?: string;
  value?: string;
  tolerationSeconds?: number;
}

export interface ObjectReference {
  apiVersion?: string;
  fieldPath?: string;
  kind?: string;
  name: string;
  namespace?: string;
  resourceVersion?: string;
  uid?: string;
}

export interface LocalObjectReference {
  name: string;
}

export interface TypedLocalObjectReference {
  apiGroup?: string;
  kind: string;
  name: string;
}

export interface NodeAffinity {
  nodeSelectorTerms?: LabelSelector[];
  weight: number;
  preference: LabelSelector;
}

export interface PodAffinity {
  labelSelector: LabelSelector;
  topologyKey: string;
}

export interface SpecificAffinity<T> {
  requiredDuringSchedulingIgnoredDuringExecution?: T[];
  preferredDuringSchedulingIgnoredDuringExecution?: T[];
}

export interface Affinity {
  nodeAffinity?: SpecificAffinity<NodeAffinity>;
  podAffinity?: SpecificAffinity<PodAffinity>;
  podAntiAffinity?: SpecificAffinity<PodAffinity>;
}

export interface LabelSelector {
  matchLabels?: Partial<Record<string, string>>;
  matchExpressions?: LabelMatchExpression[];
}

export enum KubeObjectScope {
  Namespace,
  Cluster,
}

export type ScopedNamespace<Namespaced extends KubeObjectScope> = Namespaced extends KubeObjectScope.Namespace
  ? string
  : Namespaced extends KubeObjectScope.Cluster
  ? undefined
  : string | undefined;

export interface RawKubeObject<
  Metadata extends KubeObjectMetadata = KubeObjectMetadata,
  Status = Record<string, unknown>,
  Spec = Record<string, unknown>,
> {
  apiVersion: string;
  kind: string;
  metadata: Metadata;
  status?: Status;
  spec?: Spec;
  [otherFields: string]: unknown;
}

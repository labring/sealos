/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { isObject, isString } from '@/k8slens/utilities';
import autoBind from 'auto-bind';
import type { KubeJsonApiData, KubeObjectMetadata, KubeObjectScope } from './api-types';
import { KubeCreationError } from './api-types';
import { filterOutResourceApplierAnnotations, stringifyLabels } from './utils';

export class KubeObject<
  Metadata extends KubeObjectMetadata<KubeObjectScope> = KubeObjectMetadata<KubeObjectScope>,
  Status = unknown,
  Spec = unknown
> {
  static readonly kind?: string;

  static readonly namespaced?: boolean;

  static readonly apiBase?: string;

  apiVersion!: string;

  kind!: string;

  metadata!: Metadata;

  status?: Status;

  spec!: Spec;

  /**
   * @deprecated Switch to using {@link stringifyLabels} instead
   */
  static stringifyLabels = stringifyLabels;

  constructor(data: KubeJsonApiData<Metadata, Status, Spec>) {
    if (!isObject(data)) {
      throw new TypeError(`Cannot create a KubeObject from ${typeof data}`);
    }

    if (!isObject(data.metadata)) {
      throw new KubeCreationError(
        `Cannot create a KubeObject from an object without metadata`,
        data
      );
    }

    if (!isString(data.metadata.name)) {
      throw new KubeCreationError(
        `Cannot create a KubeObject from an object without metadata.name being a string`,
        data
      );
    }

    Object.assign(this, data);
    autoBind(this);
  }

  getId(): string {
    return this.metadata.uid ?? this.metadata.selfLink;
  }

  getResourceVersion(): string {
    return this.metadata.resourceVersion ?? '';
  }

  getName(): string {
    return this.metadata.name;
  }

  getNs(): Metadata['namespace'] {
    // avoid "null" serialization via JSON.stringify when post data
    return this.metadata.namespace || undefined;
  }

  getFinalizers(): string[] {
    return this.metadata.finalizers || [];
  }

  getLabels(): string[] {
    return KubeObject.stringifyLabels(this.metadata.labels);
  }

  getAnnotations(filter = false): string[] {
    const labels = KubeObject.stringifyLabels(this.metadata.annotations);

    if (!filter) {
      return labels;
    }

    return labels.filter(filterOutResourceApplierAnnotations);
  }

  getOwnerRefs() {
    const refs = this.metadata.ownerReferences || [];
    const namespace = this.getNs();

    return refs.map((ownerRef) => ({ ...ownerRef, namespace }));
  }
}

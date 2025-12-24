/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import type { KubeObjectScope, KubeTemplateObjectMetadata } from '../api-types';
import type { PersistentVolumeClaimSpec } from '../specifics/persistent-volume-claim';

export interface PersistentVolumeClaimTemplateSpec {
  metadata?: KubeTemplateObjectMetadata<KubeObjectScope.Cluster>;
  spec?: PersistentVolumeClaimSpec;
}

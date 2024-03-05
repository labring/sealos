/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React from 'react';
import { ReactiveDuration } from '../reactive-duration';

export interface KubeObjectAgeProps {
  obj: {
    metadata: {
      creationTimestamp?: string;
    };
  };

  /**
   * Whether the display string should prefer length over precision
   * @default true
   */
  compact?: boolean;
}

export const KubeObjectAge = ({ obj, compact = true }: KubeObjectAgeProps) => (
  <ReactiveDuration timestamp={obj.metadata.creationTimestamp} compact={compact} />
);

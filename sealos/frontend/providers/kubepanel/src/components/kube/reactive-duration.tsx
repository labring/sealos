/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import React, { useEffect, useState } from 'react';
import { formatDuration } from '@/k8slens/utilities';

export interface ReactiveDurationProps {
  timestamp: string | undefined;

  /**
   * Whether the display string should prefer length over precision
   * @default true
   */
  compact?: boolean;
}

const everySecond = 1000;
const everyMinute = 60 * 1000;

/**
 * This function computes a reasonable update interval, matching `formatDuration`'s rules on when to display seconds
 */
function computeUpdateInterval(creationTimestampEpoch: number, compact: boolean): number {
  const seconds = Math.floor((Date.now() - creationTimestampEpoch) / 1000);
  const minutes = Math.floor(seconds / 60);

  if (minutes < 10) {
    return everySecond;
  }

  if (compact) {
    return everyMinute;
  }

  if (minutes < 60 * 3) {
    return everySecond;
  }

  return everyMinute;
}

export const ReactiveDuration = ({ timestamp, compact = true }: ReactiveDurationProps) => {
  if (!timestamp) {
    return <>&lt;unknown&gt;</>;
  }
  const timestampSeconds = new Date(timestamp).getTime();

  const [duration, setDuration] = useState(Date.now() - timestampSeconds);
  const [ms, setMs] = useState(computeUpdateInterval(timestampSeconds, compact));

  useEffect(() => {
    const interval = setInterval(() => {
      const nextMs = computeUpdateInterval(timestampSeconds, compact);
      if (ms !== nextMs) {
        setMs(computeUpdateInterval(timestampSeconds, compact));
        clearInterval(interval);
      }
      setDuration(Date.now() - timestampSeconds);
    }, ms);

    return () => clearInterval(interval);
  }, [compact, ms, timestampSeconds]);

  return <>{formatDuration(duration, compact)}</>;
};

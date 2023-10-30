/**
 * Copyright (c) OpenLens Authors. All rights reserved.
 * Licensed under MIT License. See LICENSE in root directory for more information.
 */

import { observer } from 'mobx-react';
import React from 'react';
import { formatDuration } from '@/k8slens/utilities';
import type { IResource } from 'mobx-utils';
import { fromResource } from 'mobx-utils';
import { _isComputingDerivation } from 'mobx';

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

export const ReactiveDuration = observer(({ timestamp, compact = true }: ReactiveDurationProps) => {
  if (!timestamp) {
    return <>{'<unknown>'}</>;
  }

  const timestampSeconds = new Date(timestamp).getTime();

  return (
    <>
      {formatDuration(
        reactiveNow(computeUpdateInterval(timestampSeconds, compact)) - timestampSeconds,
        compact
      )}
    </>
  );
});

const tickers: Record<number | string, IResource<number>> = {};
function reactiveNow(interval?: number | 'frame') {
  if (interval === void 0) {
    interval = 1000;
  }

  if (!_isComputingDerivation()) {
    // See #40
    return Date.now();
  }

  // Note: This is the kludge until https://github.com/mobxjs/mobx-utils/issues/306 is fixed
  const synchronizationIsEnabled = !process.env.JEST_WORKER_ID;

  if (!tickers[interval] || !synchronizationIsEnabled) {
    if (typeof interval === 'number') tickers[interval] = createIntervalTicker(interval);
    else tickers[interval] = createAnimationFrameTicker();
  }

  return tickers[interval].current();
}

function createIntervalTicker(interval: number) {
  let subscriptionHandle: NodeJS.Timeout;
  return fromResource(
    function (sink) {
      sink(Date.now());
      subscriptionHandle = setInterval(function () {
        return sink(Date.now());
      }, interval);
    },
    function () {
      clearInterval(subscriptionHandle);
    },
    Date.now()
  );
}

function createAnimationFrameTicker() {
  const frameBasedTicker = fromResource(
    function (sink) {
      sink(Date.now());

      function scheduleTick() {
        window.requestAnimationFrame(function () {
          sink(Date.now());
          if (frameBasedTicker.isAlive()) scheduleTick();
        });
      }
      scheduleTick();
    },
    function () {},
    Date.now()
  );

  return frameBasedTicker;
}

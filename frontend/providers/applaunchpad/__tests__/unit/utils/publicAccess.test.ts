// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { appStatusMap } from '@/constants/app';
import {
  getPublicAddressReadyResult,
  hasAvailableBackend,
  isPublicAddressAccessible
} from '@/utils/publicAccess';
import type { AppDetailType } from '@/types/app';

const makeApp = ({
  status = appStatusMap.waiting,
  availableReplicas = 0
}: {
  status?: AppDetailType['status'];
  availableReplicas?: number;
}) =>
  ({
    status,
    openapi: {
      status: {
        observedGeneration: 1,
        replicas: availableReplicas,
        availableReplicas,
        updatedReplicas: availableReplicas,
        isPause: false
      }
    }
  } as Pick<AppDetailType, 'status' | 'openapi'>);

describe('public access readiness', () => {
  it('requires a ready network and an available backend before showing accessible', () => {
    const networkStatus = { ready: true, url: 'https://app.example.com' };

    expect(
      isPublicAddressAccessible({
        app: makeApp({ status: appStatusMap.waiting, availableReplicas: 0 }),
        status: networkStatus
      })
    ).toBe(false);

    expect(
      isPublicAddressAccessible({
        app: makeApp({ status: appStatusMap.running, availableReplicas: 1 }),
        status: networkStatus
      })
    ).toBe(true);
  });

  it('treats available replicas as a usable backend even before the status label catches up', () => {
    expect(
      hasAvailableBackend(makeApp({ status: appStatusMap.creating, availableReplicas: 1 }))
    ).toBe(true);
  });

  it('treats no healthy upstream as not ready', async () => {
    const result = await getPublicAddressReadyResult(
      new Response('no healthy upstream', { status: 503 }),
      'https://app.example.com'
    );

    expect(result).toEqual({
      ready: false,
      url: 'https://app.example.com',
      error: 'Upstream not healthy'
    });
  });

  it('does not mark arbitrary non-success responses ready', async () => {
    const result = await getPublicAddressReadyResult(
      new Response('bad gateway', { status: 502 }),
      'https://app.example.com'
    );

    expect(result).toEqual({
      ready: false,
      url: 'https://app.example.com',
      error: 'HTTP 502'
    });
  });
});

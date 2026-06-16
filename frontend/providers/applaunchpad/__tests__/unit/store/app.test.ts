import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAppPodsByAppName } from '@/api/app';
import { appStatusMap } from '@/constants/app';
import { MOCK_APPS } from '@/mock/apps';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import { useAppStore } from '@/store/app';

vi.mock('@/api/app', () => ({
  getAppByName: vi.fn(),
  getAppMonitorData: vi.fn(),
  getAppPodsByAppName: vi.fn(),
  getMyApps: vi.fn()
}));

const mockedGetAppPodsByAppName = vi.mocked(getAppPodsByAppName);

describe('useAppStore intervalLoadPods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      appList: [],
      appDetail: {
        ...MOCK_APP_DETAIL,
        status: appStatusMap.error
      },
      appDetailPods: []
    });
  });

  it('keeps the app detail error status after an empty pod query completes', async () => {
    mockedGetAppPodsByAppName.mockResolvedValueOnce([]);

    await useAppStore.getState().intervalLoadPods(MOCK_APP_DETAIL.appName, true);

    expect(useAppStore.getState().appDetail?.status).toBe(appStatusMap.error);
  });

  it('keeps the app list error status after an empty pod query completes', async () => {
    useAppStore.setState({
      appList: [
        {
          ...MOCK_APPS[0],
          name: MOCK_APP_DETAIL.appName,
          status: appStatusMap.error
        }
      ],
      appDetail: {
        ...MOCK_APP_DETAIL,
        appName: 'another-app'
      },
      appDetailPods: []
    });
    mockedGetAppPodsByAppName.mockResolvedValueOnce([]);

    await useAppStore.getState().intervalLoadPods(MOCK_APP_DETAIL.appName, false);

    expect(useAppStore.getState().appList[0]?.status).toBe(appStatusMap.error);
  });
});

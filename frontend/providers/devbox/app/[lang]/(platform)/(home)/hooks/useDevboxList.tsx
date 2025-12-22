import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from '@/i18n';
import { useDevboxStore } from '@/stores/devbox';
import { useGlobalStore } from '@/stores/global';
import { isElementInViewport } from '@/utils/tools';
import { DevboxListItemTypeV2 } from '@/types/devbox';

export const useDevboxList = () => {
  const router = useRouter();
  const [refresh, setFresh] = useState(false);
  const setDevboxList = useDevboxStore((state) => state.setDevboxList);
  const loadAvgMonitorData = useDevboxStore((state) => state.loadAvgMonitorData);
  const intervalLoadPods = useDevboxStore((state) => state.intervalLoadPods);
  const isInitialized = useGlobalStore((state) => state.isInitialized);
  const isImporting = useGlobalStore((state) => state.isImporting);
  const list = useRef<DevboxListItemTypeV2[]>([]);

  const { isLoading, refetch: refetchDevboxList } = useQuery(['devboxListQuery'], setDevboxList, {
    enabled: isInitialized,
    onSettled(res) {
      if (!res) return;
      refreshList(res);
    }
  });

  const hasDataChanged = useCallback((newList: DevboxListItemTypeV2[]) => {
    if (list.current.length !== newList.length) return true;

    return newList.some((newItem, index) => {
      const oldItem = list.current[index];
      if (!oldItem) return true;

      return (
        newItem.id !== oldItem.id ||
        newItem.status.value !== oldItem.status.value ||
        newItem.name !== oldItem.name ||
        newItem.remark !== oldItem.remark ||
        JSON.stringify(newItem.usedCpu) !== JSON.stringify(oldItem.usedCpu) ||
        JSON.stringify(newItem.usedMemory) !== JSON.stringify(oldItem.usedMemory)
      );
    });
  }, []);

  const refreshList = useCallback(
    (res?: DevboxListItemTypeV2[]) => {
      const dataToCheck = res || useDevboxStore.getState().devboxList;
      if (hasDataChanged(dataToCheck)) {
        list.current = dataToCheck;
        setFresh((state) => !state);
      }
      return null;
    },
    [hasDataChanged]
  );

  const getViewportDevboxes = (minCount = 3) => {
    const devboxList = useDevboxStore.getState().devboxList;
    const doms = document.querySelectorAll('.devboxListItem');
    const viewportDomIds = Array.from(doms)
      .filter(isElementInViewport)
      .map((item) => item.getAttribute('data-id'));

    return viewportDomIds.length < minCount
      ? devboxList
      : devboxList.filter((devbox) => viewportDomIds.includes(devbox.id));
  };

  useQuery(
    ['intervalLoadPods'],
    () => {
      const viewportDevboxList = getViewportDevboxes();
      return viewportDevboxList
        .filter((devbox) => devbox.status.value !== 'Stopped')
        .map((devbox) => intervalLoadPods(devbox.name, false));
    },
    {
      refetchOnMount: true,
      refetchInterval: 3000,
      enabled: !isLoading && !isImporting,
      onSettled() {
        refreshList();
      }
    }
  );

  const { refetch: refetchAvgMonitorData } = useQuery(
    ['loadAvgMonitorData'],
    () => {
      const viewportDevboxList = getViewportDevboxes();
      return viewportDevboxList
        .filter((devbox) => devbox.status.value === 'Running')
        .map((devbox) => loadAvgMonitorData(devbox.name));
    },
    {
      refetchOnMount: true,
      refetchInterval: 2 * 60 * 1000,
      enabled: !isLoading && !isImporting,
      onSettled() {
        refreshList();
      }
    }
  );

  useEffect(() => {
    router.prefetch('/devbox/detail');
    router.prefetch('/devbox/create');
  }, [router]);

  const refetchListCallback = useCallback(() => {
    refetchDevboxList();

    // retry 3 times to fetch monitor data,because refetchDevboxList and then refetchAvgMonitorData immediately will cause monitor data be covered (devboxList refetch 3s once).
    // And monitor 2min to refetch normally,but there we retry 3 times once.
    const retryFetch = async (retryCount = 3, delay = 10 * 1000) => {
      console.log('retry');
      await refetchAvgMonitorData();

      if (retryCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        await retryFetch(retryCount - 1, delay);
      }
    };

    retryFetch();
  }, [refetchDevboxList, refetchAvgMonitorData]);

  return {
    list: list.current,
    isLoading,
    refetchList: refetchListCallback
  };
};

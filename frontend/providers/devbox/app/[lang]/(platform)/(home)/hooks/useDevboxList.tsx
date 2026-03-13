import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from '@/i18n';
import { useDevboxStore } from '@/stores/devbox';
import { useGlobalStore } from '@/stores/global';
import { isElementInViewport } from '@/utils/tools';
import { DevboxListItemTypeV2 } from '@/types/devbox';

export const useDevboxList = () => {
  const router = useRouter();
  const [list, setList] = useState<DevboxListItemTypeV2[]>([]);
  const setDevboxList = useDevboxStore((state) => state.setDevboxList);
  const loadAvgMonitorData = useDevboxStore((state) => state.loadAvgMonitorData);
  const isInitialized = useGlobalStore((state) => state.isInitialized);
  const isImporting = useGlobalStore((state) => state.isImporting);
  const prevListRef = useRef<DevboxListItemTypeV2[]>([]);

  const { isLoading, refetch: refetchDevboxList } = useQuery(['devboxListQuery'], setDevboxList, {
    enabled: isInitialized,
    refetchInterval: () => {
      const devboxList = useDevboxStore.getState().devboxList;
      const allStoppedOrShutdown = devboxList.every(
        (devbox) => devbox.status.value === 'Stopped' || devbox.status.value === 'Shutdown'
      );
      return allStoppedOrShutdown ? false : 3000;
    },
    onSettled(res) {
      if (!res) return;
      refreshList();
    }
  });

  const hasDataChanged = useCallback((newList: DevboxListItemTypeV2[]) => {
    if (prevListRef.current.length !== newList.length) return true;

    return newList.some((newItem, index) => {
      const oldItem = prevListRef.current[index];
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

  const refreshList = useCallback(() => {
    const dataToCheck = useDevboxStore.getState().devboxList;
    if (hasDataChanged(dataToCheck)) {
      prevListRef.current = dataToCheck;
      setList([...dataToCheck]);
    }
    return null;
  }, [hasDataChanged]);

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

  const { refetch: refetchAvgMonitorData } = useQuery(
    ['loadAvgMonitorData'],
    async () => {
      const viewportDevboxList = getViewportDevboxes();
      const runningDevboxes = viewportDevboxList.filter(
        (devbox) => devbox.status.value === 'Running'
      );
      await Promise.all(runningDevboxes.map((devbox) => loadAvgMonitorData(devbox.name)));
      return runningDevboxes.length;
    },
    {
      refetchOnMount: true,
      refetchInterval: () => {
        const devboxList = useDevboxStore.getState().devboxList;
        const hasRunningDevbox = devboxList.some((devbox) => devbox.status.value === 'Running');
        return hasRunningDevbox ? 2 * 60 * 1000 : false;
      },
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
    list,
    isLoading,
    refetchList: refetchListCallback
  };
};

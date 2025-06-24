import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from '@/i18n';
import { useDevboxStore } from '@/stores/devbox';
import { isElementInViewport } from '@/utils/tools';
import { useTemplateStore } from '@/stores/template';
import { DevboxListItemTypeV2 } from '@/types/devbox';

export const  useDevboxList=()=>{
  const router = useRouter();
  const [refresh, setFresh] = useState(false);
  const { isOpen: templateIsOpen } = useTemplateStore();
  const { devboxList, setDevboxList, loadAvgMonitorData, intervalLoadPods } = useDevboxStore();
  const list = useRef<DevboxListItemTypeV2[]>(devboxList);

  const { isLoading, refetch: refetchDevboxList } = useQuery(['devboxListQuery'], setDevboxList, {
    onSettled(res) {
      if (!res) return;
      refreshList(res);
    },
    enabled: !templateIsOpen
  });

  const refreshList = useCallback(
    (res = devboxList) => {
      list.current = res;
      setFresh((state) => !state);
      return null;
    },
    [devboxList]
  );

  const getViewportDevboxes = (minCount = 3) => {
    const doms = document.querySelectorAll('.devboxListItem');
    const viewportDomIds = Array.from(doms)
      .filter(isElementInViewport)
      .map((item) => item.getAttribute('data-id'));

    return viewportDomIds.length < minCount
      ? devboxList
      : devboxList.filter((devbox) => viewportDomIds.includes(devbox.id));
  };

  useQuery(
    ['intervalLoadPods', devboxList.length],
    () => {
      const viewportDevboxList = getViewportDevboxes();
      return viewportDevboxList
        .filter((devbox) => devbox.status.value !== 'Stopped')
        .map((devbox) => intervalLoadPods(devbox.name, false));
    },
    {
      refetchOnMount: true,
      refetchInterval: !templateIsOpen ? 3000 : false,
      enabled: !isLoading && !templateIsOpen,
      onSettled() {
        refreshList();
      }
    }
  );

  useQuery(
    ['refresh'],
    () => {
      refreshList();
      return null;
    },
    {
      refetchInterval: 3000
    }
  );

  const { refetch: refetchAvgMonitorData } = useQuery(
    ['loadAvgMonitorData', devboxList.length],
    () => {
      const viewportDevboxList = getViewportDevboxes();
      return viewportDevboxList
        .filter((devbox) => devbox.status.value === 'Running')
        .map((devbox) => loadAvgMonitorData(devbox.name));
    },
    {
      refetchOnMount: true,
      refetchInterval: !templateIsOpen ? 2 * 60 * 1000 : false,
      enabled: !isLoading && !templateIsOpen,
      onSettled() {
        refreshList();
      }
    }
  );

  useEffect(() => {
    router.prefetch('/devbox/detail');
    router.prefetch('/devbox/create');
  }, [router]);

  return {
    list: list.current,
    isLoading,
    refetchList: () => {
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
    }
  };
}
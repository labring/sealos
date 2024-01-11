import { APICallback, KubeStoreAction, WatchCloser } from '@/types/state';
import useNotification from 'antd/lib/notification/useNotification';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  initializers: Array<KubeStoreAction<any>['initialize']>;
  watchers: Array<KubeStoreAction<any>['watch']>;
}

export function useWatcher({ watchers, initializers }: Props) {
  const [rewatchTrigger, setRewatchTrigger] = useState(false);
  const closers = useRef<Array<WatchCloser>>([]);
  const [notifyApi, cxtHolder] = useNotification();

  const callback = useCallback<APICallback>(
    (_, e) => {
      if (e) {
        if (e.code === 410) {
          notifyApi.info({
            description: 'Resource is outdated. We will reinitialize the resource.',
            message: 'Outdated Resource'
          });
          setRewatchTrigger(!rewatchTrigger);
          return;
        }
        notifyApi.error({
          message: e.error.reason,
          description: e.error.message,
          duration: 5
        });
      }
    },
    [notifyApi, rewatchTrigger]
  );

  useEffect(() => {
    Promise.allSettled(initializers.map((initializer) => initializer(callback))).finally(() => {
      closers.current = watchers.map((watcher) => watcher(callback));
    });
  }, [initializers, watchers, callback, rewatchTrigger]);

  useEffect(() => {
    return () => {
      closers.current.forEach((closer) => {
        closer();
      });
    };
  }, []);

  return cxtHolder;
}

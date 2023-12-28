import { APICallback, KubeStoreAction, WatchCloser } from '@/types/state';
import useNotification from 'antd/lib/notification/useNotification';

import { useCallback, useEffect } from 'react';

interface Props {
  initializers: Array<KubeStoreAction<any>['initialize']>;
  watchers: Array<KubeStoreAction<any>['watch']>;
}

export function useWatcher({ watchers, initializers }: Props) {
  const [notifyApi, cxtHolder] = useNotification();

  const callback = useCallback<APICallback>(
    (_, e) => {
      if (e) {
        if (e.code === 410) {
          notifyApi.error({
            description:
              'Resource version failed to automatically update, please refresh the page.',
            message: 'Outdated Resource'
          });
          return;
        }
        notifyApi.error({
          message: e.error.reason,
          description: e.error.message,
          duration: 5
        });
      }
    },
    [notifyApi]
  );

  useEffect(() => {
    let closers: Array<WatchCloser>;
    Promise.allSettled(initializers.map((initializer) => initializer(callback))).finally(() => {
      closers = watchers.map((watcher) => watcher(callback));
    });
  }, [callback, initializers, watchers]);

  return cxtHolder;
}

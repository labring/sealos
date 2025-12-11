import { APICallback, KubeStoreAction } from '@/types/state';
import useNotification from 'antd/lib/notification/useNotification';

import { useEffect, useRef } from 'react';

interface Props {
  initializers: Array<KubeStoreAction<any>['initialize']>;
}

export function useWatcher({ initializers }: Props) {
  const [notifyApi, cxtHolder] = useNotification();
  const initializersRef = useRef(initializers);
  const hasRunRef = useRef(false);

  useEffect(() => {
    // Update the ref with the latest initializers
    initializersRef.current = initializers;
  }, [initializers]);

  useEffect(() => {
    // Only run once per component mount
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const callback: APICallback = (_, e) => {
      if (e) {
        notifyApi.error({
          message: e.error.reason,
          description: e.error.message,
          duration: 5
        });
      }
    };

    Promise.allSettled(initializersRef.current.map((initializer) => initializer(callback, true)));
  }, []); // Empty dependency array - only run once on mount

  return cxtHolder;
}

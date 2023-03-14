import { Spinner } from '@fluentui/react-components';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState, useEffect, useCallback } from 'react';
import { BuildInAction } from '../../interfaces/kubernetes';
import request from '../../services/request';
import { TApp } from '../../stores/app';
import useSessionStore from '../../stores/session';
import { cleanName } from '../../utils/strings';

export default function IframApp({ appItem, isShow }: { appItem: TApp; isShow: boolean }) {
  const Iframe = useRef<HTMLIFrameElement>(null);
  const [loadingTime, setLoadingTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const loadingTimer = useRef<any>(null);
  const session = useSessionStore((s) => s.session);

  const [url, setUrl] = useState(appItem.data?.url || '');

  const request_url =
    '/api/kubernetes/apply/' + BuildInAction.Start + '/' + cleanName(appItem.name);

  useQuery(
    ['app-info', appItem.name],
    () => request.post(request_url, { kubeconfig: session.kubeconfig }),
    {
      refetchInterval: url === '' ? 1000 : false, //轮询时间
      enabled: url === '', // 只有 url 为 '' 的时候需要请求
      onSuccess(data: any) {
        let controller = new AbortController();
        if (data?.data?.status === 200 && data?.data?.iframe_page) {
          setTimeout(() => {
            controller.abort();
          }, 5000);

          fetch(data.data.iframe_page, {
            mode: 'no-cors',
            signal: controller.signal
          })
            .then(() => {
              setUrl(data.data.iframe_page);
            })
            .catch(() => false);
        }
      }
    }
  );

  useEffect(() => {
    // open timer
    loadingTimer.current = setInterval(() => {
      setLoadingTime((state) => state + 1);
    }, 1000);

    // listen desktop keydown refresh
    const listenDesktopKeyDown = (event: KeyboardEvent) => {
      if (
        (event.keyCode === 116 || (event.ctrlKey && event.keyCode === 82)) &&
        isShow &&
        appItem.data?.url
      ) {
        setLoading(true);
        setUrl('');
        setTimeout(() => {
          setUrl(appItem.data.url);
        }, 100);
        event.preventDefault();
      }
    };
    window.addEventListener('keydown', listenDesktopKeyDown);

    return () => {
      clearInterval(loadingTimer.current);
      window.removeEventListener('keydown', listenDesktopKeyDown);
    };
  }, [appItem.data.url, isShow]);

  return (
    <div className="h-full">
      {loading && (
        <div className="h-full grid content-center">
          <Spinner label={'应用启动中... ' + loadingTime + ' 秒'} size={'large'} />
        </div>
      )}
      {!!url && (
        <iframe
          ref={Iframe}
          src={url}
          allow="camera;microphone;clipboard-write;"
          className="w-full h-full"
          frameBorder={0}
          id={`app-window-${appItem.key}`} // key format sealos.image.hub
          onLoad={() => {
            clearInterval(loadingTimer.current);
            setLoading(false);
            setLoadingTime(0);
          }}
        />
      )}
    </div>
  );
}

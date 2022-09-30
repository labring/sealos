import { Spinner } from '@fluentui/react-components';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { BuildInAction } from '../../interfaces/kubernetes';
import request from '../../services/request';
import { TApp } from '../../stores/app';
import useSessionStore from '../../stores/session';
import { cleanName } from '../../utils/strings';

export default function IframApp(props: { appItem: TApp }) {
  const { appItem } = props;
  const time = useRef(0);
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
        time.current++;
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

  return (
    <div className="h-full">
      {url === '' ? (
        <div className="h-full grid content-center">
          <Spinner label={'应用启动中... ' + time.current + ' 秒'} size={'large'} />
        </div>
      ) : (
        <iframe
          src={url}
          allow="camera;microphone"
          className="w-full h-full"
          frameBorder={0}
          id={`app-window-${appItem.name}`}
        />
      )}
    </div>
  );
}

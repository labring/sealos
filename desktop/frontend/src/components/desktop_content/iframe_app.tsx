import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { BuildInAction } from '../../interfaces/kubernetes';
import request from '../../services/request';
import useAppStore, { TApp } from '../../stores/app';
import useSessionStore from '../../stores/session';
import { cleanName } from '../../utils/strings';

export default function IframApp(props: { appItem: TApp }) {
  const { appItem } = props;
  const [interVal, setInterVal] = useState(1000);
  const time = useRef(0);
  const { updateAppInfo } = useAppStore((state) => state);
  const session = useSessionStore((s) => s.session);

  const request_url =
    '/api/kubernetes/apply/' + BuildInAction.Start + '/' + cleanName(appItem.name);
  useQuery(['user'], () => request.post(request_url, { kubeconfig: session.kubeconfig }), {
    refetchInterval: interVal, //轮询时间
    onSuccess(data: any) {
      time.current++;
      if (data?.data?.status === 200 && data?.data?.iframe_page) {
        let controller = new AbortController();
        setTimeout(() => {
          controller.abort();
        }, 5000);

        fetch(data.data.iframe_page, {
          mode: 'no-cors',
          signal: controller.signal
        })
          .then(() => {
            setInterVal(0);
            updateAppInfo({
              ...appItem,
              data: {
                url: data.data.iframe_page,
                desc: ''
              }
            });
          })
          .catch(() => false);
      }
    }
  });

  return (
    <div className="h-full">
      {appItem.data?.url === '' ? (
        <div className="h-full grid content-center">
          <Spinner
            label={'应用启动中... ' + time.current + ' 秒'}
            labelPosition="right"
            size={SpinnerSize.large}
          />
        </div>
      ) : (
        <iframe
          src={appItem.data.url}
          allow="camera;microphone"
          className="w-full h-full"
          frameBorder={0}
        />
      )}
    </div>
  );
}

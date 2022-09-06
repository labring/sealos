import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import request from 'services/request';
import useAppStore, { TApp } from 'stores/app';

export default function IframApp(props: { appItem: TApp }) {
  const { appItem } = props;
  const [interVal, setInterVal] = useState(1000);
  const time = useRef(0);
  const { updateAppInfo } = useAppStore((state) => state);
  useQuery(['user'], () => request.get('/api/mock/getAppInfo'), {
    refetchInterval: interVal, //轮询时间
    onSuccess(data: any) {
      time.current++;
      if (data?.data.url) {
        setInterVal(0);
        updateAppInfo({
          ...appItem,
          data: {
            url: data?.data?.url,
            desc: ''
          }
        });
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

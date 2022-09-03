import React, { useRef, useState } from 'react';
import useAppStore, { TApp } from 'stores/app';
import { useQuery } from '@tanstack/react-query';
import request from 'services/request';
import { Loading } from '@nextui-org/react';

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
          <Loading size="lg">
            <span className="pt-10!">应用启动中... {time.current} 秒</span>
          </Loading>
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

import { MOCK_APP_DETAIL } from '@/mock/apps';
import { useAppStore } from '@/store/app';
import { serviceSideProps } from '@/utils/i18n';
import { useLoading } from '@/hooks/useLoading';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import React, { useEffect } from 'react';
import AppBaseInfo from '@/components/app/detail/index/AppBaseInfo';
import Pods from '@/components/app/detail/index/Pods';
import DetailLayout from '@/components/layouts/DetailLayout';
import { track } from '@sealos/gtm';

const AppMainInfo = dynamic(() => import('@/components/app/detail/index/AppMainInfo'), {
  ssr: false
});

const AppDetail = ({ appName }: { appName: string }) => {
  const { appDetail = MOCK_APP_DETAIL, appDetailPods, loadDetailMonitorData } = useAppStore();
  const { Loading } = useLoading();

  useQuery(
    ['loadDetailMonitorData', appName, appDetail?.isPause],
    () => {
      if (appDetail?.isPause) return null;
      return loadDetailMonitorData(appName);
    },
    {
      refetchOnMount: true,
      refetchInterval: 2 * 60 * 1000
    }
  );

  useEffect(() => {
    track('deployment_details', {
      module: 'applaunchpad'
    });
  }, []);

  return (
    <DetailLayout appName={appName} key={'detail'}>
      <div className="flex flex-col flex-1 h-full min-h-0 overflow-y-auto scrollbar-hide">
        <div className="flex mb-1.5 rounded-lg shrink-0 min-h-[257px] gap-1.5">
          <div className="shrink-0 w-[450px]">
            <AppBaseInfo app={appDetail} />
          </div>
          <div className="flex-1">
            {appDetail ? <AppMainInfo app={appDetail} /> : <Loading loading={true} fixed={false} />}
          </div>
        </div>
        <div className="flex-1 h-fit">
          <Pods pods={appDetailPods} appName={appName} />
        </div>
      </div>
    </DetailLayout>
  );
};

export async function getServerSideProps(content: any) {
  const appName = content?.query?.name || '';

  return {
    props: {
      appName,
      ...(await serviceSideProps(content))
    }
  };
}

export default React.memo(AppDetail);

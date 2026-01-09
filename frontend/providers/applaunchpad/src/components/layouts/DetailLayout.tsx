import Sidebar, { ROUTES } from '@/components/layouts/Sidebar';
import { useToast } from '@/hooks/useToast';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import Header from '@/components/app/detail/index/Header';
import { useAppStore } from '@/store/app';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { useRouter } from 'next/router';
import { useLoading } from '@/hooks/useLoading';

interface DetailLayoutProps {
  children: React.ReactNode;
  appName: string;
}

export default function DetailLayout({ children, appName }: DetailLayoutProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { appDetail = MOCK_APP_DETAIL, setAppDetail, intervalLoadPods } = useAppStore();
  const { Loading } = useLoading();

  const {
    refetch,
    isInitialLoading: appDetailInitialLoading,
    isError: appDetailError
  } = useQuery(['setAppDetail'], () => setAppDetail(appName, router?.query?.guide === 'true'), {
    retryDelay: 3000,
    retry: (count, _err) => {
      if (count >= 5) return false;
      return true;
    },
    onError(err) {
      toast({
        title: String(err),
        status: 'error'
      });
    }
  });

  useQuery(
    ['app-detail-pod'],
    () => {
      if (appDetail?.isPause) return null;
      return intervalLoadPods(appName, true);
    },
    {
      refetchOnMount: true,
      refetchInterval: router.pathname === ROUTES.OVERVIEW ? 3000 : 5000,
      staleTime: router.pathname === ROUTES.OVERVIEW ? 3000 : 5000
    }
  );

  return (
    <div className="flex flex-col h-screen bg-zinc-50">
      <Header
        source={appDetail.source}
        appName={appName}
        appStatus={appDetail?.status}
        isPause={appDetail?.isPause}
        refetch={refetch}
      />
      <div className="relative flex-1 min-h-0 flex gap-1.5 px-6 pb-6">
        <Sidebar />

        <Loading
          loading={appDetailInitialLoading || appDetailError}
          fixed={false}
          backdropProps={{ style: { background: 'rgba(255,255,255,0.75)', borderRadius: '12px' } }}
        />
        {children}
      </div>
    </div>
  );
}

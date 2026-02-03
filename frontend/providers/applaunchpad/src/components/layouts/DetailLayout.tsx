import Sidebar, { ROUTES } from '@/components/layouts/Sidebar';
import { useToast } from '@/hooks/useToast';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import Header from '@/components/app/detail/index/Header';
import { useAppStore } from '@/store/app';
import { useQuery } from '@tanstack/react-query';
import React, { useMemo } from 'react';
import { useRouter } from 'next/router';
import { useLoading } from '@/hooks/useLoading';
import { Skeleton } from '@sealos/shadcn-ui/skeleton';

interface DetailLayoutProps {
  children: React.ReactNode;
  appName: string;
}

export default function DetailLayout({ children, appName }: DetailLayoutProps) {
  const { toast } = useToast();
  const router = useRouter();
  const {
    appDetail = MOCK_APP_DETAIL,
    appDetailPods,
    setAppDetail,
    intervalLoadPods
  } = useAppStore();
  const { Loading } = useLoading();

  const {
    refetch,
    isInitialLoading: appDetailInitialLoading,
    isError: appDetailError,
    isSuccess: appDetailLoaded
  } = useQuery(
    ['setAppDetail', appName],
    () => setAppDetail(appName, router?.query?.guide === 'true'),
    {
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
    }
  );
  const showSkeleton = appDetailInitialLoading && !appDetailError;

  useQuery(
    ['app-detail-pod', appName],
    () => {
      if (appDetail?.isPause) return null;
      return intervalLoadPods(appName, true);
    },
    {
      // Only start polling after setAppDetail has completed
      enabled: appDetailLoaded,
      refetchOnMount: true,
      refetchInterval: router.pathname === ROUTES.OVERVIEW ? 3000 : 5000,
      staleTime: router.pathname === ROUTES.OVERVIEW ? 3000 : 5000
    }
  );

  return (
    <div className="h-screen bg-zinc-50 relative flex flex-col overflow-hidden">
      <Header
        source={appDetail.source}
        appName={appName}
        appStatus={appDetail?.status}
        isPause={appDetail?.isPause}
        refetch={refetch}
        isLoading={appDetailInitialLoading}
      />
      <div className="flex-1 overflow-y-auto scrollbar-default relative flex gap-1.5 px-6 pb-6 pt-20">
        {showSkeleton ? (
          <div className="flex w-full gap-1.5">
            <div className="w-[240px] shrink-0 space-y-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <div className="flex-1 space-y-4">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          </div>
        ) : (
          <>
            <Sidebar />

            <Loading
              loading={appDetailInitialLoading || appDetailError}
              fixed={false}
              backdropProps={{
                style: { background: 'rgba(255,255,255,0.75)', borderRadius: '12px' }
              }}
            />
            {children}
          </>
        )}
      </div>
    </div>
  );
}

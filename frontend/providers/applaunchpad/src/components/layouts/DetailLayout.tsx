import Sidebar, { ROUTES } from '@/components/layouts/Sidebar';
import { useToast } from '@/hooks/useToast';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import Header from '@/components/app/detail/index/Header';
import { useAppStore } from '@/store/app';
import { Box, Flex } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
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

  const { refetch, isInitialLoading: appDetailInitialLoading } = useQuery(
    ['setAppDetail'],
    () => setAppDetail(appName, router?.query?.guide === 'true'),
    {
      retryDelay: 3000,
      retry: (_count, err) => {
        toast({
          title: String(err),
          status: 'error'
        });

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
    <Flex
      flexDirection={'column'}
      height={'100vh'}
      backgroundColor={'grayModern.100'}
      px={'16px'}
      pb={4}
    >
      <Header
        source={appDetail.source}
        appName={appName}
        appStatus={appDetail?.status}
        isPause={appDetail?.isPause}
        refetch={refetch}
      />
      <Flex position={'relative'} flex={'1 0 0'} h={0} gap={'6px'}>
        <Sidebar />

        <Loading
          loading={appDetailInitialLoading}
          fixed={false}
          backdropProps={{ background: 'rgba(255,255,255,0.75)', borderRadius: '12px' }}
        />
        {children}
      </Flex>
    </Flex>
  );
}

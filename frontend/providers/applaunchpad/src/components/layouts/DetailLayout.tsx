import Sidebar, { ROUTES } from '@/components/layouts/Sidebar';
import { useToast } from '@/hooks/useToast';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import Header from '@/components/app/detail/index/Header';
import { useAppStore } from '@/store/app';
import { useGlobalStore } from '@/store/global';
import { Flex } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/router';

interface DetailLayoutProps {
  children: React.ReactNode;
  appName: string;
}

export default function DetailLayout({ children, appName }: DetailLayoutProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { screenWidth } = useGlobalStore();
  const isLargeScreen = useMemo(() => screenWidth > 1280, [screenWidth]);

  const {
    appDetail = MOCK_APP_DETAIL,
    setAppDetail,
    intervalLoadPods,
    loadDetailMonitorData
  } = useAppStore();

  const [showSlider, setShowSlider] = useState(false);

  const { refetch } = useQuery(['setAppDetail'], () => setAppDetail(appName), {
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
        setShowSlider={setShowSlider}
        isLargeScreen={isLargeScreen}
      />
      <Flex position={'relative'} flex={'1 0 0'} h={0} gap={'6px'}>
        <Sidebar />
        {children}
      </Flex>
    </Flex>
  );
}

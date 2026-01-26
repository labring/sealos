import Sidebar, { ROUTES } from '@/components/layouts/Sidebar';
import { useToast } from '@/hooks/useToast';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import Header from '@/components/app/detail/index/Header';
import { useAppStore } from '@/store/app';
import { Box, Flex, Skeleton, SkeletonText } from '@chakra-ui/react';
import { PodStatusEnum, appStatusMap } from '@/constants/app';
import { useQuery } from '@tanstack/react-query';
import React, { useMemo } from 'react';
import { useRouter } from 'next/router';
import { useLoading } from '@/hooks/useLoading';

interface DetailLayoutProps {
  children: React.ReactNode;
  appName: string;
}

const OverviewSkeleton = () => {
  return (
    <Flex
      flexDirection={'column'}
      minH={'100%'}
      flex={'1 0 0'}
      w={0}
      overflowY={'auto'}
      overflowX={'hidden'}
    >
      <Flex mb={'6px'} borderRadius={'lg'} flexShrink={0} minH={'257px'} gap={'6px'}>
        <Box flexShrink={0} w="408px" bg={'white'} borderRadius={'8px'} px="32px" py="24px">
          <Skeleton h="18px" w="160px" mb="14px" />
          <SkeletonText noOfLines={9} spacing="10px" skeletonHeight="12px" />
        </Box>
        <Box flex="1" bg={'white'} borderRadius={'8px'} px="24px" py="24px">
          <Skeleton h="18px" w="220px" mb="14px" />
          <SkeletonText noOfLines={10} spacing="10px" skeletonHeight="12px" />
        </Box>
      </Flex>
      <Box bg={'white'} borderRadius={'8px'} mb={'6px'} px="32px" py="18px">
        <Skeleton h="16px" w="220px" mb="12px" />
        <SkeletonText noOfLines={3} spacing="10px" skeletonHeight="12px" />
      </Box>
      <Box bg={'white'} borderRadius={'lg'} flex={1} px="24px" py="18px">
        <Skeleton h="16px" w="160px" mb="14px" />
        <SkeletonText noOfLines={8} spacing="10px" skeletonHeight="12px" />
      </Box>
    </Flex>
  );
};

const MonitorSkeleton = () => {
  return (
    <Box
      minH={'100%'}
      flex={'1 0 0'}
      bg="white"
      borderRadius="8px"
      py={'16px'}
      px={'24px'}
      overflow={'auto'}
    >
      <Skeleton h="20px" w="240px" mb="20px" />
      <Skeleton h="14px" w="120px" mb="12px" />
      <Skeleton h="242px" w="100%" borderRadius="8px" mb="24px" />
      <Skeleton h="14px" w="120px" mb="12px" />
      <Skeleton h="242px" w="100%" borderRadius="8px" mb="24px" />
      <Skeleton h="14px" w="140px" mb="12px" />
      <Skeleton h="242px" w="100%" borderRadius="8px" />
    </Box>
  );
};

const LogsSkeleton = () => {
  return (
    <Box minH={'100%'} flex={'1 0 0'} bg="white" borderRadius="8px" py={'16px'} px={'24px'}>
      <Skeleton h="20px" w="220px" mb="16px" />
      <Skeleton h="36px" w="100%" borderRadius="8px" mb="16px" />
      <Skeleton h="24px" w="160px" mb="12px" />
      <Skeleton h="360px" w="100%" borderRadius="8px" />
    </Box>
  );
};

const DetailContentSkeleton = ({ pathname }: { pathname: string }) => {
  if (pathname === ROUTES.MONITOR) return <MonitorSkeleton />;
  if (pathname === ROUTES.LOGS) return <LogsSkeleton />;
  return <OverviewSkeleton />;
};

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
    isFetching: appDetailFetching
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

  const computedAppStatus = useMemo(() => {
    // Prefer deriving status from pods to avoid flashing backend/mock status.
    if (!appDetailPods || appDetailPods.length === 0) return appStatusMap.waiting;

    const runningCount = appDetailPods.filter(
      (pod) => pod.status?.value === PodStatusEnum.running
    ).length;
    const terminatedCount = appDetailPods.filter(
      (pod) => pod.status?.value === PodStatusEnum.terminated
    ).length;
    const allTerminated = appDetailPods.length > 0 && terminatedCount === appDetailPods.length;

    if (runningCount > 0) return appStatusMap.running;
    if (allTerminated) return appStatusMap.error;
    return appStatusMap.creating;
  }, [appDetailPods]);

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

  const remoteStoreAmount =
    appDetail?.storeList?.filter((store) => store.storageType === 'remote').length || 0;

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
        appStatus={computedAppStatus}
        isPause={appDetail?.isPause}
        refetch={refetch}
        remoteStoreAmount={remoteStoreAmount}
        isLoading={appDetailInitialLoading}
      />
      <Flex position={'relative'} flex={'1 0 0'} h={0} gap={'6px'}>
        <Sidebar />

        <Loading
          loading={appDetailError || (appDetailFetching && !appDetailInitialLoading)}
          fixed={false}
          backdropProps={{ background: 'rgba(255,255,255,0.75)', borderRadius: '12px' }}
        />
        {appDetailInitialLoading ? (
          <DetailContentSkeleton pathname={router.pathname} />
        ) : (
          <>{children}</>
        )}
      </Flex>
    </Flex>
  );
}

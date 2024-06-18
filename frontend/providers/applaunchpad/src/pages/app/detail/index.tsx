import useDetailDriver from '@/hooks/useDetailDriver';
import { useLoading } from '@/hooks/useLoading';
import { useToast } from '@/hooks/useToast';
import { MOCK_APP_DETAIL } from '@/mock/apps';
import { useAppStore } from '@/store/app';
import { useGlobalStore } from '@/store/global';
import { serviceSideProps } from '@/utils/i18n';
import { Box, Flex, useTheme } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import React, { useMemo, useState } from 'react';
import AppBaseInfo from './components/AppBaseInfo';
import Header from './components/Header';
import Pods from './components/Pods';

const AppMainInfo = dynamic(() => import('./components/AppMainInfo'), { ssr: false });

const AppDetail = ({ appName }: { appName: string }) => {
  const { startGuide } = useDetailDriver();
  const theme = useTheme();
  const { toast } = useToast();
  const { Loading } = useLoading();
  const { screenWidth } = useGlobalStore();
  const isLargeScreen = useMemo(() => screenWidth > 1280, [screenWidth]);
  const {
    appDetail = MOCK_APP_DETAIL,
    setAppDetail,
    appDetailPods,
    intervalLoadPods,
    loadDetailMonitorData
  } = useAppStore();

  const [podsLoaded, setPodsLoaded] = useState(false);
  const [showSlider, setShowSlider] = useState(false);

  const { refetch, isSuccess } = useQuery(['setAppDetail'], () => setAppDetail(appName), {
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
      refetchInterval: 3000,
      onSettled() {
        setPodsLoaded(true);
      }
    }
  );

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

  return (
    <Flex
      flexDirection={'column'}
      height={'100vh'}
      backgroundColor={'grayModern.100'}
      px={'32px'}
      pb={4}
    >
      <Box>
        <Header
          labels={appDetail?.labels || {}}
          appName={appName}
          appStatus={appDetail?.status}
          isPause={appDetail?.isPause}
          refetch={refetch}
          setShowSlider={setShowSlider}
          isLargeScreen={isLargeScreen}
        />
      </Box>
      <Flex position={'relative'} flex={'1 0 0'} h={0}>
        <Box
          h={'100%'}
          flex={'0 0 410px'}
          w={'410px'}
          mr={4}
          overflow={'overlay'}
          zIndex={1}
          transition={'0.4s'}
          bg={'white'}
          border={theme.borders.base}
          borderRadius={'lg'}
          {...(isLargeScreen
            ? {}
            : {
                position: 'absolute',
                left: 0,
                boxShadow: '7px 4px 12px rgba(165, 172, 185, 0.25)',
                transform: `translateX(${showSlider ? '0' : '-500'}px)`
              })}
        >
          {appDetail ? <AppBaseInfo app={appDetail} /> : <Loading loading={true} fixed={false} />}
        </Box>
        <Flex flexDirection={'column'} minH={'100%'} flex={'1 0 0'} w={0} overflow={'overlay'}>
          <Box
            mb={4}
            bg={'white'}
            border={theme.borders.base}
            borderRadius={'lg'}
            flexShrink={0}
            minH={'257px'}
          >
            {appDetail ? <AppMainInfo app={appDetail} /> : <Loading loading={true} fixed={false} />}
          </Box>
          <Box
            bg={'white'}
            border={theme.borders.base}
            borderRadius={'lg'}
            h={0}
            flex={1}
            minH={'300px'}
          >
            <Pods pods={appDetailPods} appName={appName} loading={!podsLoaded} />
          </Box>
        </Flex>
      </Flex>
      {/* mask */}
      {!isLargeScreen && showSlider && (
        <Box
          position={'fixed'}
          top={0}
          left={0}
          right={0}
          bottom={0}
          onClick={() => setShowSlider(false)}
        />
      )}
    </Flex>
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

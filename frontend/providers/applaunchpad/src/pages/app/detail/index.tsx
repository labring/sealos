import React, { useMemo, useState } from 'react';
import { Box, Flex, Card, useTheme } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/app';
import { useToast } from '@/hooks/useToast';
import { useLoading } from '@/hooks/useLoading';
import { useGlobalStore } from '@/store/global';
import Header from './components/Header';
import AppBaseInfo from './components/AppBaseInfo';
import Pods from './components/Pods';
import dynamic from 'next/dynamic';
import { MOCK_APP_DETAIL } from '@/mock/apps';

const AppMainInfo = dynamic(() => import('./components/AppMainInfo'), { ssr: false });

const AppDetail = ({ appName }: { appName: string }) => {
  const theme = useTheme();
  const { toast } = useToast();
  const { Loading } = useLoading();
  const { screenWidth } = useGlobalStore();
  const isLargeScreen = useMemo(() => screenWidth > 1280, [screenWidth]);
  const {
    appDetail = MOCK_APP_DETAIL,
    setAppDetail,
    appDetailPods,
    intervalLoadPods
  } = useAppStore();
  const [podsLoaded, setPodsLoaded] = useState(false);
  const [showSlider, setShowSlider] = useState(false);

  const { refetch } = useQuery(['setAppDetail'], () => setAppDetail(appName), {
    onError(err) {
      toast({
        title: String(err),
        status: 'error'
      });
    }
  });

  // interval get pods metrics
  useQuery(
    ['intervalLoadPods'],
    () => {
      if (appDetail?.isPause) return null;
      return intervalLoadPods(appName);
    },
    {
      refetchOnMount: true,
      refetchInterval: 3000,
      onSettled() {
        setPodsLoaded(true);
      }
    }
  );

  return (
    <Flex flexDirection={'column'} height={'100vh'} backgroundColor={'#F7F8FA'} px={9} pb={4}>
      <Box>
        <Header
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
          overflowY={'auto'}
          zIndex={1}
          transition={'0.4s'}
          bg={'white'}
          border={theme.borders.sm}
          borderRadius={'md'}
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
        <Flex flexDirection={'column'} h={'100%'} flex={'1 0 0'} w={0}>
          <Box mb={4} bg={'white'} border={theme.borders.sm} borderRadius={'md'} minH={'257px'}>
            {appDetail ? <AppMainInfo app={appDetail} /> : <Loading loading={true} fixed={false} />}
          </Box>
          <Box
            bg={'white'}
            border={theme.borders.sm}
            borderRadius={'md'}
            flex={'1 0 0'}
            h={0}
            overflowY={'auto'}
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

export default AppDetail;

export async function getServerSideProps(context: any) {
  const appName = context.query?.name || '';

  return {
    props: { appName }
  };
}

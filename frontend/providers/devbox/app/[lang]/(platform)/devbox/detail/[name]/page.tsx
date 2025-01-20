'use client';

import { Box, Flex } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useLoading } from '@/hooks/useLoading';
import BasicInfo from './components/BasicInfo';
import Header from './components/Header';
import MainBody from './components/MainBody';
import Version from './components/Version';

import { useDevboxStore } from '@/stores/devbox';
import { useEnvStore } from '@/stores/env';
import { useGlobalStore } from '@/stores/global';
import useDetailDriver from '@/hooks/useDetailDriver';

const DevboxDetailPage = ({ params }: { params: { name: string } }) => {
  const devboxName = params.name;
  const { Loading } = useLoading();
  const { handleUserGuide } = useDetailDriver();

  const { env } = useEnvStore();
  const { screenWidth } = useGlobalStore();
  const { devboxDetail, setDevboxDetail, loadDetailMonitorData, intervalLoadPods } =
    useDevboxStore();

  const [showSlider, setShowSlider] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const isLargeScreen = useMemo(() => screenWidth > 1280, [screenWidth]);

  const { refetch, data } = useQuery(
    ['initDevboxDetail'],
    () => setDevboxDetail(devboxName, env.sealosDomain),
    {
      onSettled() {
        setInitialized(true);
      },
      onSuccess: () => {
        handleUserGuide();
      }
    }
  );
  useQuery(
    ['devbox-detail-pod'],
    () => {
      if (devboxDetail?.isPause) return null;
      return intervalLoadPods(devboxName, true);
    },
    {
      enabled: !devboxDetail?.isPause,
      refetchOnMount: true,
      refetchInterval: 3000
    }
  );

  useQuery(
    ['loadDetailMonitorData', devboxName, devboxDetail?.isPause],
    () => {
      if (devboxDetail?.isPause) return null;
      return loadDetailMonitorData(devboxName);
    },
    {
      refetchOnMount: true,
      refetchInterval: 2 * 60 * 1000
    }
  );
  return (
    <Flex p={5} h={'100vh'} px={'32px'} flexDirection={'column'}>
      <Loading loading={!initialized} />
      {devboxDetail && initialized && (
        <>
          <Box mb={6}>
            <Header
              refetchDevboxDetail={refetch}
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
              borderWidth={1}
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
              <BasicInfo />
            </Box>
            <Flex
              flexDirection={'column'}
              minH={'100%'}
              flex={'1 0 0'}
              w={0}
              overflow={'overlay'}
              sx={{
                '&::-webkit-scrollbar': {
                  display: 'none'
                },
                msOverflowStyle: 'none', // IE and Edge
                scrollbarWidth: 'none' // Firefox
              }}
            >
              <Box mb={4} bg={'white'} borderRadius={'lg'} flexShrink={0} minH={'257px'}>
                <MainBody />
              </Box>
              <Box bg={'white'} borderRadius={'lg'} flex={'1'}>
                <Version />
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
        </>
      )}
    </Flex>
  );
};

export default DevboxDetailPage;

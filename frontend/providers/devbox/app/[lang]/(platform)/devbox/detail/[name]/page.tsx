'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Box, Flex } from '@chakra-ui/react'

import Header from './components/Header'
import Version from './components/Version'
import MainBody from './components/MainBody'
import BasicInfo from './components/BasicInfo'
import { useLoading } from '@/hooks/useLoading'
import { useDevboxStore } from '@/stores/devbox'
import { useGlobalStore } from '@/stores/global'

const DevboxDetailPage = ({ params }: { params: { name: string } }) => {
  const devboxName = params.name
  const { Loading } = useLoading()
  const [initialized, setInitialized] = useState(false)
  const { devboxDetail, setDevboxDetail, loadDetailMonitorData } = useDevboxStore()
  const { screenWidth } = useGlobalStore()
  const [showSlider, setShowSlider] = useState(false)
  const isLargeScreen = useMemo(() => screenWidth > 1280, [screenWidth])

  const { refetch } = useQuery(['initDevboxDetail'], () => setDevboxDetail(devboxName), {
    refetchOnMount: true,
    refetchInterval: 1 * 60 * 1000,
    onSettled() {
      setInitialized(true)
    },
    onSuccess: (data) => {
      if (data) {
        loadDetailMonitorData(data.name)
      }
    }
  })

  useQuery(
    ['loadDetailMonitorData', devboxName, devboxDetail?.isPause],
    () => {
      if (devboxDetail?.isPause) return null
      return loadDetailMonitorData(devboxName)
    },
    {
      refetchOnMount: true,
      refetchInterval: 2 * 60 * 1000
    }
  )

  return (
    <Flex p={5} h={'100vh'} px={'32px'} flexDirection={'column'}>
      <Loading loading={!initialized} />
      {devboxDetail !== null && initialized && (
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
              borderRadius={'lg'}
              {...(isLargeScreen
                ? {}
                : {
                    position: 'absolute',
                    left: 0,
                    boxShadow: '7px 4px 12px rgba(165, 172, 185, 0.25)',
                    transform: `translateX(${showSlider ? '0' : '-500'}px)`
                  })}>
              <BasicInfo />
            </Box>
            <Flex flexDirection={'column'} minH={'100%'} flex={'1 0 0'} w={0} overflow={'overlay'}>
              <Box mb={4} bg={'white'} borderRadius={'lg'} flexShrink={0} minH={'257px'}>
                <MainBody />
              </Box>
              <Box bg={'white'} borderRadius={'lg'} h={0} flex={1} minH={'300px'}>
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
  )
}

export default DevboxDetailPage

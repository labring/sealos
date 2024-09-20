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
    <Box p={5} h={'100vh'} {...(isLargeScreen ? { minH: '100%' } : {})}>
      <Loading loading={!initialized} />
      {devboxDetail !== null && initialized && (
        <>
          <Box mb={6}>
            <Header refetchDevboxDetail={refetch} />
          </Box>
          <Flex gap={4} px={4} {...(isLargeScreen ? { minH: '90%' } : { minH: '90%' })}>
            <Flex w={'435px'} flexShrink={0} flexGrow={0}>
              <BasicInfo />
            </Flex>
            <Flex gap={2} flexDirection={'column'} flexGrow={1}>
              <MainBody />
              <Version />
            </Flex>
          </Flex>
        </>
      )}
    </Box>
  )
}

export default DevboxDetailPage

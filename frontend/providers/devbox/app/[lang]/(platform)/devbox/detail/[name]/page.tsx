'use client'

import { Box, Flex, Grid } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import Header from './components/Header'
import { useDevboxStore } from '@/stores/devbox'
import { useQuery } from '@tanstack/react-query'
import Version from './components/Version'
import { useLoading } from '@/hooks/useLoading'
import BasicInfo from './components/BasicInfo'
import MainBody from './components/MainBody'
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
          <Grid
            pl={4}
            templateColumns="1fr 2fr"
            gap={4}
            {...(isLargeScreen ? { minH: '90%' } : { minH: '60vh' })}>
            <BasicInfo />
            <Flex gap={2} flexDirection={'column'}>
              <MainBody />
              <Version />
            </Flex>
          </Grid>
        </>
      )}
    </Box>
  )
}

export default DevboxDetailPage

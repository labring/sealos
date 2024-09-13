'use client'

import { Box, Flex, Grid } from '@chakra-ui/react'
import { useState } from 'react'
import Header from './components/Header'
import { useDevboxStore } from '@/stores/devbox'
import { useQuery } from '@tanstack/react-query'
import Version from './components/Version'
import { useLoading } from '@/hooks/useLoading'
import BasicInfo from './components/BasicInfo'
import MainBody from './components/MainBody'

const DevboxDetailPage = ({ params }: { params: { name: string } }) => {
  const devboxName = params.name
  const { Loading } = useLoading()
  const [initialized, setInitialized] = useState(false)
  const { devboxDetail, setDevboxDetail, loadDetailMonitorData } = useDevboxStore()

  const { refetch } = useQuery(['initDevboxDetail'], () => setDevboxDetail(devboxName), {
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
    <Box p={5} bg={'#F4F4F7'} h={'100vh'}>
      <Loading loading={!initialized} />
      {devboxDetail !== null && initialized && (
        <>
          <Box mb={6}>
            <Header refetchDevboxDetail={refetch} />
          </Box>
          <Grid templateColumns="1fr 2fr" minH={'60vh'} gap={4}>
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

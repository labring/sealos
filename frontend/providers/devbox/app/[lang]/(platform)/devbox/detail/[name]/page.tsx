'use client'

import { Box, Grid, GridItem } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import Header from './components/Header'
import { useDevboxStore } from '@/stores/devbox'
import { useQuery } from '@tanstack/react-query'
import Version from './components/Version'
import { useLoading } from '@/hooks/useLoading'
import Status from './components/Status'
import MainBody from './components/MainBody'

const DevboxDetailPage = ({ params }: { params: { name: string } }) => {
  const devboxName = params.name
  const { Loading } = useLoading()
  const [initialized, setInitialized] = useState(false)
  const { devboxDetail, setDevboxDetail } = useDevboxStore()

  const { refetch } = useQuery(['initDevboxDetail'], () => setDevboxDetail(devboxName), {
    refetchInterval: 3000,
    onSettled() {
      setInitialized(true)
    }
  })

  return (
    <Box p={5} bg={'#F4F4F7'} h={'100vh'}>
      <Loading loading={!initialized} />
      {devboxDetail !== null && initialized && (
        <>
          <Box mb={6}>
            <Header refetchDevboxDetail={refetch} />
            <Status />
          </Box>
          <Grid templateColumns="2fr 1fr" minH={'60vh'}>
            <MainBody />
            <Version devbox={devboxDetail} />
          </Grid>
        </>
      )}
    </Box>
  )
}

export default DevboxDetailPage

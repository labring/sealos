'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import Empty from './components/Empty'
import { useLoading } from '@/hooks/useLoading'
import { useDevboxStore } from '@/stores/devbox'
import DevboxList from './components/DevboxList'

const EmptyPage = () => {
  const { Loading } = useLoading()
  const { devboxList, setDevboxList } = useDevboxStore()
  const [initialized, setInitialized] = useState(false)
  const { refetch } = useQuery(['initDevboxData'], setDevboxList, {
    refetchInterval: 3000,
    onSettled() {
      setInitialized(true)
    }
  })
  return (
    <>
      {devboxList.length === 0 && initialized ? (
        <Empty />
      ) : (
        <>
          <DevboxList devboxList={devboxList} refetchDevboxList={refetch} />
        </>
      )}
      <Loading loading={!initialized} />
    </>
  )
}

export default EmptyPage

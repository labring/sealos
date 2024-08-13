'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import Empty from './components/Empty'
import DevboxList from './components/DevboxList'
import { useLoading } from '@/hooks/useLoading'
import { useDevboxStore } from '@/stores/devbox'

const EmptyPage = () => {
  const { Loading } = useLoading()
  const { devboxList, setDevboxList } = useDevboxStore()
  const [initialized, setInitialized] = useState(false)
  const { refetch } = useQuery(['initDevboxData'], setDevboxList, {
    // refetchInterval: 3000,
    // NOTE: 注意开发模式我就不一直重新获取了
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
          <DevboxList devboxList={devboxList} refetchApps={refetch} />
        </>
      )}
      <Loading loading={!initialized} />
    </>
  )
}

export default EmptyPage

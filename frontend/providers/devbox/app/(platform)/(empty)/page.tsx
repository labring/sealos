'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import Empty from './components/empty'
import DBList from './components/dbList'
import { useDevboxStore } from '@/store/devbox'
import { useLoading } from '@/hooks/useLoading'

const EmptyPage = () => {
  const { Loading } = useLoading()
  // const { dbList, setDBList } = useDevboxStore() //TODO
  const [initialized, setInitialized] = useState(false)

  // const { refetch } = useQuery(['initDbData'], setDBList, {
  //   refetchInterval: 3000,
  //   onSettled() {
  //     setInitialized(true)
  //   }
  // })

  return (
    // <>
    //   {dbList.length === 0 && initialized ? (
    //     <Empty />
    //   ) : (
    //     <>
    //       <DBList dbList={dbList} refetchApps={refetch} />
    //     </>
    //   )}
    //   <Loading loading={!initialized} />
    // </>
    <Empty />
  )
}

export default EmptyPage

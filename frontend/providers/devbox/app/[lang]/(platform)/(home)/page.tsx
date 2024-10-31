'use client'

import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'

import Empty from './components/Empty'
import DevboxList from './components/DevboxList'

import { useLoading } from '@/hooks/useLoading'
import { useDevboxStore } from '@/stores/devbox'
import { isElementInViewport } from '@/utils/tools'
import { DevboxListItemType } from '@/types/devbox'

const EmptyPage = () => {
  const router = useRouter()
  const { Loading } = useLoading()
  const { devboxList, setDevboxList, loadAvgMonitorData, intervalLoadPods } = useDevboxStore()

  const [_, setFresh] = useState(false)
  const list = useRef<DevboxListItemType[]>(devboxList)

  const refreshList = useCallback(
    (res = devboxList) => {
      list.current = res
      setFresh((state) => !state)
      return null
    },
    [devboxList]
  )

  const { isLoading, refetch: refetchDevboxList } = useQuery(['devboxListQuery'], setDevboxList, {
    onSettled(res) {
      if (!res) return
      refreshList(res)
    }
  })

  useQuery(
    ['intervalLoadPods', devboxList.length],
    () => {
      const doms = document.querySelectorAll(`.devboxListItem`)
      const viewportDomIds = Array.from(doms)
        .filter((item) => isElementInViewport(item))
        .map((item) => item.getAttribute('data-id'))

      const viewportDevboxList =
        viewportDomIds.length < 3
          ? devboxList
          : devboxList.filter((devbox) => viewportDomIds.includes(devbox.id))

      return viewportDevboxList
        .filter((devbox) => devbox.status.value !== 'Stopped')
        .map((devbox) => {
          return () => intervalLoadPods(devbox.name, false)
        })
    },
    {
      refetchOnMount: true,
      refetchInterval: 3000,
      onSettled() {
        refreshList()
      }
    }
  )

  useQuery(
    ['refresh'],
    () => {
      refreshList()
      return null
    },
    {
      refetchInterval: 3000
    }
  )

  const { refetch: refetchAvgMonitorData } = useQuery(
    ['loadAvgMonitorData', devboxList.length],
    () => {
      const doms = document.querySelectorAll('.devboxListItem')
      const viewportDomIds = Array.from(doms)
        .filter((dom) => isElementInViewport(dom))
        .map((dom) => dom.getAttribute('data-id'))

      const viewportDevboxList =
        viewportDomIds.length < 3
          ? devboxList
          : devboxList.filter((devbox) => viewportDomIds.includes(devbox.id))

      // TODO: reference applaunchpad to request rhythmically
      return viewportDevboxList
        .filter((devbox) => devbox.status.value === 'Running')
        .map((devbox) => loadAvgMonitorData(devbox.name))
    },
    {
      refetchOnMount: true,
      refetchInterval: 2 * 60 * 1000,
      onError(err) {
        console.log(err)
      },
      onSettled() {
        refreshList()
      }
    }
  )

  useEffect(() => {
    router.prefetch('/devbox/detail')
    router.prefetch('/devbox/create')
  }, [router])

  return (
    <>
      {devboxList.length === 0 && !isLoading ? (
        <Empty />
      ) : (
        <>
          <DevboxList
            devboxList={list.current}
            refetchDevboxList={() => {
              refetchDevboxList()
              refetchAvgMonitorData()
            }}
          />
        </>
      )}
      <Loading loading={isLoading} />
    </>
  )
}

export default EmptyPage

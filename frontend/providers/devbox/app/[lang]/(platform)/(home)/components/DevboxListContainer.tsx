// components/DevboxListContainer.tsx
'use client'
import { useLoading } from '@/hooks/useLoading'
import { useDevboxStore } from '@/stores/devbox'
import { useTemplateStore } from '@/stores/template'
import { DevboxListItemTypeV2 } from '@/types/devbox'
import { isElementInViewport } from '@/utils/tools'
import { Box } from '@chakra-ui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'
import DevboxHeader from './DevboxHeader'
import DevboxList from './DevboxList'
import Empty from './Empty'

function useDevboxList() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { devboxList, setDevboxList, loadAvgMonitorData, intervalLoadPods } = useDevboxStore()
  const { isOpen: templateIsOpen } = useTemplateStore()
  const list = useRef<DevboxListItemTypeV2[]>(devboxList)

  const refreshList = useCallback(
    (res = devboxList) => {
      list.current = res
      queryClient.invalidateQueries(['intervalLoadPods'])
      queryClient.invalidateQueries(['loadAvgMonitorData'])
    },
    [devboxList, queryClient]
  )

  const { isLoading, refetch: refetchDevboxList } = useQuery(
    ['devboxListQuery'],
    setDevboxList,
    {
      onSettled(res) {
        if (!res) return
        refreshList(res)
      }
    }
  )
  const getViewportDevboxes = useCallback((minCount = 3) => {
    const doms = document.querySelectorAll('.devboxListItem')
    const viewportDomIds = Array.from(doms)
      .filter((item) => isElementInViewport(item))
      .map((item) => item.getAttribute('data-id'))

    const viewportDevboxes = viewportDomIds.length < minCount
      ? devboxList
      : devboxList.filter((devbox) => viewportDomIds.includes(devbox.id))
    return viewportDevboxes
  }, [devboxList])

  useQuery(
    ['intervalLoadPods'],
    () => {
      console.log('intervalLoadPods')
      const viewportDevboxList = getViewportDevboxes()
      return viewportDevboxList
        .filter((devbox) => devbox.status.value !== 'Stopped')
        .map((devbox) => intervalLoadPods(devbox.name, false))
    },
    {
      refetchOnMount: true,
      refetchInterval: !templateIsOpen ? 3000 : false,
    }
  )

  const { refetch: refetchAvgMonitorData } = useQuery(
    ['loadAvgMonitorData'],
    () => {
      console.log('loadAvgMonitorData')
      const viewportDevboxList = getViewportDevboxes()
      return viewportDevboxList
        .filter((devbox) => devbox.status.value === 'Running')
        .map((devbox) => loadAvgMonitorData(devbox.name))
    },
    {
      refetchInterval: !templateIsOpen ? 5000 : false,
    }
  )

  // 路由预加载
  useEffect(() => {
    router.prefetch('/devbox/detail')
    router.prefetch('/devbox/create')
  }, [router])

  return {
    list: list.current,
    isLoading,
    refetchList: useCallback(() => {
      queryClient.invalidateQueries(['devboxListQuery'])
    }, [queryClient])
  }
}

export default function DevboxListContainer() {
  const { Loading } = useLoading()
  const { list, isLoading, refetchList } = useDevboxList()
  return (
    <Box backgroundColor={'grayModern.100'} px={'32px'} minH="100vh">
      <DevboxHeader listLength={list.length} />
      {list.length === 0 && !isLoading ? (
        <Empty />
      ) : (
        <DevboxList
          devboxList={list}
          refetchDevboxList={refetchList}
        />
      )}
      <Loading loading={isLoading} />
    </Box>
  )
}
'use client'

import dynamic from 'next/dynamic'
import debounce from 'lodash/debounce'
import { useMessage } from '@sealos/ui'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { Box, Flex } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'

import Form from './components/Form'
import Yaml from './components/Yaml'
import Header from './components/Header'
import type { YamlItemType } from '@/types'
import { useUserStore } from '@/stores/user'
import { useGlobalStore } from '@/stores/global'
import { useConfirm } from '@/hooks/useConfirm'
import { useLoading } from '@/hooks/useLoading'
import { runtimeVersionMap } from '@/stores/static'
import type { DevboxEditType } from '@/types/devbox'
import { applyYamlList, createDevbox } from '@/api/devbox'
import { defaultDevboxEditValue } from '@/constants/devbox'
import { json2Account, json2CreateCluster, limitRangeYaml } from '@/utils/json2Yaml'

const ErrorModal = dynamic(() => import('@/components/modals/ErrorModal'))

const defaultEdit = {
  ...defaultDevboxEditValue,
  runtimeVersion: runtimeVersionMap.java[0]?.id
}

const DevboxCreatePage = ({ formType }: { formType?: 'form' | 'yaml' }) => {
  const router = useRouter()
  const { message: toast } = useMessage()
  const { checkQuotaAllow } = useUserStore()
  const { Loading, setIsLoading } = useLoading()
  const [errorMessage, setErrorMessage] = useState('')
  const [forceUpdate, setForceUpdate] = useState(false)
  const [yamlList, setYamlList] = useState<YamlItemType[]>([])
  const { openConfirm, ConfirmChild } = useConfirm({
    content: '确认创建项目？'
  })

  // compute container width
  const { screenWidth, lastRoute } = useGlobalStore()

  const pxVal = useMemo(() => {
    const val = Math.floor((screenWidth - 1050) / 2)
    if (val < 20) {
      return 20
    }
    return val
  }, [screenWidth])

  const formHook = useForm<DevboxEditType>({
    defaultValues: defaultEdit
  })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const formOnchangeDebounce = useCallback(
    debounce((data: DevboxEditType) => {
      try {
        setYamlList(generateYamlList(data))
      } catch (error) {
        console.log(error)
      }
    }, 200),
    []
  )
  // watch form change, compute new yaml
  formHook.watch((data) => {
    data && formOnchangeDebounce(data as DevboxEditType)
    setForceUpdate(!forceUpdate)
  })

  // TODO: 这里可能有点问题
  const generateYamlList = (data: DevboxEditType) => {
    return [
      {
        filename: 'cluster.yaml',
        value: json2CreateCluster(data)
      }
    ]
  }

  useQuery(['initDevboxCreateData'], () => {
    setYamlList([
      {
        filename: 'cluster.yaml',
        value: json2CreateCluster(defaultEdit)
      },
      {
        filename: 'account.yaml',
        value: json2Account(defaultEdit)
      }
    ])
    return null
  })

  const submitSuccess = async (formData: DevboxEditType) => {
    setIsLoading(true)
    try {
      await applyYamlList([limitRangeYaml], 'create')
    } catch (err) {}
    try {
      // quote check
      // NOTE: 其实这个限额检查可能不需要了
      const quoteCheckRes = checkQuotaAllow(formData)
      if (quoteCheckRes) {
        setIsLoading(false)
        return toast({
          status: 'warning',
          title: quoteCheckRes,
          duration: 5000,
          isClosable: true
        })
      }
      await createDevbox({ devboxForm: formData })
      toast({
        title: '创建成功',
        status: 'success'
      })
      router.push(lastRoute)
    } catch (error) {
      console.error(error)
      setErrorMessage(JSON.stringify(error))
    }
    setIsLoading(false)
  }

  const submitError = useCallback(() => {
    // deep search message
    const deepSearch = (obj: any): string => {
      if (!obj || typeof obj !== 'object') return '提交表单错误'
      if (!!obj.message) {
        return obj.message
      }
      return deepSearch(Object.values(obj)[0])
    }
    toast({
      title: deepSearch(formHook.formState.errors),
      status: 'error',
      position: 'top',
      duration: 3000,
      isClosable: true
    })
  }, [formHook.formState.errors, toast])

  return (
    <>
      <Flex
        flexDirection={'column'}
        alignItems={'center'}
        h={'100%'}
        minWidth={'1024px'}
        backgroundColor={'grayModern.100'}>
        <Header
          yamlList={yamlList}
          applyCb={() =>
            formHook.handleSubmit((data) => openConfirm(() => submitSuccess(data))(), submitError)()
          }
        />

        <Box flex={'1 0 0'} h={0} w={'100%'} pb={4}>
          {formType === 'form' ? (
            <Form formHook={formHook} pxVal={pxVal} />
          ) : (
            <Yaml yamlList={yamlList} pxVal={pxVal} />
          )}
        </Box>
      </Flex>
      <ConfirmChild />
      <Loading />
      {!!errorMessage && (
        <ErrorModal title={'创建失败'} content={errorMessage} onClose={() => setErrorMessage('')} />
      )}
    </>
  )
}

export default DevboxCreatePage
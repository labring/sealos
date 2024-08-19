'use client'

import dynamic from 'next/dynamic'
import debounce from 'lodash/debounce'
import { useMessage } from '@sealos/ui'
import { useForm } from 'react-hook-form'
import { useRouter, useSearchParams } from 'next/navigation'
import { Box, Flex } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useRef, useState } from 'react'

import Form from './components/Form'
import Yaml from './components/Yaml'
import Header from './components/Header'
import type { YamlItemType } from '@/types'
import { useUserStore } from '@/stores/user'
import { createDevbox } from '@/api/devbox'
import { useGlobalStore } from '@/stores/global'
import { useConfirm } from '@/hooks/useConfirm'
import { useLoading } from '@/hooks/useLoading'
import { useDevboxStore } from '@/stores/devbox'
import { runtimeVersionMap } from '@/stores/static'
import type { DevboxEditType } from '@/types/devbox'
import { defaultDevboxEditValue, editModeMap } from '@/constants/devbox'

const ErrorModal = dynamic(() => import('@/components/modals/ErrorModal'))

const defaultEdit = {
  ...defaultDevboxEditValue,
  runtimeVersion: runtimeVersionMap.java[0]?.id
}

const DevboxCreatePage = () => {
  const router = useRouter()
  const t = useTranslations()
  const searchParams = useSearchParams()
  const { message: toast } = useMessage()
  const oldDevboxEditData = useRef<DevboxEditType>()
  const { checkQuotaAllow } = useUserStore()
  const { setDevboxDetail } = useDevboxStore()
  const { Loading, setIsLoading } = useLoading()
  const [errorMessage, setErrorMessage] = useState('')
  const [forceUpdate, setForceUpdate] = useState(false)
  const [yamlList, setYamlList] = useState<YamlItemType[]>([])

  const tabType = searchParams.get('type') || 'form'
  const devboxName = searchParams.get('name') || null

  const isEdit = useMemo(() => !!devboxName, [devboxName])

  const { title, applyBtnText, applyMessage, applySuccess, applyError } = editModeMap(isEdit)

  const { openConfirm, ConfirmChild } = useConfirm({
    content: applyMessage
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

  // TODO: 这里之后有crd之后再补全
  const generateYamlList = (data: DevboxEditType) => {
    return [
      {
        filename: 'devbox.yaml',
        value: ''
      },
      {
        filename: 'service.yaml',
        value: ''
      },
      {
        filename: 'ingress.yaml',
        value: ''
      }
    ]
  }

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

  useQuery(
    ['initDevboxCreateData'],
    () => {
      if (!devboxName) {
        setYamlList([
          {
            filename: 'cluster.yaml',
            value: ''
          },
          {
            filename: 'account.yaml',
            value: '' // TODO: 补充默认值
          }
        ])
        return null
      }
      setIsLoading(true)
      return setDevboxDetail(devboxName)
    },
    {
      onSuccess(res) {
        if (!res) return
        oldDevboxEditData.current = res
        formHook.reset(res)
      },
      onError(err) {
        toast({
          title: String(err),
          status: 'error'
        })
      },
      onSettled() {
        setIsLoading(false)
      }
    }
  )

  const submitSuccess = async (formData: DevboxEditType) => {
    setIsLoading(true)
    // try {
    //   await applyYamlList([limitRangeYaml], 'create')
    // } catch (err) {}
    try {
      // quote check
      // NOTE: 其实这个限额检查可能不需要了
      // const quoteCheckRes = checkQuotaAllow(formData)
      // if (quoteCheckRes) {
      //   setIsLoading(false)
      //   return toast({
      //     status: 'warning',
      //     title: quoteCheckRes,
      //     duration: 5000,
      //     isClosable: true
      //   })
      // }
      await createDevbox({ devboxForm: formData, isEdit })
      toast({
        title: t(applySuccess),
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
      if (!obj || typeof obj !== 'object') return t('submit_form_error')
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
  }, [formHook.formState.errors, toast, t])

  return (
    <>
      <Flex
        flexDirection={'column'}
        alignItems={'center'}
        h={'100vh'}
        minWidth={'1024px'}
        backgroundColor={'grayModern.100'}>
        <Header
          yamlList={yamlList}
          title={title}
          applyBtnText={applyBtnText}
          applyCb={() =>
            formHook.handleSubmit((data) => openConfirm(() => submitSuccess(data))(), submitError)()
          }
        />
        <Box flex={'1 0 0'} h={0} w={'100%'} pb={4}>
          {tabType === 'form' ? (
            <Form formHook={formHook} pxVal={pxVal} />
          ) : (
            <Yaml yamlList={yamlList} pxVal={pxVal} />
          )}
        </Box>
      </Flex>
      <ConfirmChild />
      <Loading />
      {!!errorMessage && (
        <ErrorModal title={applyError} content={errorMessage} onClose={() => setErrorMessage('')} />
      )}
    </>
  )
}

export default DevboxCreatePage

'use client'

import { useRouter } from '@/i18n'
import dynamic from 'next/dynamic'
import debounce from 'lodash/debounce'
import { useMessage } from '@sealos/ui'
import { customAlphabet } from 'nanoid'
import { useForm } from 'react-hook-form'
import { Box, Flex } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  DEVBOX_AFFINITY_ENABLE,
  SQUASH_ENABLE,
  languageVersionMap,
  runtimeNamespaceMap
} from '@/stores/static'
import Form from './components/Form'
import Yaml from './components/Yaml'
import Header from './components/Header'
import type { YamlItemType } from '@/types'
import { useUserStore } from '@/stores/user'
import { patchYamlList } from '@/utils/tools'
import { useConfirm } from '@/hooks/useConfirm'
import { useLoading } from '@/hooks/useLoading'
import { useDevboxStore } from '@/stores/devbox'
import { useGlobalStore } from '@/stores/global'
import { createDevbox, updateDevbox } from '@/api/devbox'
import { json2Devbox, json2Ingress, json2Service } from '@/utils/json2Yaml'
import type { DevboxEditType, DevboxKindsType, ProtocolType } from '@/types/devbox'
import { LanguageTypeEnum, defaultDevboxEditValue, editModeMap } from '@/constants/devbox'

const ErrorModal = dynamic(() => import('@/components/modals/ErrorModal'))

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12)

const formData2Yamls = (data: DevboxEditType) => [
  {
    filename: 'service.yaml',
    value: json2Service(data)
  },
  {
    filename: 'devbox.yaml',
    value: json2Devbox(data, runtimeNamespaceMap, DEVBOX_AFFINITY_ENABLE, SQUASH_ENABLE)
  },
  ...(data.networks.find((item) => item.openPublicDomain)
    ? [
        {
          filename: 'ingress.yaml',
          value: json2Ingress(data)
        }
      ]
    : [])
]

const DevboxCreatePage = () => {
  const router = useRouter()
  const t = useTranslations()

  const searchParams = useSearchParams()
  const { message: toast } = useMessage()
  const { checkQuotaAllow } = useUserStore()
  const { setDevboxDetail, devboxList } = useDevboxStore()

  const crOldYamls = useRef<DevboxKindsType[]>([])
  const formOldYamls = useRef<YamlItemType[]>([])
  const oldDevboxEditData = useRef<DevboxEditType>()
  const { Loading, setIsLoading } = useLoading()
  const [errorMessage, setErrorMessage] = useState('')
  const [forceUpdate, setForceUpdate] = useState(false)
  const [yamlList, setYamlList] = useState<YamlItemType[]>([])

  const tabType = searchParams.get('type') || 'form'
  const devboxName = searchParams.get('name') || ''

  const defaultEdit = {
    ...defaultDevboxEditValue,
    runtimeVersion: languageVersionMap[LanguageTypeEnum.go][0].id,
    networks: languageVersionMap[LanguageTypeEnum.go][0].defaultPorts.map((port) => ({
      networkName: `${defaultDevboxEditValue.name}-${nanoid()}`,
      portName: nanoid(),
      port: port,
      protocol: 'HTTP' as ProtocolType,
      openPublicDomain: true,
      publicDomain: nanoid(),
      customDomain: ''
    }))
  }

  // NOTE: need to explain why this is needed
  // fix a bug: searchParams will disappear when go into this page
  const [captureDevboxName, setCaptureDevboxName] = useState('')

  useEffect(() => {
    const name = searchParams.get('name')
    if (name) {
      setCaptureDevboxName(name)
      router.replace(`/devbox/create?name=${captureDevboxName}`, undefined)
    }
  }, [searchParams, router, captureDevboxName])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const isEdit = useMemo(() => !!devboxName, [])

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

  const generateYamlList = (data: DevboxEditType) => {
    return [
      {
        filename: 'devbox.yaml',
        value: json2Devbox(data, runtimeNamespaceMap, DEVBOX_AFFINITY_ENABLE, SQUASH_ENABLE)
      },
      {
        filename: 'service.yaml',
        value: json2Service(data)
      },
      {
        filename: 'ingress.yaml',
        value: json2Ingress(data)
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
            filename: 'devbox.yaml',
            value: json2Devbox(
              defaultEdit,
              runtimeNamespaceMap,
              DEVBOX_AFFINITY_ENABLE,
              SQUASH_ENABLE
            )
          },
          {
            filename: 'service.yaml',
            value: json2Service(defaultEdit)
          },
          {
            filename: 'ingress.yaml',
            value: json2Ingress(defaultEdit)
          }
        ])
        return null
      }
      setIsLoading(true)
      return setDevboxDetail(devboxName)
    },
    {
      onSuccess(res) {
        if (!res) {
          return
        }
        oldDevboxEditData.current = res
        formOldYamls.current = formData2Yamls(res)
        crOldYamls.current = generateYamlList(res) as DevboxKindsType[]
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

    try {
      // quote check
      const quoteCheckRes = checkQuotaAllow(
        { ...formData, nodeports: devboxList.length + 1 } as DevboxEditType & {
          nodeports: number
        },
        {
          ...oldDevboxEditData.current,
          nodeports: devboxList.length
        } as DevboxEditType & {
          nodeports: number
        }
      )
      if (quoteCheckRes) {
        setIsLoading(false)
        return toast({
          status: 'warning',
          title: t(quoteCheckRes),
          duration: 5000,
          isClosable: true
        })
      }
      const parsedNewYamlList = yamlList.map((item) => item.value)
      const parsedOldYamlList = formOldYamls.current.map((item) => item.value)

      const areYamlListsEqual =
        new Set(parsedNewYamlList).size === new Set(parsedOldYamlList).size &&
        [...new Set(parsedNewYamlList)].every((item) => new Set(parsedOldYamlList).has(item))
      if (areYamlListsEqual) {
        setIsLoading(false)
        return toast({
          status: 'info',
          title: t('No changes detected'),
          duration: 5000,
          isClosable: true
        })
      }
      // create or update
      if (isEdit) {
        const patch = patchYamlList({
          parsedOldYamlList: parsedOldYamlList,
          parsedNewYamlList: parsedNewYamlList,
          originalYamlList: crOldYamls.current
        })

        await updateDevbox({
          patch,
          devboxName: formData.name
        })
      } else {
        await createDevbox({ devboxForm: formData, runtimeNamespaceMap })
      }
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
      if (!obj || typeof obj !== 'object') {
        return t('submit_form_error')
      }
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
            <Form formHook={formHook} pxVal={pxVal} isEdit={isEdit} />
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

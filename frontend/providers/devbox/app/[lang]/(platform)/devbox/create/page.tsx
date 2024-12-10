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

import Form from './components/Form'
import Yaml from './components/Yaml'
import Header from './components/Header'

import type { YamlItemType } from '@/types'
import type { DevboxEditType, DevboxKindsType, ProtocolType } from '@/types/devbox'

import { useConfirm } from '@/hooks/useConfirm'
import { useLoading } from '@/hooks/useLoading'

import { useEnvStore } from '@/stores/env'
import { useIDEStore } from '@/stores/ide'
import { useUserStore } from '@/stores/user'
import { usePriceStore } from '@/stores/price'
import { useDevboxStore } from '@/stores/devbox'
import { useGlobalStore } from '@/stores/global'
import { useRuntimeStore } from '@/stores/runtime'

import { patchYamlList } from '@/utils/tools'
import { createDevbox, updateDevbox } from '@/api/devbox'
import { json2Devbox, json2Ingress, json2Service } from '@/utils/json2Yaml'
import {
  FrameworkTypeEnum,
  LanguageTypeEnum,
  OSTypeEnum,
  defaultDevboxEditValue,
  editModeMap
} from '@/constants/devbox'

const ErrorModal = dynamic(() => import('@/components/modals/ErrorModal'))

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12)

const DevboxCreatePage = () => {
  const router = useRouter()
  const t = useTranslations()
  const { Loading, setIsLoading } = useLoading()

  const searchParams = useSearchParams()
  const { message: toast } = useMessage()

  const { env } = useEnvStore()
  const { addDevboxIDE } = useIDEStore()
  const { sourcePrice } = usePriceStore()
  const { checkQuotaAllow } = useUserStore()
  const { setDevboxDetail, devboxList } = useDevboxStore()
  const { runtimeNamespaceMap, languageVersionMap, frameworkVersionMap, osVersionMap } =
    useRuntimeStore()

  const crOldYamls = useRef<DevboxKindsType[]>([])
  const formOldYamls = useRef<YamlItemType[]>([])
  const oldDevboxEditData = useRef<DevboxEditType>()

  const [errorMessage, setErrorMessage] = useState('')
  const [forceUpdate, setForceUpdate] = useState(false)
  const [yamlList, setYamlList] = useState<YamlItemType[]>([])
  const [defaultGpuSource, setDefaultGpuSource] = useState<DevboxEditType['gpu']>({
    type: '',
    amount: 0,
    manufacturers: ''
  })

  const tabType = searchParams.get('type') || 'form'
  const devboxName = searchParams.get('name') || ''
  const runtime = searchParams.get('runtime') || ''

  const formData2Yamls = (data: DevboxEditType) => [
    {
      filename: 'devbox.yaml',
      value: json2Devbox(data, runtimeNamespaceMap, env.devboxAffinityEnable, env.squashEnable)
    },
    ...(data.networks.length > 0
      ? [
          {
            filename: 'service.yaml',
            value: json2Service(data)
          }
        ]
      : []),
    ...(data.networks.find((item) => item.openPublicDomain)
      ? [
          {
            filename: 'ingress.yaml',
            value: json2Ingress(data, env.ingressSecret)
          }
        ]
      : [])
  ]

  const defaultEdit = {
    ...defaultDevboxEditValue,
    runtimeType: runtime || LanguageTypeEnum.go,
    runtimeVersion: runtime
      ? languageVersionMap[runtime as LanguageTypeEnum]?.[0]?.id ||
        frameworkVersionMap[runtime as FrameworkTypeEnum]?.[0]?.id ||
        osVersionMap[runtime as OSTypeEnum]?.[0]?.id
      : languageVersionMap[LanguageTypeEnum.go]?.[0]?.id,
    networks: (
      languageVersionMap[runtime as LanguageTypeEnum]?.[0]?.defaultPorts ||
      frameworkVersionMap[runtime as FrameworkTypeEnum]?.[0]?.defaultPorts ||
      osVersionMap[runtime as OSTypeEnum]?.[0]?.defaultPorts ||
      languageVersionMap[LanguageTypeEnum.go]?.[0]?.defaultPorts
    ).map((port) => ({
      networkName: `${defaultDevboxEditValue.name}-${nanoid()}`,
      portName: nanoid(),
      port: port,
      protocol: 'HTTP' as ProtocolType,
      openPublicDomain: true,
      publicDomain: `${nanoid()}.${env.ingressDomain}`,
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
        value: json2Devbox(data, runtimeNamespaceMap, env.devboxAffinityEnable, env.squashEnable)
      },
      ...(data.networks.length > 0
        ? [
            {
              filename: 'service.yaml',
              value: json2Service(data)
            }
          ]
        : []),
      ...(data.networks.find((item) => item.openPublicDomain)
        ? [
            {
              filename: 'ingress.yaml',
              value: json2Ingress(data, env.ingressSecret)
            }
          ]
        : [])
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

  const countGpuInventory = useCallback(
    (type?: string) => {
      const inventory = sourcePrice?.gpu?.find((item) => item.type === type)?.inventory || 0
      const defaultInventory = type === defaultGpuSource?.type ? defaultGpuSource?.amount || 0 : 0
      return inventory + defaultInventory
    },
    [defaultGpuSource?.amount, defaultGpuSource?.type, sourcePrice?.gpu]
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
              env.devboxAffinityEnable,
              env.squashEnable
            )
          },
          ...(defaultEdit.networks.length > 0
            ? [
                {
                  filename: 'service.yaml',
                  value: json2Service(defaultEdit)
                }
              ]
            : []),
          ...(defaultEdit.networks.find((item) => item.openPublicDomain)
            ? [
                {
                  filename: 'ingress.yaml',
                  value: json2Ingress(defaultEdit, env.ingressSecret)
                }
              ]
            : [])
        ])
        return null
      }
      setIsLoading(true)
      return setDevboxDetail(devboxName, env.sealosDomain)
    },
    {
      onSuccess(res) {
        if (!res) {
          return
        }
        oldDevboxEditData.current = res
        formOldYamls.current = formData2Yamls(res)
        crOldYamls.current = generateYamlList(res) as DevboxKindsType[]
        setDefaultGpuSource(res.gpu)
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
      // gpu inventory check
      if (formData.gpu?.type) {
        const inventory = countGpuInventory(formData.gpu?.type)
        if (formData.gpu?.amount > inventory) {
          return toast({
            status: 'warning',
            title: t('Gpu under inventory Tip', {
              gputype: formData.gpu.type
            })
          })
        }
      }
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
      addDevboxIDE('vscode', formData.name)
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
            <Form
              formHook={formHook}
              pxVal={pxVal}
              isEdit={isEdit}
              countGpuInventory={countGpuInventory}
            />
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

'use client'

import { useRouter } from '@/i18n'
import { Box, Flex } from '@chakra-ui/react'
import { useMessage } from '@sealos/ui'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

import Form from './components/Form'
import Header from './components/Header'
import Yaml from './components/Yaml'

import type { YamlItemType } from '@/types'
import type { DevboxEditType, DevboxEditTypeV2, DevboxKindsType, json2DevboxV2Data } from '@/types/devbox'

import { useConfirm } from '@/hooks/useConfirm'
import { useLoading } from '@/hooks/useLoading'

import { useDevboxStore } from '@/stores/devbox'
import { useEnvStore } from '@/stores/env'
import { useGlobalStore } from '@/stores/global'
import { useIDEStore } from '@/stores/ide'
import { useUserStore } from '@/stores/user'

import { createDevbox, updateDevbox } from '@/api/devbox'
import { defaultDevboxEditValueV2, editModeMap } from '@/constants/devbox'
import { useTemplateStore } from '@/stores/template'
import { json2DevboxV2, json2Ingress, json2Service } from '@/utils/json2Yaml'
import { patchYamlList } from '@/utils/tools'

const ErrorModal = dynamic(() => import('@/components/modals/ErrorModal'))


const generateYamlList = (data: json2DevboxV2Data) => {
  const env = useEnvStore.getState().env
  return [
    {
      filename: 'devbox.yaml',
      value: json2DevboxV2(data, env.devboxAffinityEnable, env.squashEnable)
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
const formData2Yamls = (data: json2DevboxV2Data) => {
  const env = useEnvStore.getState().env
  return [
    {
      filename: 'devbox.yaml',
      value: json2DevboxV2(data, env.devboxAffinityEnable, env.squashEnable)
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
const generateDefaultYamlList = () => generateYamlList(defaultDevboxEditValueV2)
const DevboxCreatePage = () => {
  const router = useRouter()
  const t = useTranslations()

  const searchParams = useSearchParams()
  const { message: toast } = useMessage()

  const { env } = useEnvStore()
  const { addDevboxIDE } = useIDEStore()
  const { checkQuotaAllow } = useUserStore()
  const { setDevboxDetail, devboxList } = useDevboxStore()

  const crOldYamls = useRef<DevboxKindsType[]>([])
  const formOldYamls = useRef<YamlItemType[]>([])
  const oldDevboxEditData = useRef<DevboxEditTypeV2>()

  const { Loading, setIsLoading } = useLoading()
  const [errorMessage, setErrorMessage] = useState('')
  const [yamlList, setYamlList] = useState<YamlItemType[]>([])

  const tabType = searchParams.get('type') || 'form'
  const devboxName = searchParams.get('name') || ''

  // NOTE: need to explain why this is needed
  // fix a bug: searchParams will disappear when go into this page
  const [captureDevboxName, setCaptureDevboxName] = useState('')
  const {updateTemplateModalConfig, config: templateConfig} = useTemplateStore()
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



  const formHook = useForm<DevboxEditTypeV2>({
    defaultValues: defaultDevboxEditValueV2
  })

  useEffect(() => {
    if (tabType !== 'form') {
      const formData = formHook.getValues()
      setYamlList(generateYamlList({
        ...formData,
        templateConfig: formData.templateConfig as any,
        templateRepositoryUid: formData.templateRepositoryUid,
        templateUid: formData.templateUid,
        image: formData.image
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabType])
  useQuery(
    ['initDevboxCreateData'],
    () => {
      if (!devboxName) {
        setYamlList(generateDefaultYamlList())
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

  const submitSuccess = async (formData: DevboxEditTypeV2) => {
    setIsLoading(true)

    try {
      // quote check
      const quoteCheckRes = checkQuotaAllow(
        { ...formData, nodeports: devboxList.length + 1 } as DevboxEditTypeV2 & {
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
        await createDevbox({ devboxForm: formData })
      }
      addDevboxIDE('cursor', formData.name)
      toast({
        title: t(applySuccess),
        status: 'success'
      })
      updateTemplateModalConfig({
        ...templateConfig,
        lastRoute
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

  return (<
    >
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
          <FormProvider {...formHook} >
            <Form pxVal={pxVal} isEdit={isEdit} />
          </FormProvider>
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

'use client'
import { Button, Flex, Text, FormControl, VStack, Skeleton } from '@chakra-ui/react'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { MultiSelectCombobox } from '@/components/common/MultiSelectCombobox'
import { SingleSelectCombobox } from '@/components/common/SingleSelectCombobox'
import { useForm, Controller, FieldErrors, FieldErrorsImpl, FieldError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  batchOption,
  getChannelBuiltInSupportModels,
  getChannelTypeNames,
  getOption
} from '@/api/platform'
import { SetStateAction, Dispatch, useEffect, useState } from 'react'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import ConstructMappingComponent from '@/components/common/ConstructMappingComponent'
import { DefaultChannelModel, DefaultChannelModelMapping } from '@/types/admin/option'
import { ChannelType } from '@/types/admin/channels/channelInfo'
import { QueryKey } from '@/types/query-key'
import { useMessage } from '@sealos/ui'
import { BatchOptionData } from '@/types/admin/option'

const ModelConfig = () => {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const queryClient = useQueryClient()

  const { message } = useMessage({
    warningBoxBg: 'var(--Yellow-50, #FFFAEB)',
    warningIconBg: 'var(--Yellow-500, #F79009)',
    warningIconFill: 'white',

    successBoxBg: 'var(--Green-50, #EDFBF3)',
    successIconBg: 'var(--Green-600, #039855)',
    successIconFill: 'white'
  })

  const [allSupportChannel, setAllSupportChannel] = useState<string[]>([])
  const [allSupportChannelWithMode, setAllSupportChannelWithMode] = useState<{
    [key in ChannelType]: string[]
  }>({})

  const [defaultModel, setDefaultModel] = useState<DefaultChannelModel>({})
  const [defaultModelMapping, setDefaultModelMapping] = useState<DefaultChannelModelMapping>({})

  const { isLoading: isChannelTypeNamesLoading, data: channelTypeNames } = useQuery({
    queryKey: [QueryKey.GetChannelTypeNames],
    queryFn: () => getChannelTypeNames()
  })

  const { isLoading: isBuiltInSupportModelsLoading, data: builtInSupportModels } = useQuery({
    queryKey: [QueryKey.GetAllChannelModes],
    queryFn: () => getChannelBuiltInSupportModels()
  })

  const { isLoading: isOptionLoading, data: optionData } = useQuery({
    queryKey: [QueryKey.GetOption],
    queryFn: () => getOption(),
    onSuccess: (data) => {
      if (!data) return

      const defaultModels: DefaultChannelModel = JSON.parse(data.DefaultChannelModels)
      const defaultModelMappings: DefaultChannelModelMapping = JSON.parse(
        data.DefaultChannelModelMapping
      )

      setDefaultModel(defaultModels)
      setDefaultModelMapping(defaultModelMappings)
    }
  })

  useEffect(() => {
    if (!channelTypeNames || !builtInSupportModels) return

    // 1. 处理 allSupportChannel
    const supportedChannels = Object.entries(channelTypeNames)
      .filter(([channel]) => channel in builtInSupportModels)
      .map(([_, name]) => name)

    setAllSupportChannel(supportedChannels)

    // 2. 处理 allSupportChannelWithMode
    // 渠道类型可能出现在 channelTypeNames 中，但不在 builtInSupportModels 中，所以需要过滤
    // 但在 builtInSupportModels 中，则一定在 channelTypeNames 中，所以 以 builtInSupportModels 为主
    const channelWithModes = Object.entries(channelTypeNames)
      .filter(([channelType, _]) => channelType in builtInSupportModels)
      .reduce((acc, [channelType, channelName]) => {
        const modelInfos = builtInSupportModels[channelType as ChannelType] || []
        const models = [...new Set(modelInfos.map((info) => info.model))]

        return {
          ...acc,
          [channelType]: models
        }
      }, {} as { [key in ChannelType]: string[] })

    setAllSupportChannelWithMode(channelWithModes)
  }, [channelTypeNames, builtInSupportModels])

  // form schema
  const itemSchema = z.object({
    type: z.number(),
    defaultMode: z.array(z.string()),
    defaultModeMapping: z
      .record(z.string(), z.string())
      .refine((mapping) => {
        // 检查所有值不能为空字符串
        return Object.values(mapping).every((value) => value.trim() !== '')
      })
      .default({})
  })

  const schema = z.array(itemSchema)

  type ConfigItem = z.infer<typeof itemSchema>
  type FormData = ConfigItem[]

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
    control
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: [],
    mode: 'onChange',
    reValidateMode: 'onChange'
  })

  useEffect(() => {
    if (!defaultModel || !defaultModelMapping) return
    // Only proceed if both defaultModel and defaultModelMapping are available
    if (Object.keys(defaultModel).length === 0) return

    // Transform the data into form format
    const formData: FormData = Object.entries(defaultModel).map(([channelType, modes]) => {
      return {
        type: Number(channelType),
        defaultMode: modes || [], // Using first mode as default
        defaultModeMapping: defaultModelMapping[channelType as ChannelType] || {}
      }
    })

    // Reset form with the new values
    reset(formData)
  }, [defaultModel, defaultModelMapping, reset])

  const handleAddDefaultModel = () => {
    const newItem = {
      type: undefined, // Default type value
      defaultMode: [],
      defaultModeMapping: {}
    }

    // Get current form values
    const currentValues = watch()
    // Create new array with new item at the beginning
    const newValues = [newItem, ...Object.values(currentValues)]
    // Reset form with new values
    reset(newValues)
  }

  const formValues = watch()

  const formValuesArray: FormData = Array.isArray(formValues)
    ? formValues
    : Object.values(formValues)

  const batchOptionMutation = useMutation({
    mutationFn: batchOption,
    onSuccess: () => {
      message({
        title: t('globalConfigs.saveDefaultModelSuccess'),
        status: 'success'
      })
    }
  })

  const transformFormDataToConfig = (formData: FormData): BatchOptionData => {
    // 初始化两个对象
    const defaultChannelModelMapping: Record<string, Record<string, string>> = {}
    const defaultChannelModels: Record<string, string[]> = {}

    // 遍历 FormData
    formData.forEach((item) => {
      const type = item.type.toString()

      // 处理 DefaultChannelModelMapping
      if (Object.keys(item.defaultModeMapping).length > 0) {
        defaultChannelModelMapping[type] = item.defaultModeMapping
      }

      // 处理 DefaultChannelModels
      if (item.defaultMode.length > 0) {
        defaultChannelModels[type] = item.defaultMode
      }
    })

    return {
      // 转换为 JSON 字符串
      DefaultChannelModelMapping: JSON.stringify(defaultChannelModelMapping),
      DefaultChannelModels: JSON.stringify(defaultChannelModels)
    }
  }

  const resetForm = () => {
    reset()
  }

  type FieldErrorType =
    | FieldError
    | FieldErrorsImpl<{
        type: number
        defaultMode: string[]
        defaultModeMapping: Record<string, string>
      }>

  const getFirstErrorMessage = (errors: FieldErrors<FormData>): string => {
    // Iterate through top-level errors
    for (const index in errors) {
      const fieldError = errors[index] as FieldErrorType
      if (!fieldError) continue

      // Check if error is an object
      if (typeof fieldError === 'object') {
        // If it has a direct message property
        if ('message' in fieldError && fieldError.message) {
          return `Item ${Number(index) + 1}: ${fieldError.message}`
        }

        // Iterate through nested field errors
        const errorKeys = Object.keys(fieldError) as Array<keyof typeof fieldError>
        for (const fieldName of errorKeys) {
          const nestedError = fieldError[fieldName]
          if (nestedError && typeof nestedError === 'object' && 'message' in nestedError) {
            // Map field names to their display labels
            const fieldLabel =
              {
                type: 'Type',
                defaultMode: 'Default Mode',
                defaultModeMapping: 'Model Mapping'
              }[fieldName as string] || fieldName

            return `Item ${Number(index) + 1} ${fieldLabel}: ${nestedError.message}`
          }
        }
      }
    }
    return 'Form validation failed'
  }

  const onValidate = async (data: FormData) => {
    try {
      const batchOptionData: BatchOptionData = transformFormDataToConfig(data)
      await batchOptionMutation.mutateAsync(batchOptionData)

      queryClient.invalidateQueries({ queryKey: [QueryKey.GetOption] })
      queryClient.invalidateQueries({ queryKey: [QueryKey.GetChannelTypeNames] })
      queryClient.invalidateQueries({ queryKey: [QueryKey.GetAllChannelModes] })
      resetForm()
    } catch (error) {
      message({
        title: t('globalConfigs.saveDefaultModelFailed'),
        status: 'error',
        position: 'top',
        duration: 2000,
        isClosable: true,
        description:
          error instanceof Error ? error.message : t('globalConfigs.saveDefaultModelFailed')
      })
      console.error(error)
    }
  }

  const onInvalid = (errors: FieldErrors<FormData>): void => {
    console.error('errors', errors)

    const errorMessage = getFirstErrorMessage(errors)

    message({
      title: errorMessage,
      status: 'error',
      position: 'top',
      duration: 2000,
      isClosable: true
    })
  }

  const onSubmit = handleSubmit(onValidate, onInvalid)
  return (
    /*
    顶级 Flex 容器的高度: calc(100vh - 16px - 24px - 12px - 32px - 36px)
    ModelConfig 的高度: calc(100vh - 16px - 24px - 12px - 32px - 36px)- CommonConfig 的高度(152px) -两个 gap 的高度(36px × 2 = 72px)
    = calc(100vh - 16px - 24px - 12px - 32px - 36px - 152px - 72px)
    = calc(100vh - 344px)
    */
    <Flex w="full" gap="8px" flexDirection="row" flex="1" h="calc(100vh - 344px)">
      {/* title */}
      <Flex w="153px" pt="4px" alignItems="flex-start">
        <Text
          whiteSpace="nowrap"
          color="black"
          fontFamily="PingFang SC"
          fontSize="16px"
          fontStyle="normal"
          fontWeight="500"
          lineHeight="24px"
          letterSpacing="0.15px">
          {t('globalConfigs.model_config')}
        </Text>
      </Flex>
      {/* -- title end */}

      {/* config */}
      <Flex h="full" flexDirection="column" gap="12px" flex="1" minW="0" overflow="hidden">
        {/* add default model */}
        <Flex justifyContent="space-between" alignItems="center" alignSelf="stretch" gap="16px">
          <Text
            whiteSpace="nowrap"
            color="grayModern.600"
            fontFamily="PingFang SC"
            fontSize="14px"
            fontStyle="normal"
            fontWeight="500"
            lineHeight="20px"
            letterSpacing="0.1px">
            {t('globalConfigs.defaultModel')}
          </Text>
          <Flex justifyContent="flex-end" alignItems="center" gap="15px" minW="0">
            <Button
              onClick={handleAddDefaultModel}
              variant="outline"
              display="flex"
              padding="8px 14px"
              justifyContent="center"
              alignItems="center"
              gap="6px"
              borderRadius="6px"
              border="1px solid"
              borderColor="grayModern.250"
              bg="white"
              boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="17"
                height="16"
                viewBox="0 0 17 16"
                fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M8.93068 2.6665C9.29887 2.6665 9.59735 2.96498 9.59735 3.33317V7.33317H13.5974C13.9655 7.33317 14.264 7.63165 14.264 7.99984C14.264 8.36803 13.9655 8.6665 13.5974 8.6665H9.59735V12.6665C9.59735 13.0347 9.29887 13.3332 8.93068 13.3332C8.56249 13.3332 8.26402 13.0347 8.26402 12.6665V8.6665H4.26402C3.89583 8.6665 3.59735 8.36803 3.59735 7.99984C3.59735 7.63165 3.89583 7.33317 4.26402 7.33317H8.26402V3.33317C8.26402 2.96498 8.56249 2.6665 8.93068 2.6665Z"
                  fill="#485264"
                />
              </svg>
              <Text
                whiteSpace="nowrap"
                color="grayModern.600"
                fontFamily="PingFang SC"
                fontSize="12px"
                fontStyle="normal"
                fontWeight="500"
                lineHeight="16px"
                letterSpacing="0.5px">
                {t('globalConfigs.addDefaultModel')}
              </Text>
            </Button>
            <Button
              onClick={onSubmit}
              isDisabled={batchOptionMutation.isLoading}
              isLoading={batchOptionMutation.isLoading}
              variant="outline"
              display="flex"
              padding="8px 14px"
              justifyContent="center"
              alignItems="center"
              gap="6px"
              borderRadius="6px"
              border="1px solid"
              borderColor="brightBlue.300"
              bg="white"
              boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="17"
                height="16"
                viewBox="0 0 17 16"
                fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M11.2007 2.68532C11.1418 2.67118 11.0716 2.6669 10.7137 2.6669H6.26404V4.2669C6.26404 4.46458 6.26456 4.57275 6.27091 4.65047C6.27116 4.65357 6.27142 4.6565 6.27167 4.65927C6.27444 4.65952 6.27737 4.65978 6.28046 4.66003C6.35818 4.66638 6.46635 4.6669 6.66404 4.6669H11.1974C11.3951 4.6669 11.5032 4.66638 11.5809 4.66003C11.584 4.65978 11.587 4.65952 11.5897 4.65927C11.59 4.6565 11.5902 4.65357 11.5905 4.65047C11.5969 4.57275 11.5974 4.46458 11.5974 4.2669V2.94426C11.4719 2.82137 11.4323 2.78899 11.3934 2.76514C11.3338 2.72858 11.2687 2.70165 11.2007 2.68532ZM12.7354 2.1954L12.6936 2.15366C12.6804 2.14047 12.6673 2.12737 12.6544 2.11437C12.4627 1.92238 12.2938 1.75311 12.0901 1.62828C11.9111 1.51863 11.7161 1.43782 11.512 1.38882C11.2797 1.33305 11.0405 1.33328 10.7693 1.33353C10.7509 1.33355 10.7324 1.33356 10.7137 1.33356L6.10317 1.33356C5.93714 1.33356 5.78007 1.33356 5.63164 1.33443C5.62029 1.33385 5.60886 1.33356 5.59737 1.33356C5.58266 1.33356 5.56806 1.33404 5.55358 1.33498C5.25481 1.33746 4.99222 1.34428 4.76282 1.36303C4.38809 1.39364 4.04362 1.45935 3.72006 1.62421C3.2183 1.87988 2.81035 2.28782 2.55469 2.78959C2.38983 3.11315 2.32412 3.45762 2.2935 3.83235C2.26402 4.19314 2.26403 4.63605 2.26404 5.1727V10.8278C2.26403 11.3644 2.26402 11.8073 2.2935 12.1681C2.32412 12.5428 2.38983 12.8873 2.55469 13.2109C2.81035 13.7126 3.2183 14.1206 3.72006 14.3762C4.04362 14.5411 4.38809 14.6068 4.76282 14.6374C4.99222 14.6562 5.25481 14.663 5.55358 14.6655C5.56806 14.6664 5.58266 14.6669 5.59737 14.6669C5.60887 14.6669 5.62029 14.6666 5.63164 14.666C5.78007 14.6669 5.93713 14.6669 6.10316 14.6669H11.7583C11.9243 14.6669 12.0813 14.6669 12.2298 14.666C12.2411 14.6666 12.2525 14.6669 12.264 14.6669C12.2788 14.6669 12.2934 14.6664 12.3078 14.6655C12.6066 14.663 12.8692 14.6562 13.0986 14.6374C13.4733 14.6068 13.8178 14.5411 14.1413 14.3762C14.6431 14.1206 15.0511 13.7126 15.3067 13.2109C15.4716 12.8873 15.5373 12.5428 15.5679 12.1681C15.5974 11.8073 15.5974 11.3644 15.5974 10.8278V6.21722C15.5974 6.19855 15.5974 6.18004 15.5974 6.16167C15.5977 5.89042 15.5979 5.65125 15.5421 5.41896C15.4931 5.21488 15.4123 5.0198 15.3027 4.84085C15.1778 4.63716 15.0086 4.4682 14.8166 4.27657C14.8036 4.2636 14.7905 4.25052 14.7773 4.23732L12.7354 2.1954C12.7354 2.19546 12.7353 2.19535 12.7354 2.1954ZM12.9307 4.27637V4.28815C12.9307 4.45641 12.9307 4.62028 12.9194 4.75905C12.907 4.91145 12.8776 5.09127 12.7854 5.27222C12.6575 5.5231 12.4536 5.72708 12.2027 5.85491C12.0217 5.9471 11.8419 5.97648 11.6895 5.98893C11.5508 6.00027 11.3869 6.00025 11.2186 6.00023L6.66404 6.00023C6.65694 6.00023 6.64985 6.00023 6.64277 6.00023C6.47452 6.00025 6.31066 6.00027 6.17189 5.98893C6.01949 5.97648 5.83967 5.9471 5.65872 5.85491C5.40784 5.72708 5.20386 5.5231 5.07603 5.27222C4.98383 5.09127 4.95445 4.91145 4.942 4.75905C4.93066 4.62028 4.93068 4.45642 4.9307 4.28816C4.9307 4.28108 4.93071 4.27399 4.93071 4.2669V2.68747C4.91055 2.68886 4.89079 2.69035 4.8714 2.69193C4.57912 2.71581 4.42965 2.7591 4.32538 2.81222C4.0745 2.94005 3.87053 3.14403 3.7427 3.39491C3.68957 3.49918 3.64629 3.64865 3.62241 3.94092C3.59789 4.24098 3.59737 4.62918 3.59737 5.20023V10.8002C3.59737 11.3713 3.59789 11.7595 3.62241 12.0595C3.64629 12.3518 3.68957 12.5013 3.7427 12.6056C3.87053 12.8564 4.0745 13.0604 4.32538 13.1882C4.42965 13.2414 4.57912 13.2846 4.8714 13.3085C4.89079 13.3101 4.91055 13.3116 4.93071 13.313L4.9307 9.7123C4.93068 9.54404 4.93066 9.38018 4.942 9.24141C4.95445 9.08902 4.98383 8.90919 5.07603 8.72824C5.20386 8.47736 5.40784 8.27339 5.65872 8.14556C5.83967 8.05336 6.01949 8.02398 6.17189 8.01153C6.31066 8.00019 6.47452 8.00021 6.64278 8.00023H11.2186C11.3869 8.00021 11.5507 8.00019 11.6895 8.01153C11.8419 8.02398 12.0217 8.05336 12.2027 8.14556C12.4536 8.27339 12.6575 8.47736 12.7854 8.72824C12.8776 8.90919 12.907 9.08902 12.9194 9.24141C12.9307 9.38019 12.9307 9.54405 12.9307 9.71231L12.9307 13.313C12.9509 13.3116 12.9706 13.3101 12.99 13.3085C13.2823 13.2846 13.4318 13.2414 13.536 13.1882C13.7869 13.0604 13.9909 12.8564 14.1187 12.6056C14.1718 12.5013 14.2151 12.3518 14.239 12.0595C14.2635 11.7595 14.264 11.3713 14.264 10.8002V6.21722C14.264 5.85937 14.2598 5.7891 14.2456 5.73022C14.2293 5.6622 14.2023 5.59717 14.1658 5.53752C14.1342 5.48589 14.0875 5.43317 13.8345 5.18013L12.9307 4.27637ZM11.5974 13.3336V9.73356C11.5974 9.53588 11.5969 9.42771 11.5905 9.34999C11.5902 9.34689 11.59 9.34396 11.5897 9.3412C11.587 9.34094 11.584 9.34069 11.5809 9.34043C11.5032 9.33408 11.3951 9.33356 11.1974 9.33356H6.66404C6.46635 9.33356 6.35818 9.33408 6.28046 9.34043C6.27737 9.34069 6.27444 9.34094 6.27167 9.3412C6.27142 9.34396 6.27116 9.34689 6.27091 9.34999C6.26456 9.42771 6.26404 9.53588 6.26404 9.73356V13.3336H11.5974Z"
                  fill="#0884DD"
                />
              </svg>
              <Text
                whiteSpace="nowrap"
                color="brightBlue.600"
                fontFamily="PingFang SC"
                fontSize="12px"
                fontStyle="normal"
                fontWeight="500"
                lineHeight="16px"
                letterSpacing="0.5px">
                {t('globalConfigs.saveDefaultModel')}
              </Text>
            </Button>
          </Flex>
        </Flex>

        {/* default model */}

        <Flex
          w="full"
          gap="12px"
          alignSelf="stretch"
          alignItems="flex-start"
          flexDirection="column"
          minH="0"
          h="full"
          // bg="red"
          borderRadius="6px"
          overflow="hidden"
          overflowY="auto">
          {isChannelTypeNamesLoading ||
          isBuiltInSupportModelsLoading ||
          isOptionLoading ||
          formValuesArray?.length === 0 ? (
            <Skeleton w="full" h="full" />
          ) : (
            formValuesArray &&
            formValuesArray.length > 0 &&
            channelTypeNames &&
            formValuesArray.map((value, index) => {
              return (
                <Flex
                  key={`${index}-${value.type}`}
                  w="full"
                  padding="24px 36px"
                  alignSelf="stretch"
                  borderRadius="4px"
                  bg="grayModern.100"
                  position="relative">
                  <Button
                    position="absolute"
                    right="12px"
                    top="12px"
                    p="6px 4px"
                    alignItems="center"
                    size="sm"
                    borderRadius="4px"
                    variant="ghost"
                    _hover={{
                      bg: 'rgba(17, 24, 36, 0.05)',
                      color: '#D92D20'
                    }}
                    onClick={() => {
                      const currentValues = watch()
                      const newValues = Object.values(currentValues).filter((_, i) => i !== index)
                      reset(newValues)
                    }}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 18 18"
                      fill="none">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M8.41781 1.32788H9.58222C9.9456 1.32787 10.2625 1.32785 10.5242 1.34924C10.8014 1.37189 11.082 1.42222 11.3535 1.56052C11.7551 1.76516 12.0816 2.09169 12.2863 2.49331C12.4246 2.76473 12.4749 3.04538 12.4975 3.32262C12.5156 3.54319 12.5184 3.80297 12.5188 4.09677H15.23C15.6442 4.09677 15.98 4.43256 15.98 4.84677C15.98 5.26098 15.6442 5.59677 15.23 5.59677H14.5956V12.6302C14.5956 13.1857 14.5956 13.6477 14.5648 14.0247C14.5327 14.4173 14.4635 14.7835 14.2875 15.1289C14.0165 15.6608 13.5841 16.0932 13.0522 16.3642C12.7067 16.5402 12.3406 16.6094 11.9479 16.6415C11.5709 16.6723 11.109 16.6723 10.5535 16.6723H7.4465C6.89102 16.6723 6.42911 16.6723 6.0521 16.6415C5.65943 16.6094 5.29331 16.5402 4.94785 16.3642C4.41598 16.0932 3.98355 15.6608 3.71255 15.1289C3.53653 14.7835 3.46733 14.4173 3.43525 14.0247C3.40444 13.6477 3.40445 13.1857 3.40446 12.6303L3.40446 5.59677H2.77002C2.35581 5.59677 2.02002 5.26098 2.02002 4.84677C2.02002 4.43256 2.35581 4.09677 2.77002 4.09677H5.4812C5.48164 3.80297 5.48446 3.54319 5.50248 3.32262C5.52513 3.04538 5.57547 2.76473 5.71377 2.49331C5.9184 2.09169 6.24493 1.76516 6.64655 1.56052C6.91798 1.42222 7.19862 1.37189 7.47586 1.34924C7.73755 1.32785 8.05442 1.32787 8.41781 1.32788ZM4.90446 5.59677V12.5997C4.90446 13.1935 4.90505 13.5939 4.93026 13.9025C4.95477 14.2024 4.99874 14.3492 5.04906 14.4479C5.17625 14.6976 5.37921 14.9005 5.62883 15.0277C5.72759 15.078 5.87434 15.122 6.17425 15.1465C6.48291 15.1717 6.88323 15.1723 7.47713 15.1723H10.5229C11.1168 15.1723 11.5171 15.1717 11.8258 15.1465C12.1257 15.122 12.2724 15.078 12.3712 15.0277C12.6208 14.9005 12.8238 14.6976 12.951 14.4479C13.0013 14.3492 13.0453 14.2024 13.0698 13.9025C13.095 13.5939 13.0956 13.1935 13.0956 12.5997V5.59677H4.90446ZM11.0188 4.09677H6.98126C6.98179 3.80602 6.98446 3.60435 6.9975 3.44477C7.01257 3.26029 7.03768 3.19902 7.05028 3.17429C7.1111 3.05492 7.20816 2.95786 7.32754 2.89703C7.35226 2.88444 7.41353 2.85933 7.59801 2.84425C7.79124 2.82847 8.04618 2.82788 8.44624 2.82788H9.55379C9.95385 2.82788 10.2088 2.82847 10.402 2.84425C10.5865 2.85933 10.6478 2.88444 10.6725 2.89703C10.7919 2.95786 10.8889 3.05492 10.9498 3.17429C10.9623 3.19902 10.9875 3.26029 11.0025 3.44477C11.0156 3.60435 11.0182 3.80602 11.0188 4.09677ZM7.61557 7.90399C8.02978 7.90399 8.36557 8.23977 8.36557 8.65399V12.1151C8.36557 12.5293 8.02978 12.8651 7.61557 12.8651C7.20136 12.8651 6.86557 12.5293 6.86557 12.1151V8.65399C6.86557 8.23977 7.20136 7.90399 7.61557 7.90399ZM10.3845 7.90399C10.7987 7.90399 11.1345 8.23977 11.1345 8.65399V12.1151C11.1345 12.5293 10.7987 12.8651 10.3845 12.8651C9.97024 12.8651 9.63446 12.5293 9.63446 12.1151V8.65399C9.63446 8.23977 9.97024 7.90399 10.3845 7.90399Z"
                        fill="currentcolor"
                      />
                    </svg>
                  </Button>

                  <VStack
                    w="full"
                    spacing="24px"
                    justifyContent="center"
                    alignItems="center"
                    align="stretch">
                    <FormControl isRequired>
                      <Controller
                        name={`${index}.type`}
                        control={control}
                        render={({ field }) => {
                          // Get current form types
                          const currentFormTypes = Object.values(formValues)
                            .map((item) => String(item.type))
                            .filter(
                              (type): type is ChannelType =>
                                type !== undefined && type in channelTypeNames
                            )
                            .map((type) => channelTypeNames[type])

                          // Filter available types
                          const availableTypes = allSupportChannel.filter(
                            (channelType) =>
                              !currentFormTypes.includes(channelType) ||
                              // 避免编辑时当前选中值"消失"的问题，即当前选择项也包含
                              (field.value &&
                                channelTypeNames[String(field.value) as ChannelType] ===
                                  channelType)
                          )

                          const initSelectedItem = field.value
                            ? channelTypeNames[String(field.value) as ChannelType]
                            : undefined

                          return (
                            <SingleSelectCombobox<string>
                              dropdownItems={availableTypes}
                              initSelectedItem={initSelectedItem}
                              setSelectedItem={(channelName: string) => {
                                if (channelName) {
                                  const channelType = Object.entries(channelTypeNames).find(
                                    ([_, name]) => name === channelName
                                  )?.[0]

                                  if (channelType) {
                                    const defaultModelField =
                                      defaultModel[channelType as ChannelType]
                                    const defaultModelMappingField =
                                      defaultModelMapping[channelType as ChannelType]

                                    field.onChange(Number(channelType))
                                    setValue(`${index}.defaultMode`, defaultModelField || [])
                                    setValue(
                                      `${index}.defaultModeMapping`,
                                      defaultModelMappingField || {}
                                    )
                                  }
                                }
                              }}
                              handleDropdownItemFilter={(
                                dropdownItems: string[],
                                inputValue: string
                              ) => {
                                const lowerCasedInput = inputValue.toLowerCase()
                                return dropdownItems.filter(
                                  (item) =>
                                    !inputValue || item.toLowerCase().includes(lowerCasedInput)
                                )
                              }}
                              handleDropdownItemDisplay={(item: string) => (
                                <Text
                                  color="grayModern.600"
                                  fontFamily="PingFang SC"
                                  fontSize="12px"
                                  fontStyle="normal"
                                  fontWeight={400}
                                  lineHeight="16px"
                                  letterSpacing="0.048px">
                                  {item}
                                </Text>
                              )}
                            />
                          )
                        }}
                      />
                    </FormControl>

                    <FormControl>
                      <Controller
                        name={`${index}.defaultMode`}
                        control={control}
                        render={({ field }) => {
                          // Get the current type value from the form
                          const currentType = watch(`${index}.type`)
                          const dropdownItems = currentType
                            ? allSupportChannelWithMode[String(currentType) as ChannelType] || []
                            : []

                          const handleSetCustomModel = (
                            selectedItems: string[],
                            setSelectedItems: Dispatch<SetStateAction<string[]>>,
                            customModeName: string,
                            setCustomModeName: Dispatch<SetStateAction<string>>
                          ) => {
                            if (customModeName.trim()) {
                              const exists = field.value.some(
                                (item) => item === customModeName.trim()
                              )

                              if (!exists) {
                                field.onChange([...field.value, customModeName.trim()])
                                setCustomModeName('')
                              }
                            }
                          }

                          const handleModelFilteredDropdownItems = (
                            dropdownItems: string[],
                            selectedItems: string[],
                            inputValue: string
                          ) => {
                            const lowerCasedInputValue = inputValue.toLowerCase()

                            return dropdownItems.filter(
                              (item) =>
                                !selectedItems.includes(item) &&
                                item.toLowerCase().includes(lowerCasedInputValue)
                            )
                          }

                          return (
                            <MultiSelectCombobox<string>
                              dropdownItems={dropdownItems || []}
                              selectedItems={field.value || []} // Use field.value for selected items
                              setSelectedItems={(models) => {
                                field.onChange(models)
                              }}
                              handleFilteredDropdownItems={handleModelFilteredDropdownItems}
                              handleDropdownItemDisplay={(item) => (
                                <Text
                                  color="grayModern.600"
                                  fontFamily="PingFang SC"
                                  fontSize="12px"
                                  fontWeight={500}
                                  lineHeight="16px"
                                  letterSpacing="0.5px">
                                  {item}
                                </Text>
                              )}
                              handleSelectedItemDisplay={(item) => (
                                <Text
                                  color="grayModern.900"
                                  fontFamily="PingFang SC"
                                  fontSize="14px"
                                  fontStyle="normal"
                                  fontWeight={400}
                                  lineHeight="20px"
                                  letterSpacing="0.25px">
                                  {item}
                                </Text>
                              )}
                              handleSetCustomSelectedItem={handleSetCustomModel}
                            />
                          )
                        }}
                      />
                    </FormControl>

                    <FormControl>
                      <Controller
                        name={`${index}.defaultModeMapping`}
                        control={control}
                        render={({ field }) => {
                          const defaultMode = watch(`${index}.defaultMode`)
                          const defaultModeMapping = watch(`${index}.defaultModeMapping`)

                          return (
                            <ConstructMappingComponent
                              mapKeys={defaultMode}
                              mapData={defaultModeMapping}
                              setMapData={(mapping) => {
                                field.onChange(mapping)
                              }}
                            />
                          )
                        }}
                      />
                    </FormControl>
                  </VStack>
                </Flex>
              )
            })
          )}
        </Flex>
      </Flex>
      {/* -- config end */}
    </Flex>
  )
}

export default ModelConfig

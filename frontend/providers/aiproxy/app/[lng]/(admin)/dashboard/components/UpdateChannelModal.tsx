'use client'
import {
  Button,
  Flex,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  Input,
  FormErrorMessage,
  ModalFooter,
  FormLabel,
  VStack,
  Center,
  Spinner,
  Badge
} from '@chakra-ui/react'
import { useMessage } from '@sealos/ui'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { ChannelInfo, ChannelStatus, ChannelType } from '@/types/admin/channels/channelInfo'
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'
import { Dispatch, SetStateAction, useEffect } from 'react'
import {
  getChannelBuiltInSupportModels,
  getChannelDefaultModelAndDefaultModeMapping,
  getChannelTypeNames
} from '@/api/platform'
import { FieldErrors, useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { MultiSelectCombobox } from '@/components/common/MultiSelectCombobox'
import { SingleSelectCombobox } from '@/components/common/SingleSelectCombobox'
import ConstructModeMappingComponent from '@/components/common/ConstructModeMappingComponent'
import { createChannel, updateChannel } from '@/api/platform'
import { QueryKey } from '@/types/query-key'

type Model = {
  name: string
  isDefault: boolean
}

export const UpdateChannelModal = function ({
  isOpen,
  onClose,
  operationType,
  channelInfo
}: {
  isOpen: boolean
  onClose: () => void
  operationType: 'create' | 'update'
  channelInfo?: ChannelInfo
}): JSX.Element {
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

  const { isLoading: isChannelTypeNamesLoading, data: channelTypeNames } = useQuery({
    queryKey: [QueryKey.GetChannelTypeNames],
    queryFn: () => getChannelTypeNames()
  })

  const { isLoading: isBuiltInSupportModelsLoading, data: builtInSupportModels } = useQuery({
    queryKey: [QueryKey.GetAllChannelModes],
    queryFn: () => getChannelBuiltInSupportModels()
  })

  const { isLoading: isDefaultEnabledModelsLoading, data: defaultEnabledModels } = useQuery({
    queryKey: [QueryKey.GetDefaultModelAndModeMapping],
    queryFn: () => getChannelDefaultModelAndDefaultModeMapping()
  })

  // model type select combobox
  const handleModelTypeDropdownItemFilter = (dropdownItems: string[], inputValue: string) => {
    const lowerCasedInput = inputValue.toLowerCase()
    return dropdownItems.filter(
      (item) => !inputValue || item.toLowerCase().includes(lowerCasedInput)
    )
  }

  const handleModelTypeDropdownItemDisplay = (dropdownItem: string) => {
    return (
      <Text
        color="grayModern.600"
        fontFamily="PingFang SC"
        fontSize="12px"
        fontStyle="normal"
        fontWeight={400}
        lineHeight="16px"
        letterSpacing="0.048px">
        {dropdownItem}
      </Text>
    )
  }

  // model select combobox
  const handleModelFilteredDropdownItems = (
    dropdownItems: Model[],
    selectedItems: Model[],
    inputValue: string
  ) => {
    const lowerCasedInputValue = inputValue.toLowerCase()

    // First filter out items that are already selected
    const unselectedItems = dropdownItems.filter(
      (dropdownItem) =>
        !selectedItems.some((selectedItem) => selectedItem.name === dropdownItem.name)
    )

    // Then filter by input value
    return unselectedItems.filter((item) => item.name.toLowerCase().includes(lowerCasedInputValue))
  }

  const handleModelDropdownItemDisplay = (dropdownItem: Model) => {
    if (dropdownItem.isDefault) {
      return (
        <Flex alignItems="center" gap="8px">
          <Text
            color="grayModern.600"
            fontFamily="PingFang SC"
            fontSize="12px"
            fontWeight={500}
            lineHeight="16px"
            letterSpacing="0.5px">
            {dropdownItem.name}
          </Text>
          <Badge
            display="flex"
            padding="4px 8px"
            justifyContent="center"
            alignItems="center"
            gap="4px"
            borderRadius="33px"
            background="grayModern.100"
            mixBlendMode="multiply">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.74997 0.714878L8.22533 1.56668L8.22345 1.56993C8.24059 1.57694 8.25731 1.58514 8.27351 1.59449C8.63523 1.80333 8.49477 2.44228 8.09298 2.55641C7.64176 2.68458 7.21349 2.86732 6.81576 3.09704C7.88708 4.08166 8.63497 5.4127 8.88183 6.91256C9.29901 6.66528 9.68171 6.36596 10.021 6.02354C10.3136 5.72817 10.9521 5.92322 10.9521 6.33902V7.99316C10.9521 8.52906 10.6662 9.02425 10.2021 9.2922L8.38215 10.3429L8.37557 10.3315C8.0325 10.4206 7.62541 9.98967 7.73357 9.62836C7.85051 9.2377 7.9264 8.82931 7.95623 8.40819C7.33755 8.59803 6.68053 8.7002 5.99963 8.7002C5.30124 8.7002 4.62795 8.59271 3.99541 8.39338C4.02377 8.80912 4.09702 9.21253 4.21034 9.59881C4.31853 9.96756 3.89749 10.4028 3.55054 10.2939L3.54609 10.3015L1.79785 9.2922C1.33375 9.02425 1.04785 8.52906 1.04785 7.99316V6.33971C1.04785 5.92389 1.68618 5.72882 1.97889 6.02416C2.3065 6.3547 2.67457 6.64506 3.07507 6.88719C3.32615 5.39769 4.07163 4.07611 5.1369 3.09704C4.74758 2.87218 4.329 2.69233 3.88826 2.56461C3.4869 2.4483 3.34916 1.81231 3.71105 1.60337C3.71916 1.59869 3.72741 1.59429 3.73577 1.59019L3.7353 1.58937L5.24997 0.714878C5.71407 0.446928 6.28587 0.446929 6.74997 0.714878ZM5.10359 1.95409C5.4076 2.09475 5.69921 2.25766 5.97633 2.44073C6.26144 2.25239 6.56189 2.08538 6.87539 1.94199L6.24997 1.5809C6.09527 1.49159 5.90467 1.49159 5.74997 1.5809L5.10359 1.95409ZM2.04785 7.40181V7.99316C2.04785 8.1718 2.14315 8.33686 2.29785 8.42618L3.03582 8.85224C3.00038 8.57396 2.98212 8.29031 2.98212 8.0024L2.98216 7.9791C2.65411 7.81211 2.34175 7.61875 2.04785 7.40181ZM8.91302 8.88175L9.70209 8.42618C9.85679 8.33686 9.95209 8.1718 9.95209 7.99316V7.40131C9.64413 7.6287 9.31588 7.83019 8.97055 8.00257C8.97054 8.30061 8.95096 8.59407 8.91302 8.88175ZM7.9346 7.36087C7.33089 7.58044 6.67925 7.7002 5.99963 7.7002C5.30321 7.7002 4.63616 7.57444 4.01995 7.34439C4.18895 5.88454 4.91333 4.59396 5.97633 3.68939C7.04334 4.59736 7.76917 5.89426 7.9346 7.36087Z"
                fill="#667085"
              />
              <path
                d="M8.79009 2.46925C8.65153 2.70844 8.73335 3.01468 8.97274 3.15289L9.70209 3.57399C9.85679 3.6633 9.95209 3.82837 9.95209 4.007V5.01917C9.95209 5.29532 10.1759 5.51917 10.4521 5.51917C10.7282 5.51917 10.9521 5.29532 10.9521 5.01917V4.007C10.9521 3.4711 10.6662 2.97591 10.2021 2.70796L9.47274 2.28687C9.23384 2.14894 8.92837 2.23055 8.79009 2.46925Z"
                fill="#667085"
              />
              <path
                d="M7.51448 10.2665C7.65255 10.5057 7.57062 10.8115 7.33147 10.9496L6.74997 11.2853C6.28587 11.5532 5.71407 11.5532 5.24997 11.2853L4.66318 10.9465C4.42378 10.8083 4.34197 10.502 4.48053 10.2629C4.61881 10.0242 4.92428 9.94254 5.16318 10.0805L5.74997 10.4193C5.90467 10.5086 6.09527 10.5086 6.24997 10.4193L6.83147 10.0835C7.07062 9.94546 7.37641 10.0274 7.51448 10.2665Z"
                fill="#667085"
              />
              <path
                d="M1.54785 5.52476C1.27171 5.52476 1.04785 5.3009 1.04785 5.02476V4.007C1.04785 3.4711 1.33375 2.97591 1.79785 2.70796L2.51571 2.29351C2.75485 2.15544 3.06065 2.23737 3.19872 2.47652C3.33679 2.71567 3.25485 3.02146 3.01571 3.15953L2.29785 3.57399C2.14315 3.6633 2.04785 3.82837 2.04785 4.007V5.02476C2.04785 5.3009 1.82399 5.52476 1.54785 5.52476Z"
                fill="#667085"
              />
            </svg>
            <Text
              color="grayModern.500"
              fontFamily="PingFang SC"
              fontSize="10px"
              fontStyle="normal"
              fontWeight={500}
              lineHeight="14px"
              letterSpacing="0.2px">
              {t('channels.modelDefault')}
            </Text>
          </Badge>
        </Flex>
      )
    }
    return (
      <Text
        color="grayModern.600"
        fontFamily="PingFang SC"
        fontSize="12px"
        fontWeight={500}
        lineHeight="16px"
        letterSpacing="0.5px">
        {dropdownItem.name}
      </Text>
    )
  }

  const handleModelSelectedItemDisplay = (selectedItem: Model) => {
    if (selectedItem.isDefault) {
      return (
        <Flex alignItems="center" gap="8px">
          <Text
            color="grayModern.900"
            fontFamily="PingFang SC"
            fontSize="14px"
            fontStyle="normal"
            fontWeight={400}
            lineHeight="20px"
            letterSpacing="0.25px">
            {selectedItem.name}
          </Text>
          <Badge
            display="flex"
            padding="4px 8px"
            justifyContent="center"
            alignItems="center"
            gap="4px"
            borderRadius="33px"
            background="grayModern.100"
            mixBlendMode="multiply">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.74997 0.714878L8.22533 1.56668L8.22345 1.56993C8.24059 1.57694 8.25731 1.58514 8.27351 1.59449C8.63523 1.80333 8.49477 2.44228 8.09298 2.55641C7.64176 2.68458 7.21349 2.86732 6.81576 3.09704C7.88708 4.08166 8.63497 5.4127 8.88183 6.91256C9.29901 6.66528 9.68171 6.36596 10.021 6.02354C10.3136 5.72817 10.9521 5.92322 10.9521 6.33902V7.99316C10.9521 8.52906 10.6662 9.02425 10.2021 9.2922L8.38215 10.3429L8.37557 10.3315C8.0325 10.4206 7.62541 9.98967 7.73357 9.62836C7.85051 9.2377 7.9264 8.82931 7.95623 8.40819C7.33755 8.59803 6.68053 8.7002 5.99963 8.7002C5.30124 8.7002 4.62795 8.59271 3.99541 8.39338C4.02377 8.80912 4.09702 9.21253 4.21034 9.59881C4.31853 9.96756 3.89749 10.4028 3.55054 10.2939L3.54609 10.3015L1.79785 9.2922C1.33375 9.02425 1.04785 8.52906 1.04785 7.99316V6.33971C1.04785 5.92389 1.68618 5.72882 1.97889 6.02416C2.3065 6.3547 2.67457 6.64506 3.07507 6.88719C3.32615 5.39769 4.07163 4.07611 5.1369 3.09704C4.74758 2.87218 4.329 2.69233 3.88826 2.56461C3.4869 2.4483 3.34916 1.81231 3.71105 1.60337C3.71916 1.59869 3.72741 1.59429 3.73577 1.59019L3.7353 1.58937L5.24997 0.714878C5.71407 0.446928 6.28587 0.446929 6.74997 0.714878ZM5.10359 1.95409C5.4076 2.09475 5.69921 2.25766 5.97633 2.44073C6.26144 2.25239 6.56189 2.08538 6.87539 1.94199L6.24997 1.5809C6.09527 1.49159 5.90467 1.49159 5.74997 1.5809L5.10359 1.95409ZM2.04785 7.40181V7.99316C2.04785 8.1718 2.14315 8.33686 2.29785 8.42618L3.03582 8.85224C3.00038 8.57396 2.98212 8.29031 2.98212 8.0024L2.98216 7.9791C2.65411 7.81211 2.34175 7.61875 2.04785 7.40181ZM8.91302 8.88175L9.70209 8.42618C9.85679 8.33686 9.95209 8.1718 9.95209 7.99316V7.40131C9.64413 7.6287 9.31588 7.83019 8.97055 8.00257C8.97054 8.30061 8.95096 8.59407 8.91302 8.88175ZM7.9346 7.36087C7.33089 7.58044 6.67925 7.7002 5.99963 7.7002C5.30321 7.7002 4.63616 7.57444 4.01995 7.34439C4.18895 5.88454 4.91333 4.59396 5.97633 3.68939C7.04334 4.59736 7.76917 5.89426 7.9346 7.36087Z"
                fill="#667085"
              />
              <path
                d="M8.79009 2.46925C8.65153 2.70844 8.73335 3.01468 8.97274 3.15289L9.70209 3.57399C9.85679 3.6633 9.95209 3.82837 9.95209 4.007V5.01917C9.95209 5.29532 10.1759 5.51917 10.4521 5.51917C10.7282 5.51917 10.9521 5.29532 10.9521 5.01917V4.007C10.9521 3.4711 10.6662 2.97591 10.2021 2.70796L9.47274 2.28687C9.23384 2.14894 8.92837 2.23055 8.79009 2.46925Z"
                fill="#667085"
              />
              <path
                d="M7.51448 10.2665C7.65255 10.5057 7.57062 10.8115 7.33147 10.9496L6.74997 11.2853C6.28587 11.5532 5.71407 11.5532 5.24997 11.2853L4.66318 10.9465C4.42378 10.8083 4.34197 10.502 4.48053 10.2629C4.61881 10.0242 4.92428 9.94254 5.16318 10.0805L5.74997 10.4193C5.90467 10.5086 6.09527 10.5086 6.24997 10.4193L6.83147 10.0835C7.07062 9.94546 7.37641 10.0274 7.51448 10.2665Z"
                fill="#667085"
              />
              <path
                d="M1.54785 5.52476C1.27171 5.52476 1.04785 5.3009 1.04785 5.02476V4.007C1.04785 3.4711 1.33375 2.97591 1.79785 2.70796L2.51571 2.29351C2.75485 2.15544 3.06065 2.23737 3.19872 2.47652C3.33679 2.71567 3.25485 3.02146 3.01571 3.15953L2.29785 3.57399C2.14315 3.6633 2.04785 3.82837 2.04785 4.007V5.02476C2.04785 5.3009 1.82399 5.52476 1.54785 5.52476Z"
                fill="#667085"
              />
            </svg>
          </Badge>
        </Flex>
      )
    }
    return (
      <Text
        color="grayModern.900"
        fontFamily="PingFang SC"
        fontSize="14px"
        fontStyle="normal"
        fontWeight={400}
        lineHeight="20px"
        letterSpacing="0.25px">
        {selectedItem.name}
      </Text>
    )
  }

  const handleSetCustomModel = (
    selectedItems: Model[],
    setSelectedItems: Dispatch<SetStateAction<Model[]>>,
    customModeName: string,
    setCustomModeName: Dispatch<SetStateAction<string>>
  ) => {
    if (customModeName.trim()) {
      const newModel: Model = {
        name: customModeName.trim(),
        isDefault: false
      }

      const exists = selectedItems.some((item) => item.name === customModeName.trim())

      if (!exists) {
        setSelectedItems([...selectedItems, newModel])
        setCustomModeName('')
      }
    }
  }

  // form schema
  const schema = z.object({
    id: z.number().optional(),
    type: z.number(),
    name: z.string().min(1, { message: t('channels.name_required') }),
    key: z.string().min(1, { message: t('channels.key_required') }),
    base_url: z.string(),
    models: z.array(z.string()).default([]),
    model_mapping: z.record(z.string(), z.any()).default({})
  })

  const id = channelInfo?.id
  type FormData = z.infer<typeof schema>

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
    defaultValues: {
      id: id,
      type: undefined,
      name: '',
      key: '',
      base_url: '',
      models: [],
      model_mapping: {}
    },
    mode: 'onChange',
    reValidateMode: 'onChange'
  })

  useEffect(() => {
    if (channelInfo) {
      const { id, type, name, key, base_url, models, model_mapping } = channelInfo
      reset({ id, type, name, key, base_url, models, model_mapping })
    }
  }, [channelInfo])

  const resetModalState = () => {
    reset()
  }

  const createChannelMutation = useMutation({
    mutationFn: createChannel,
    onSuccess: () => {
      message({
        title: t('channels.createSuccess'),
        status: 'success'
      })
    }
  })

  const updateChannelMutation = useMutation({
    mutationFn: (data: FormData) =>
      updateChannel(
        {
          type: data.type,
          name: data.name,
          key: data.key,
          base_url: data.base_url,
          models: data.models,
          model_mapping: data.model_mapping
        },
        data.id!.toString()
      ),
    onSuccess: () => {
      message({
        title: t('channels.updateSuccess'),
        status: 'success'
      })
    }
  })

  const onValidate = async (data: FormData) => {
    try {
      switch (operationType) {
        case 'create':
          await createChannelMutation.mutateAsync({
            type: data.type,
            name: data.name,
            key: data.key,
            base_url: data.base_url,
            models: data.models,
            model_mapping: data.model_mapping
          })
          break
        case 'update':
          await updateChannelMutation.mutateAsync(data)
          break
      }
      queryClient.invalidateQueries({ queryKey: [QueryKey.GetChannels] })
      queryClient.invalidateQueries({ queryKey: [QueryKey.GetDefaultModelAndModeMapping] })
      queryClient.invalidateQueries({ queryKey: [QueryKey.GetChannelTypeNames] })
      queryClient.invalidateQueries({ queryKey: [QueryKey.GetAllChannelModes] })
      resetModalState()
      onClose()
    } catch (error) {
      switch (operationType) {
        case 'create':
          message({
            title: t('channels.createFailed'),
            status: 'error',
            position: 'top',
            duration: 2000,
            isClosable: true,
            description: error instanceof Error ? error.message : t('channels.createFailed')
          })
          break
        case 'update':
          message({
            title: t('channels.updateFailed'),
            status: 'error',
            position: 'top',
            duration: 2000,
            isClosable: true,
            description: error instanceof Error ? error.message : t('channels.updateFailed')
          })
          break
      }
    }
  }

  const onInvalid = (errors: FieldErrors<FormData>): void => {
    const firstErrorMessage = Object.values(errors)[0]?.message
    if (firstErrorMessage) {
      message({
        title: firstErrorMessage as string,
        status: 'error',
        position: 'top',
        duration: 2000,
        isClosable: true
      })
    }
  }

  const onSubmit = handleSubmit(onValidate, onInvalid)

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      {isOpen &&
        (isBuiltInSupportModelsLoading ||
        isDefaultEnabledModelsLoading ||
        isChannelTypeNamesLoading ||
        !builtInSupportModels ||
        !defaultEnabledModels ||
        !channelTypeNames ? (
          <>
            <ModalOverlay />
            <ModalContent w="530px" h="768px">
              <ModalHeader
                height="48px"
                padding="10px 20px"
                justifyContent="center"
                alignItems="center"
                flexShrink="0"
                borderBottom="1px solid grayModern.100"
                background="grayModern.25"
                w="full">
                <Flex alignItems="flex-start" flexShrink={0}>
                  <Text
                    color="grayModern.900"
                    fontFamily="PingFang SC"
                    fontSize="16px"
                    fontStyle="normal"
                    fontWeight={500}
                    lineHeight="24px"
                    letterSpacing="0.15px">
                    {operationType === 'create' ? t('channels.create') : t('channels.edit')}
                  </Text>
                </Flex>
              </ModalHeader>
              <ModalCloseButton
                display="flex"
                width="28px"
                height="28px"
                padding="4px"
                justifyContent="center"
                alignItems="center"
                flexShrink="0"
                borderRadius="4px"
              />
              <ModalBody w="full" h="full" m="0">
                <Center w="full" h="full" alignSelf="center">
                  <Spinner />
                </Center>
              </ModalBody>
            </ModalContent>
          </>
        ) : (
          <>
            <ModalOverlay />
            <ModalContent
              minW="530px"
              m="0"
              p="0"
              flexDirection="column"
              justifyContent="center"
              alignItems="flex-start"
              borderRadius="10px"
              background="white"
              boxShadow="0px 32px 64px -12px rgba(19, 51, 107, 0.20), 0px 0px 1px 0px rgba(19, 51, 107, 0.20)">
              {/* header */}
              <ModalHeader
                height="48px"
                padding="10px 20px"
                justifyContent="center"
                alignItems="center"
                flexShrink="0"
                borderBottom="1px solid grayModern.100"
                background="grayModern.25"
                w="full">
                <Flex alignItems="flex-start" flexShrink={0}>
                  <Text
                    color="grayModern.900"
                    fontFamily="PingFang SC"
                    fontSize="16px"
                    fontStyle="normal"
                    fontWeight={500}
                    lineHeight="24px"
                    letterSpacing="0.15px">
                    {operationType === 'create' ? t('channels.create') : t('channels.edit')}
                  </Text>
                </Flex>
              </ModalHeader>
              <ModalCloseButton
                display="flex"
                width="28px"
                height="28px"
                padding="4px"
                justifyContent="center"
                alignItems="center"
                flexShrink={0}
                borderRadius="4px"
              />
              {/* body */}
              <ModalBody w="full" h="full" m="0" p="24px 36px 24px 36px">
                <VStack
                  as="form"
                  h="full"
                  w="full"
                  onSubmit={onSubmit}
                  spacing="24px"
                  justifyContent="center"
                  alignItems="center"
                  align="stretch">
                  <FormControl isInvalid={!!errors.name} isRequired>
                    <VStack w="full" alignItems="flex-start" gap="8px">
                      <FormLabel
                        color="grayModern.900"
                        fontFamily="PingFang SC"
                        fontSize="14px"
                        fontStyle="normal"
                        fontWeight={500}
                        lineHeight="20px"
                        letterSpacing="0.1px"
                        display="flex"
                        alignItems="center"
                        h="20px"
                        justifyContent="flex-start"
                        m={0}>
                        {t('channelsForm.name')}
                      </FormLabel>

                      <Input
                        display="flex"
                        h="32px"
                        py="8px"
                        px="12px"
                        alignItems="center"
                        borderRadius="6px"
                        border="1px solid var(--Gray-Modern-200, #E8EBF0)"
                        bgColor="grayModern.50"
                        variant="unstyled"
                        placeholder={t('channelsFormPlaceholder.name')}
                        color="var(--light-general-on-surface, var(--Gray-Modern-900, #111824))"
                        fontFamily="PingFang SC"
                        fontSize="12px"
                        fontWeight={400}
                        lineHeight="16px"
                        letterSpacing="0.048px"
                        _placeholder={{
                          color: 'grayModern.500',
                          fontFamily: 'PingFang SC',
                          fontSize: '12px',
                          fontWeight: 400,
                          lineHeight: '16px',
                          letterSpacing: '0.048px'
                        }}
                        {...register('name')}
                      />
                      {errors.name && <FormErrorMessage>{errors.name.message}</FormErrorMessage>}
                    </VStack>
                  </FormControl>

                  <FormControl isInvalid={!!errors.type} isRequired>
                    <Controller
                      name="type"
                      control={control}
                      render={({ field }) => {
                        const availableChannels = Object.entries(channelTypeNames)
                          .filter(([channel]) => channel in builtInSupportModels)
                          .map(([_, name]) => name)

                        const initSelectedItem = field.value
                          ? channelTypeNames[String(field.value) as ChannelType]
                          : undefined

                        return (
                          <SingleSelectCombobox<string>
                            dropdownItems={availableChannels}
                            initSelectedItem={initSelectedItem}
                            setSelectedItem={(channelName: string) => {
                              if (channelName) {
                                const channelType = Object.entries(channelTypeNames).find(
                                  ([_, name]) => name === channelName
                                )?.[0]

                                if (channelType) {
                                  const numericChannel = Number(channelType)
                                  field.onChange(numericChannel)
                                  setValue('models', [])
                                  setValue('model_mapping', {})
                                }
                              }
                            }}
                            handleDropdownItemFilter={handleModelTypeDropdownItemFilter}
                            handleDropdownItemDisplay={handleModelTypeDropdownItemDisplay}
                          />
                        )
                      }}
                    />
                    {errors.type && <FormErrorMessage>{errors.type.message}</FormErrorMessage>}
                  </FormControl>

                  <FormControl isInvalid={!!errors.models}>
                    <Controller
                      name="models"
                      control={control}
                      render={({ field }) => {
                        const channelType = String(watch('type')) as ChannelType

                        const builtInModes =
                          builtInSupportModels[channelType]?.map((mode) => mode.model) || []
                        const defaultModes = defaultEnabledModels.models[channelType] || []

                        const allModes: Model[] = builtInModes.map((modeName) => ({
                          name: modeName,
                          isDefault: defaultModes.includes(modeName)
                        }))

                        const selectedModels: Model[] = field.value.map((modeName) => ({
                          name: modeName,
                          isDefault: defaultModes.includes(modeName)
                        }))

                        return (
                          <MultiSelectCombobox<Model>
                            dropdownItems={allModes}
                            selectedItems={selectedModels}
                            setSelectedItems={(models) => {
                              field.onChange((models as Model[]).map((m) => m.name))
                            }}
                            handleFilteredDropdownItems={handleModelFilteredDropdownItems}
                            handleDropdownItemDisplay={handleModelDropdownItemDisplay}
                            handleSelectedItemDisplay={handleModelSelectedItemDisplay}
                            handleSetCustomSelectedItem={handleSetCustomModel}
                          />
                        )
                      }}
                    />
                    {errors.models && <FormErrorMessage>{errors.models.message}</FormErrorMessage>}
                  </FormControl>

                  <FormControl isInvalid={!!errors.model_mapping}>
                    <Controller
                      name="model_mapping"
                      control={control}
                      render={({ field }) => {
                        const channelType = String(watch('type')) as ChannelType

                        const selectedModels = watch('models')
                        const defaultModes = defaultEnabledModels.models[channelType] || []

                        const covertedSelectedModels: Model[] = selectedModels.map((modeName) => ({
                          name: modeName,
                          isDefault: defaultModes.includes(modeName)
                        }))
                        return (
                          <ConstructModeMappingComponent
                            mapKeys={covertedSelectedModels}
                            mapData={field.value}
                            setMapData={(mapping) => {
                              field.onChange(mapping)
                            }}
                          />
                        )
                      }}
                    />
                    {errors.model_mapping?.message && (
                      <FormErrorMessage>{errors.model_mapping.message.toString()}</FormErrorMessage>
                    )}
                  </FormControl>

                  <FormControl isInvalid={!!errors.key} isRequired>
                    <VStack w="full" alignItems="flex-start" gap="8px">
                      <FormLabel
                        color="grayModern.900"
                        fontFamily="PingFang SC"
                        fontSize="14px"
                        fontStyle="normal"
                        fontWeight={500}
                        lineHeight="20px"
                        letterSpacing="0.1px"
                        display="flex"
                        alignItems="center"
                        h="20px"
                        justifyContent="flex-start"
                        m={0}>
                        {t('channelsForm.key')}
                      </FormLabel>

                      <Input
                        display="flex"
                        h="32px"
                        py="8px"
                        px="12px"
                        alignItems="center"
                        borderRadius="6px"
                        border="1px solid var(--Gray-Modern-200, #E8EBF0)"
                        bgColor="grayModern.50"
                        variant="unstyled"
                        placeholder={t('channelsFormPlaceholder.key')}
                        color="var(--light-general-on-surface, var(--Gray-Modern-900, #111824))"
                        fontFamily="PingFang SC"
                        fontSize="12px"
                        fontWeight={400}
                        lineHeight="16px"
                        letterSpacing="0.048px"
                        _placeholder={{
                          color: 'grayModern.500',
                          fontFamily: 'PingFang SC',
                          fontSize: '12px',
                          fontWeight: 400,
                          lineHeight: '16px',
                          letterSpacing: '0.048px'
                        }}
                        {...register('key')}
                      />
                      {errors.key && <FormErrorMessage>{errors.key.message}</FormErrorMessage>}
                    </VStack>
                  </FormControl>

                  <FormControl isInvalid={!!errors.base_url} isRequired>
                    <VStack w="full" alignItems="flex-start" gap="8px">
                      <FormLabel
                        color="grayModern.900"
                        fontFamily="PingFang SC"
                        fontSize="14px"
                        fontStyle="normal"
                        fontWeight={500}
                        lineHeight="20px"
                        letterSpacing="0.1px"
                        display="flex"
                        alignItems="center"
                        h="20px"
                        justifyContent="flex-start"
                        m={0}>
                        {t('channelsForm.base_url')}
                      </FormLabel>

                      <Input
                        display="flex"
                        h="32px"
                        py="8px"
                        px="12px"
                        alignItems="center"
                        borderRadius="6px"
                        border="1px solid var(--Gray-Modern-200, #E8EBF0)"
                        bgColor="grayModern.50"
                        variant="unstyled"
                        placeholder={t('channelsFormPlaceholder.base_url')}
                        color="var(--light-general-on-surface, var(--Gray-Modern-900, #111824))"
                        fontFamily="PingFang SC"
                        fontSize="12px"
                        fontWeight={400}
                        lineHeight="16px"
                        letterSpacing="0.048px"
                        _placeholder={{
                          color: 'grayModern.500',
                          fontFamily: 'PingFang SC',
                          fontSize: '12px',
                          fontWeight: 400,
                          lineHeight: '16px',
                          letterSpacing: '0.048px'
                        }}
                        {...register('base_url')}
                      />
                      {errors.base_url && (
                        <FormErrorMessage>{errors.base_url.message}</FormErrorMessage>
                      )}
                    </VStack>
                  </FormControl>
                </VStack>
              </ModalBody>
              <ModalFooter
                w="full"
                justifyContent="flex-end"
                alignItems="center"
                alignSelf="stretch"
                gap="16px"
                px="36px"
                pb="24px"
                pt="0"
                m="0">
                <Button
                  w="88px"
                  display="flex"
                  padding="8px 20px"
                  justifyContent="center"
                  alignItems="center"
                  gap="8px"
                  borderRadius="6px"
                  background="grayModern.900"
                  boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)"
                  _hover={{ background: 'var(--Gray-Modern-800, #1F2937)' }}
                  onClick={onSubmit}
                  isDisabled={createChannelMutation.isLoading || updateChannelMutation.isLoading}
                  isLoading={createChannelMutation.isLoading || updateChannelMutation.isLoading}>
                  {t('confirm')}
                </Button>
              </ModalFooter>
            </ModalContent>
          </>
        ))}
    </Modal>
  )
}

export default UpdateChannelModal

'use client'
import {
  Checkbox,
  Box,
  Button,
  Flex,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
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
  useDisclosure,
  FormLabel,
  HStack,
  VStack,
  Center,
  Select,
  ListItem,
  List,
  InputGroup,
  Spinner,
  Badge,
  IconButton
} from '@chakra-ui/react'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { EditIcon } from '@chakra-ui/icons'
import { Switch } from '@chakra-ui/react'
import { EditableText } from './EditableText'
import { MultiSelectCombobox } from '@/components/common/MultiSelectCombobox'
import { SingleSelectCombobox } from '@/components/common/SingleSelectCombobox'
import ConstructModeMappingComponent from '@/components/common/ConstructModeMappingComponent'
import { FieldError, FieldErrors, useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
const ModelConfig = () => {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')

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

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
    control
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      id: undefined,
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

  return (
    <Flex w="full" h="full" gap="8px" flexDirection="row" flex="1">
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
          {t('globalonfigs.model_config')}
        </Text>
      </Flex>
      {/* -- title end */}

      {/* config */}
      <Flex h="full" flexDirection="column" gap="12px" flex="1" minW="0">
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
          flexDirection="column">
          <Flex
            w="full"
            padding="24px 36px"
            alignSelf="stretch"
            borderRadius="4px"
            bg="grayModern.100">
            <VStack
              as="form"
              w="full"
              spacing="24px"
              justifyContent="center"
              alignItems="center"
              align="stretch">
              {/* <FormControl isInvalid={!!errors.type} isRequired> */}
              <FormControl isRequired>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <SingleSelectCombobox<any>
                      dropdownItems={[]}
                      setSelectedItem={(type) => {
                        if (type) {
                          field.onChange(null)
                        }
                      }}
                      handleDropdownItemFilter={() => {}}
                      handleDropdownItemDisplay={() => {}}
                    />
                  )}
                />
                {/* {errors.type && <FormErrorMessage>{errors.type.message}</FormErrorMessage>} */}
              </FormControl>

              {/* <FormControl isInvalid={!!errors.models}> */}
              <FormControl>
                <Controller
                  name="models"
                  control={control}
                  render={({ field }) => (
                    <MultiSelectCombobox<Model>
                      dropdownItems={[]}
                      selectedItems={[]}
                      setSelectedItems={(models) => {
                        field.onChange(models)
                      }}
                      handleFilteredDropdownItems={() => []}
                      handleDropdownItemDisplay={() => <></>}
                      handleSelectedItemDisplay={() => <></>}
                      handleSetCustomSelectedItem={() => {}}
                    />
                  )}
                />
                {/* {errors.models && <FormErrorMessage>{errors.models.message}</FormErrorMessage>} */}
              </FormControl>

              {/* <FormControl isInvalid={!!errors.model_mapping}> */}
              <FormControl>
                <Controller
                  name="model_mapping"
                  control={control}
                  render={({ field }) => (
                    <ConstructModeMappingComponent
                      mapKeys={[]}
                      mapData={field.value}
                      setMapData={(mapping) => {
                        field.onChange(mapping)
                      }}
                    />
                  )}
                />
                {/* {errors.model_mapping?.message && (
                  <FormErrorMessage>{errors.model_mapping.message.toString()}</FormErrorMessage>
                )} */}
              </FormControl>
            </VStack>
          </Flex>

          <Flex
            w="full"
            padding="24px 36px"
            alignSelf="stretch"
            borderRadius="4px"
            bg="grayModern.100">
            <VStack
              as="form"
              w="full"
              spacing="24px"
              justifyContent="center"
              alignItems="center"
              align="stretch">
              {/* <FormControl isInvalid={!!errors.type} isRequired> */}
              <FormControl isRequired>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <SingleSelectCombobox<any>
                      dropdownItems={[]}
                      setSelectedItem={(type) => {
                        if (type) {
                          field.onChange(null)
                        }
                      }}
                      handleDropdownItemFilter={() => {}}
                      handleDropdownItemDisplay={() => {}}
                    />
                  )}
                />
                {/* {errors.type && <FormErrorMessage>{errors.type.message}</FormErrorMessage>} */}
              </FormControl>

              {/* <FormControl isInvalid={!!errors.models}> */}
              <FormControl>
                <Controller
                  name="models"
                  control={control}
                  render={({ field }) => (
                    <MultiSelectCombobox<Model>
                      dropdownItems={[]}
                      selectedItems={[]}
                      setSelectedItems={(models) => {
                        field.onChange(models)
                      }}
                      handleFilteredDropdownItems={() => []}
                      handleDropdownItemDisplay={() => <></>}
                      handleSelectedItemDisplay={() => <></>}
                      handleSetCustomSelectedItem={() => {}}
                    />
                  )}
                />
                {/* {errors.models && <FormErrorMessage>{errors.models.message}</FormErrorMessage>} */}
              </FormControl>

              {/* <FormControl isInvalid={!!errors.model_mapping}> */}
              <FormControl>
                <Controller
                  name="model_mapping"
                  control={control}
                  render={({ field }) => (
                    <ConstructModeMappingComponent
                      mapKeys={[]}
                      mapData={field.value}
                      setMapData={(mapping) => {
                        field.onChange(mapping)
                      }}
                    />
                  )}
                />
                {/* {errors.model_mapping?.message && (
                  <FormErrorMessage>{errors.model_mapping.message.toString()}</FormErrorMessage>
                )} */}
              </FormControl>
            </VStack>
          </Flex>
        </Flex>
      </Flex>
      {/* -- config end */}
    </Flex>
  )
}

export default ModelConfig

'use client'
import {
  Box,
  Flex,
  Text,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Center,
  Spinner,
  Button,
  Icon,
  Input,
  InputGroup,
  InputRightElement,
  Badge
} from '@chakra-ui/react'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { getEnabledMode } from '@/api/platform'
import { useMemo, useState, useEffect } from 'react'
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  flexRender
} from '@tanstack/react-table'
import { CurrencySymbol } from '@sealos/ui'
import { MyTooltip } from '@/components/common/MyTooltip'
import { useMessage } from '@sealos/ui'
import { ModelConfig } from '@/types/models/model'
import Image, { StaticImageData } from 'next/image'
import { QueryKey } from '@/types/query-key'
import { getTranslationWithFallback } from '@/utils/common'
import { useBackendStore } from '@/store/backend'
import { modelIcons } from '@/ui/icons/mode-icons'
import { SingleSelectComboboxUnstyle } from '@/components/common/SingleSelectComboboxUnStyle'
import { useDebounce } from '@/hooks/useDebounce'

type SortDirection = 'asc' | 'desc' | false

const getModelIcon = (modelOwner: string): StaticImageData => {
  const icon = modelIcons[modelOwner as keyof typeof modelIcons] || modelIcons['default']
  return icon
}

// 在组件外部定义样式配置
const MODEL_TYPE_STYLES = {
  1: {
    background: '#F0FBFF',
    color: '#0884DD'
  },
  2: {
    background: '#F4F4F7',
    color: '#383F50'
  },
  3: {
    background: '#EBFAF8',
    color: '#007E7C'
  },
  4: {
    background: '#FEF3F2',
    color: '#F04438'
  },
  5: {
    background: '#F0EEFF',
    color: '#6F5DD7'
  },
  6: {
    background: '#FFFAEB',
    color: '#DC6803'
  },
  7: {
    background: '#FAF1FF',
    color: '#9E53C1'
  },
  8: {
    background: '#FFF1F6',
    color: '#E82F72'
  },
  9: {
    background: '#F0F4FF',
    color: '#3370FF'
  },
  10: {
    background: '#EDFAFF',
    color: '#0077A9'
  },
  default: {
    background: '#F4F4F7',
    color: '#383F50'
  }
} as const

// 在组件中使用
const getTypeStyle = (type: number) => {
  return MODEL_TYPE_STYLES[type as keyof typeof MODEL_TYPE_STYLES] || MODEL_TYPE_STYLES.default
}

export default function Price() {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')

  const [modelOwner, setModelOwner] = useState<string>('')
  const [modelType, setModelType] = useState<string>('')

  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 500)

  interface FilterParams {
    owner: string
    type: string
    name: string
  }

  const filterModels = (modelConfigs: ModelConfig[], filterParams: FilterParams): ModelConfig[] => {
    return modelConfigs.filter((config) => {
      const ownerMatch =
        !filterParams.owner ||
        filterParams.owner === t('price.all') ||
        getTranslationWithFallback(
          `modeOwner.${String(config.owner)}`,
          'modeOwner.unknown',
          t as any
        ) === filterParams.owner

      const typeMatch =
        !filterParams.type ||
        filterParams.type === t('price.all') ||
        getTranslationWithFallback(`modeType.${String(config.type)}`, 'modeType.0', t as any) ===
          filterParams.type

      const nameMatch =
        !filterParams.name || config.model.toLowerCase().includes(filterParams.name.toLowerCase())

      return ownerMatch && typeMatch && nameMatch
    })
  }

  const {
    isLoading,
    data: modelConfigs = [] as ModelConfig[],
    refetch
  }: UseQueryResult<ModelConfig[]> = useQuery([QueryKey.GetEnabledModels], () => getEnabledMode())

  const filteredModelConfigs = useMemo(() => {
    return filterModels(modelConfigs, {
      owner: modelOwner,
      type: modelType,
      name: debouncedSearch
    })
  }, [modelConfigs, modelOwner, modelType, debouncedSearch])

  return (
    <Box w="full" h="full" display="inline-flex" pt="4px" pb="12px" pr="12px" alignItems="center">
      <Box w="full" h="full" padding="27px 32px 0px 32px" bg="white" borderRadius="12px">
        <Flex w="full" h="full" gap="20px" direction="column">
          <Flex
            direction="column"
            gap="16px"
            alignItems="flex-start"
            justifyContent="center"
            alignSelf="stretch">
            {/* row 1 */}
            <Flex justifyContent="space-between" alignItems="center" alignSelf="stretch">
              <Text
                color="black"
                fontFamily="PingFang SC"
                fontSize="20px"
                fontWeight={500}
                lineHeight="26px"
                letterSpacing="0.15px">
                {t('price.title')}
              </Text>
              <Button
                variant="outline"
                _hover={{
                  transform: 'scale(1.05)',
                  transition: 'transform 0.2s ease'
                }}
                _active={{
                  transform: 'scale(0.92)',
                  animation: 'pulse 0.3s ease'
                }}
                sx={{
                  '@keyframes pulse': {
                    '0%': { transform: 'scale(0.92)' },
                    '50%': { transform: 'scale(0.96)' },
                    '100%': { transform: 'scale(0.92)' }
                  }
                }}
                display="flex"
                padding="8px"
                justifyContent="center"
                alignItems="center"
                gap="8px"
                borderRadius="6px"
                border="1px solid #DFE2EA"
                bg="white"
                boxShadow="0px 1px 2px 0px rgba(19, 51, 107, 0.05), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)"
                onClick={() => {
                  refetch()
                }}>
                <Icon
                  xmlns="http://www.w3.org/2000/svg"
                  width="16px"
                  height="16px"
                  viewBox="0 0 16 16"
                  fill="none">
                  <path
                    d="M6.4354 14.638C5.1479 14.2762 4.0979 13.5684 3.2854 12.5145C2.4729 11.4606 2.06665 10.2473 2.06665 8.87454C2.06665 8.16346 2.1854 7.48656 2.4229 6.84385C2.6604 6.20113 2.9979 5.61181 3.4354 5.07589C3.5729 4.92619 3.74165 4.84809 3.94165 4.8416C4.14165 4.83512 4.3229 4.91321 4.4854 5.07589C4.6229 5.21311 4.6949 5.38152 4.7014 5.58113C4.7079 5.78073 4.64215 5.96785 4.50415 6.1425C4.20415 6.52923 3.9729 6.95338 3.8104 7.41496C3.6479 7.87653 3.56665 8.36306 3.56665 8.87454C3.56665 9.88501 3.86365 10.7865 4.45765 11.5789C5.05165 12.3713 5.81715 12.9107 6.75415 13.1971C6.91665 13.247 7.0509 13.3406 7.1569 13.4778C7.2629 13.6151 7.31615 13.7648 7.31665 13.9269C7.31665 14.1764 7.22915 14.373 7.05415 14.5167C6.87915 14.6605 6.6729 14.7009 6.4354 14.638ZM9.6979 14.638C9.4604 14.7004 9.25415 14.6567 9.07915 14.507C8.90415 14.3573 8.81665 14.1577 8.81665 13.9082C8.81665 13.7585 8.8699 13.6151 8.9764 13.4778C9.0829 13.3406 9.21715 13.247 9.37915 13.1971C10.3167 12.8977 11.0824 12.3551 11.6764 11.5691C12.2704 10.7832 12.5672 9.88501 12.5667 8.87454C12.5667 7.62703 12.1292 6.56665 11.2542 5.6934C10.3792 4.82015 9.31665 4.38352 8.06665 4.38352H8.0104L8.3104 4.68292C8.4479 4.82015 8.51665 4.9948 8.51665 5.20687C8.51665 5.41895 8.4479 5.5936 8.3104 5.73083C8.1729 5.86805 7.9979 5.93666 7.7854 5.93666C7.5729 5.93666 7.3979 5.86805 7.2604 5.73083L5.6854 4.15897C5.6104 4.08412 5.5574 4.00303 5.5264 3.91571C5.4954 3.82838 5.47965 3.73482 5.47915 3.63502C5.47915 3.53522 5.4949 3.44166 5.5264 3.35433C5.5579 3.26701 5.6109 3.18592 5.6854 3.11107L7.2604 1.53921C7.3979 1.40199 7.5729 1.33337 7.7854 1.33337C7.9979 1.33337 8.1729 1.40199 8.3104 1.53921C8.4479 1.67644 8.51665 1.85109 8.51665 2.06316C8.51665 2.27524 8.4479 2.44989 8.3104 2.58712L8.0104 2.88652H8.06665C9.74165 2.88652 11.1604 3.46661 12.3229 4.62678C13.4854 5.78696 14.0667 7.20288 14.0667 8.87454C14.0667 10.2343 13.6604 11.4444 12.8479 12.5048C12.0354 13.5652 10.9854 14.2762 9.6979 14.638Z"
                    fill="#485264"
                  />
                </Icon>
              </Button>
            </Flex>
            {/* row 1 end */}

            {/* row 2 */}
            <Flex
              justifyContent="space-between"
              alignItems="center"
              alignSelf="stretch"
              flexWrap="wrap">
              <Flex gap="48px" alignItems="center" alignSelf="stretch">
                <Flex h="32px" gap="24px" alignItems="center" flex="0 1 auto">
                  <Text
                    whiteSpace="nowrap"
                    color="grayModern.900"
                    fontFamily="PingFang SC"
                    fontSize="12px"
                    fontStyle="normal"
                    fontWeight="500"
                    lineHeight="16px"
                    letterSpacing="0.5px">
                    {t('price.modelOwner')}
                  </Text>
                  <SingleSelectComboboxUnstyle<{ icon: string; name: string }>
                    dropdownItems={[
                      { icon: '', name: t('price.all') },
                      ...Array.from(
                        new Map(
                          modelConfigs.map((config) => [
                            config.owner,
                            {
                              icon: config.owner,
                              name: getTranslationWithFallback(
                                `modeOwner.${String(config.owner)}`,
                                'modeOwner.unknown',
                                t as any
                              )
                            }
                          ])
                        ).values()
                      )
                    ]}
                    setSelectedItem={(modelOwner) => {
                      setModelOwner(modelOwner.name)
                    }}
                    handleDropdownItemFilter={(dropdownItems, inputValue) => {
                      const lowerCasedInput = inputValue.toLowerCase()
                      return dropdownItems.filter(
                        (item) => !inputValue || item.name.toLowerCase().includes(lowerCasedInput)
                      )
                    }}
                    handleDropdownItemDisplay={(dropdownItem) => {
                      const iconSrc = getModelIcon(dropdownItem.icon)
                      if (dropdownItem.name === t('price.all')) {
                        return (
                          <Flex alignItems="center" gap="8px">
                            <Image src={iconSrc} alt="default" width={20} height={20} />
                            <Text
                              color="grayModern.600"
                              fontFamily="PingFang SC"
                              fontSize="12px"
                              fontStyle="normal"
                              fontWeight={500}
                              lineHeight="16px"
                              letterSpacing="0.5px">
                              {dropdownItem.name}
                            </Text>
                          </Flex>
                        )
                      }
                      return (
                        <Flex alignItems="center" gap="8px">
                          <Image src={iconSrc} alt={dropdownItem.icon} width={20} height={20} />
                          <Text
                            color="grayModern.600"
                            fontFamily="PingFang SC"
                            fontSize="12px"
                            fontStyle="normal"
                            fontWeight={500}
                            lineHeight="16px"
                            letterSpacing="0.5px">
                            {dropdownItem.name}
                          </Text>
                        </Flex>
                      )
                    }}
                    flexProps={{ w: '240px' }}
                    initSelectedItem={{ icon: '', name: t('price.all') }}
                    handleInputDisplay={(dropdownItem) => dropdownItem.name}
                  />
                </Flex>
                <Flex h="32px" gap="24px" alignItems="center" flex="0 1 auto">
                  <Text
                    whiteSpace="nowrap"
                    color="grayModern.900"
                    fontFamily="PingFang SC"
                    fontSize="12px"
                    fontStyle="normal"
                    fontWeight="500"
                    lineHeight="16px"
                    letterSpacing="0.5px">
                    {t('price.modelType')}
                  </Text>
                  <SingleSelectComboboxUnstyle<string>
                    dropdownItems={[
                      t('price.all'),
                      ...new Set(
                        modelConfigs.map((config) =>
                          getTranslationWithFallback(
                            `modeType.${String(config.type)}`,
                            'modeType.0',
                            t as any
                          )
                        )
                      )
                    ]}
                    setSelectedItem={(modelType) => {
                      setModelType(modelType)
                    }}
                    handleDropdownItemFilter={(dropdownItems, inputValue) => {
                      const lowerCasedInput = inputValue.toLowerCase()
                      return dropdownItems.filter(
                        (item) => !inputValue || item.toLowerCase().includes(lowerCasedInput)
                      )
                    }}
                    handleDropdownItemDisplay={(dropdownItem) => {
                      return (
                        <Text
                          color="grayModern.600"
                          fontFamily="PingFang SC"
                          fontSize="12px"
                          fontStyle="normal"
                          fontWeight={500}
                          lineHeight="16px"
                          letterSpacing="0.5px">
                          {dropdownItem}
                        </Text>
                      )
                    }}
                    flexProps={{ w: '240px' }}
                    initSelectedItem={t('price.all')}
                  />
                </Flex>
              </Flex>

              <Flex h="32px" alignItems="center" flex="0 1 auto" pr="6px">
                <InputGroup w="290px">
                  <Input
                    py="6px"
                    px="12px"
                    alignItems="center"
                    borderRadius="4px"
                    border="1px solid"
                    borderColor="grayModern.200"
                    bgColor="grayModern.50"
                    _hover={{ borderColor: 'grayModern.300' }}
                    _focus={{ borderColor: 'grayModern.300' }}
                    _focusVisible={{ borderColor: 'grayModern.300' }}
                    _active={{ borderColor: 'grayModern.300' }}
                    placeholder={t('price.modelName')}
                    _placeholder={{
                      color: 'grayModern.500',
                      fontFamily: 'PingFang SC',
                      fontSize: '12px',
                      fontWeight: 400,
                      lineHeight: '16px',
                      letterSpacing: '0.048px'
                    }}
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value)
                    }}
                  />
                  <InputRightElement w="32px" h="32px">
                    <Box
                      display="flex"
                      w="full"
                      h="full"
                      p="0px 4px"
                      justifyContent="center"
                      alignItems="center"
                      borderLeft="1px solid"
                      borderColor="grayModern.200">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none">
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M7.33331 2.66659C4.75598 2.66659 2.66665 4.75592 2.66665 7.33325C2.66665 9.91058 4.75598 11.9999 7.33331 11.9999C8.59061 11.9999 9.73178 11.5027 10.5709 10.6942C10.5885 10.6714 10.6077 10.6494 10.6286 10.6285C10.6495 10.6076 10.6714 10.5884 10.6942 10.5708C11.5028 9.73172 12 8.59055 12 7.33325C12 4.75592 9.91064 2.66659 7.33331 2.66659ZM12.0212 11.0784C12.8423 10.0519 13.3333 8.74993 13.3333 7.33325C13.3333 4.01954 10.647 1.33325 7.33331 1.33325C4.0196 1.33325 1.33331 4.01954 1.33331 7.33325C1.33331 10.647 4.0196 13.3333 7.33331 13.3333C8.74999 13.3333 10.052 12.8423 11.0784 12.0212L13.5286 14.4713C13.7889 14.7317 14.211 14.7317 14.4714 14.4713C14.7317 14.211 14.7317 13.7889 14.4714 13.5285L12.0212 11.0784Z"
                          fill="#667085"
                        />
                      </svg>
                    </Box>
                  </InputRightElement>
                </InputGroup>
              </Flex>
            </Flex>
          </Flex>
          <Box flex="1" minHeight="0">
            {isLoading ? (
              <PriceTable modelConfigs={[]} isLoading={isLoading} />
            ) : (
              <PriceTable modelConfigs={filteredModelConfigs} isLoading={isLoading} />
            )}
          </Box>
        </Flex>
      </Box>
    </Box>
  )
}

const ModelComponent = ({ modelConfig }: { modelConfig: ModelConfig }) => {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const { message } = useMessage({
    warningBoxBg: 'var(--Yellow-50, #FFFAEB)',
    warningIconBg: 'var(--Yellow-500, #F79009)',
    warningIconFill: 'white',
    successBoxBg: 'var(--Green-50, #EDFBF3)',
    successIconBg: 'var(--Green-600, #039855)',
    successIconFill: 'white'
  })

  const iconSrc = getModelIcon(modelConfig.owner)

  return (
    <Flex alignItems="center" justifyContent="flex-start" gap="8px" h="42px">
      <MyTooltip
        label={getTranslationWithFallback(
          `modeOwner.${String(modelConfig.owner)}`,
          'modeOwner.unknown',
          t as any
        )}
        width="auto"
        height="auto">
        <Image src={iconSrc} alt={modelConfig.model} width={32} height={32} />
      </MyTooltip>
      <Flex gap="4px" alignItems="flex-start" direction="column">
        <Text
          color="grayModern.900"
          fontFamily="PingFang SC"
          fontSize="14px"
          fontStyle="normal"
          fontWeight={500}
          lineHeight="20px"
          letterSpacing="0.1px"
          whiteSpace="nowrap"
          onClick={() =>
            navigator.clipboard.writeText(modelConfig.model).then(
              () => {
                message({
                  status: 'success',
                  title: t('copySuccess'),
                  isClosable: true,
                  duration: 2000,
                  position: 'top'
                })
              },
              (err) => {
                message({
                  status: 'warning',
                  title: t('copyFailed'),
                  description: err?.message || t('copyFailed'),
                  isClosable: true,
                  position: 'top'
                })
              }
            )
          }
          cursor="pointer">
          {modelConfig.model}
        </Text>
        <Flex gap="4px" alignItems="center" justifyContent="flex-start">
          {modelConfig.config?.vision && (
            <MyTooltip
              label={
                <Text
                  color="grayModern.900"
                  fontFamily="Inter"
                  fontSize="12px"
                  fontWeight={400}
                  lineHeight="150%">
                  {t('price.modelVisionLabel')}
                </Text>
              }
              width="auto"
              height="auto">
              <Badge
                display="flex"
                padding="1px 4px"
                justifyContent="center"
                alignItems="center"
                gap="2px"
                borderRadius="4px"
                background="var(--Teal-50, #EBFAF8)">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none">
                  <path
                    d="M6.9999 5.35705C7.43565 5.35705 7.85355 5.53015 8.16167 5.83827C8.46979 6.14639 8.64289 6.56429 8.64289 7.00004C8.64289 7.43578 8.46979 7.85368 8.16167 8.1618C7.85355 8.46992 7.43565 8.64302 6.9999 8.64302C6.56416 8.64302 6.14626 8.46992 5.83814 8.1618C5.53002 7.85368 5.35692 7.43578 5.35692 7.00004C5.35692 6.56429 5.53002 6.14639 5.83814 5.83827C6.14626 5.53015 6.56416 5.35705 6.9999 5.35705ZM6.9999 2.89258C9.44394 2.89258 11.5695 4.2494 12.6718 6.25045C12.7785 6.44422 12.8319 6.5411 12.8719 6.73711C12.8982 6.86627 12.8982 7.13381 12.8719 7.26297C12.8319 7.45898 12.7785 7.55586 12.6718 7.74962C11.5695 9.75068 9.44394 11.1075 6.9999 11.1075C4.55587 11.1075 2.43032 9.75068 1.32805 7.74962C1.22132 7.55586 1.16795 7.45898 1.12793 7.26297C1.10156 7.13381 1.10156 6.86627 1.12793 6.73711C1.16795 6.5411 1.22132 6.44422 1.32805 6.25045C2.43032 4.2494 4.55587 2.89258 6.9999 2.89258ZM2.70809 6.12392C2.56204 6.31728 2.48901 6.41395 2.4229 6.6637C2.38194 6.81844 2.38194 7.18164 2.4229 7.33638C2.48901 7.58612 2.56204 7.6828 2.70809 7.87616C3.10318 8.3992 3.59235 8.84798 4.15342 9.19794C5.00732 9.73055 5.99352 10.0129 6.9999 10.0129C8.00629 10.0129 8.99249 9.73055 9.84639 9.19794C10.4075 8.84798 10.8966 8.3992 11.2917 7.87616C11.4378 7.6828 11.5108 7.58612 11.5769 7.33638C11.6179 7.18164 11.6179 6.81844 11.5769 6.6637C11.5108 6.41395 11.4378 6.31728 11.2917 6.12392C10.8966 5.60087 10.4075 5.15209 9.84639 4.80213C8.99249 4.26953 8.00629 3.98718 6.9999 3.98718C5.99352 3.98718 5.00732 4.26953 4.15342 4.80213C3.59235 5.15209 3.10318 5.60088 2.70809 6.12392Z"
                    fill="#00A9A6"
                  />
                </svg>
                <Text
                  color="#007E7C" // Changed from "#EBFAF8" to "teal.700" for better readability
                  fontFamily="PingFang SC"
                  fontStyle="normal"
                  fontSize="11px"
                  fontWeight={500}
                  lineHeight="16px"
                  letterSpacing="0.5px">
                  {t('price.modelVision')}
                </Text>
              </Badge>
            </MyTooltip>
          )}
          {modelConfig.config?.tool_choice && (
            <Badge
              display="flex"
              padding="1px 4px"
              justifyContent="center"
              alignItems="center"
              gap="2px"
              borderRadius="4px"
              background="#F0EEFF">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M2.38275 8.52685C1.2703 7.4144 0.919623 5.8231 1.32317 4.38399C1.43455 3.98679 1.60339 3.60118 1.82953 3.24043L3.94506 5.35597L5.19686 5.19681L5.35601 3.94501L3.2406 1.8296C3.60141 1.60351 3.98708 1.43474 4.38434 1.32342C5.82323 0.920248 7.41413 1.27101 8.52636 2.38324C9.65082 3.5077 9.99697 5.1214 9.57262 6.57264L12.1265 8.95704C13.0537 9.82265 13.0787 11.2844 12.1818 12.1813C11.2845 13.0786 9.82197 13.053 8.95657 12.1249L6.57622 9.57192C5.12392 9.99811 3.50826 9.65236 2.38275 8.52685ZM5.39327 2.33236L6.58552 3.52461L6.24026 6.24021L3.52465 6.58547L2.33192 5.39274C2.2883 6.23601 2.5846 7.07879 3.20771 7.70189C4.01259 8.50677 5.1785 8.76623 6.2477 8.45246L6.93854 8.24972L9.80987 11.3293C10.225 11.7745 10.9265 11.7867 11.3569 11.3563C11.7871 10.9261 11.7751 10.225 11.3303 9.80981L8.25115 6.93498L8.45284 6.24521C8.76525 5.1768 8.50554 4.01234 7.70141 3.2082C7.07855 2.58534 6.23621 2.28903 5.39327 2.33236Z"
                  fill="#6F5DD7"
                />
                <path
                  d="M10.9396 10.1019C11.1708 10.3332 11.1708 10.7081 10.9396 10.9394C10.7083 11.1707 10.3333 11.1707 10.102 10.9394C9.87072 10.7081 9.87072 10.3332 10.102 10.1019C10.3333 9.8706 10.7083 9.8706 10.9396 10.1019Z"
                  fill="#6F5DD7"
                />
              </svg>
              <Text
                color="#6F5DD7"
                fontFamily="PingFang SC"
                fontStyle="normal"
                fontSize="11px"
                fontWeight={500}
                lineHeight="16px"
                letterSpacing="0.5px">
                {t('price.modelToolChoice')}
              </Text>
            </Badge>
          )}
          {modelConfig.config?.max_context_tokens && (
            <Badge
              display="flex"
              padding="1px 4px"
              justifyContent="center"
              alignItems="center"
              borderRadius="4px"
              background="#F7F8FA">
              <Text
                color="#667085"
                fontFamily="PingFang SC"
                fontStyle="normal"
                fontSize="11px"
                fontWeight={500}
                lineHeight="16px"
                letterSpacing="0.5px">
                {`${
                  modelConfig.config.max_context_tokens % 1024 === 0
                    ? Math.ceil(modelConfig.config.max_context_tokens / 1024)
                    : Math.ceil(modelConfig.config.max_context_tokens / 1000)
                }K`}
              </Text>
            </Badge>
          )}
          {modelConfig.config?.max_output_tokens && (
            <Badge
              display="flex"
              padding="1px 4px"
              justifyContent="center"
              alignItems="center"
              borderRadius="4px"
              background="#EDFAFF">
              <Text
                color="#0077A9"
                fontFamily="PingFang SC"
                fontStyle="normal"
                fontSize="11px"
                fontWeight={500}
                lineHeight="16px"
                letterSpacing="0.5px">
                {`${Math.ceil(modelConfig.config.max_output_tokens / 1024)}K ${t(
                  'price.response'
                )}`}
              </Text>
            </Badge>
          )}
        </Flex>
      </Flex>
    </Flex>
  )
}

function PriceTable({
  modelConfigs,
  isLoading
}: {
  modelConfigs: ModelConfig[]
  isLoading: boolean
}) {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')

  const { currencySymbol } = useBackendStore()

  const [sortConfig, setSortConfig] = useState({
    column: '',
    direction: false as SortDirection
  })

  // 处理排序
  const handleSort = (column: string, direction: SortDirection) => {
    // 如果点击相同的列并且方向相同，则取消排序
    if (sortConfig.column === column && sortConfig.direction === direction) {
      setSortConfig({ column: '', direction: false })
      return
    }
    setSortConfig({ column, direction })
  }

  const columnHelper = createColumnHelper<ModelConfig>()
  const columns = [
    columnHelper.accessor((row) => row.model, {
      id: 'model',
      header: () => (
        <Text
          color="grayModern.600"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px">
          {t('key.name')}
        </Text>
      ),
      cell: (info) => <ModelComponent modelConfig={info.row.original} />
    }),
    columnHelper.accessor((row) => row.type, {
      id: 'type',
      header: () => (
        <Text
          color="grayModern.600"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px">
          {t('key.modelType')}
        </Text>
      ),
      cell: (info) => (
        <Badge
          display="inline-flex"
          padding="6px 12px"
          justifyContent="center"
          alignItems="center"
          borderRadius="4px"
          background={getTypeStyle(info.getValue()).background}>
          <Text
            color={getTypeStyle(info.getValue()).color}
            fontFamily="PingFang SC"
            fontSize="12px"
            fontWeight={500}
            lineHeight="16px"
            letterSpacing="0.5px">
            {getTranslationWithFallback(
              `modeType.${String(info.getValue())}`,
              'modeType.0',
              t as any
            )}
          </Text>
        </Badge>
      )
    }),
    columnHelper.accessor((row) => row.rpm, {
      id: 'rpm',
      header: () => (
        <Flex alignItems="center" gap="4px" w="fit-content">
          <Text
            color="grayModern.600"
            fontFamily="PingFang SC"
            fontSize="12px"
            fontWeight={500}
            lineHeight="16px"
            letterSpacing="0.5px">
            {t('price.modelRpm')}
          </Text>
          <MyTooltip
            placement="bottom-end"
            width="auto"
            height="auto"
            label={
              <Text
                whiteSpace="nowrap"
                color="grayModern.900"
                fontFamily="PingFang SC"
                fontSize="12px"
                fontWeight={400}
                lineHeight="16px"
                letterSpacing="0.5px">
                {t('price.modelRpmTooltip')}
              </Text>
            }>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="14"
              viewBox="0 0 15 14"
              fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M7.79299 2.23698C5.16257 2.23698 3.03019 4.36936 3.03019 6.99978C3.03019 9.6302 5.16257 11.7626 7.79299 11.7626C10.4234 11.7626 12.5558 9.6302 12.5558 6.99978C12.5558 4.36936 10.4234 2.23698 7.79299 2.23698ZM1.86353 6.99978C1.86353 3.72503 4.51824 1.07031 7.79299 1.07031C11.0677 1.07031 13.7225 3.72503 13.7225 6.99978C13.7225 10.2745 11.0677 12.9292 7.79299 12.9292C4.51824 12.9292 1.86353 10.2745 1.86353 6.99978ZM7.92275 4.92235C7.68522 4.8816 7.44093 4.92624 7.23315 5.04835C7.02538 5.17046 6.86752 5.36217 6.78755 5.58952C6.68064 5.89343 6.3476 6.05313 6.04369 5.94622C5.73978 5.83931 5.58008 5.50628 5.68699 5.20236C5.85839 4.71511 6.19671 4.30424 6.64202 4.04253C7.08733 3.78082 7.6109 3.68515 8.11998 3.77247C8.62907 3.85979 9.09083 4.12447 9.42347 4.51962C9.75604 4.91469 9.93809 5.41468 9.9374 5.93109C9.93713 6.77507 9.31182 7.32806 8.87572 7.6188C8.63987 7.77603 8.40817 7.89146 8.23774 7.96721C8.15169 8.00545 8.07917 8.0345 8.0268 8.05445C8.00057 8.06445 7.97925 8.07221 7.96366 8.07775L7.94462 8.08442L7.93848 8.08652L7.93629 8.08726L7.93541 8.08755C7.93524 8.08761 7.93469 8.08779 7.75022 7.53439L7.93469 8.08779C7.62906 8.18967 7.2987 8.02449 7.19683 7.71886C7.09498 7.41333 7.26001 7.08309 7.56545 6.9811L7.57281 6.9785C7.58072 6.97569 7.59385 6.97093 7.61148 6.96422C7.64681 6.95075 7.6996 6.92968 7.76391 6.9011C7.89419 6.84319 8.06346 6.75815 8.22857 6.64807C8.5943 6.40425 8.77073 6.1555 8.77073 5.93055L8.77073 5.92968C8.77109 5.68868 8.68615 5.45533 8.53094 5.27096C8.37573 5.08658 8.16028 4.96309 7.92275 4.92235ZM7.20966 9.67285C7.20966 9.35068 7.47083 9.08951 7.79299 9.08951H7.79834C8.12051 9.08951 8.38167 9.35068 8.38167 9.67285C8.38167 9.99501 8.12051 10.2562 7.79834 10.2562H7.79299C7.47083 10.2562 7.20966 9.99501 7.20966 9.67285Z"
                fill="#667085"
              />
            </svg>
          </MyTooltip>
        </Flex>
      ),
      cell: (info) => (
        <Text
          color="grayModern.600"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px">
          {info.getValue()}
        </Text>
      )
    }),
    columnHelper.accessor((row) => row.input_price, {
      id: 'input_price',
      header: () => {
        return (
          <Flex gap="8px">
            <Flex alignItems="center">
              <Text
                color="grayModern.600"
                fontFamily="PingFang SC"
                fontSize="12px"
                fontWeight={500}
                lineHeight="16px"
                mr={'4px'}
                letterSpacing="0.5px">
                {t('key.inputPrice')}
              </Text>
              <CurrencySymbol type={currencySymbol} fontSize={'12px'} h={'15px'} />
              <Text
                color="grayModern.500"
                fontFamily="PingFang SC"
                fontSize="12px"
                fontWeight={500}
                lineHeight="16px"
                letterSpacing="0.5px"
                textTransform="lowercase">
                /{t('price.per1kTokens').toLowerCase()}
              </Text>
            </Flex>

            <Flex direction="column" gap="6px">
              <MyTooltip
                placement="bottom-end"
                width="auto"
                height="auto"
                label={
                  <Text
                    whiteSpace="nowrap"
                    color="grayModern.900"
                    fontFamily="PingFang SC"
                    fontSize="12px"
                    fontWeight={400}
                    lineHeight="16px"
                    letterSpacing="0.5px">
                    {t('price.sortUpTooltip')}
                  </Text>
                }>
                <Box
                  as="button"
                  onClick={() => handleSort('input_price', 'asc')}
                  cursor="pointer"
                  _hover={{ opacity: 0.8 }}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="6"
                    height="4"
                    viewBox="0 0 6 4"
                    fill="none">
                    <path
                      d="M5.15373 4C5.90617 4 6.28299 3.09027 5.75094 2.55822L3.59721 0.404486C3.26738 0.0746584 2.73262 0.0746584 2.40279 0.404486L0.249064 2.55822C-0.28299 3.09027 0.0938324 4 0.84627 4H5.15373Z"
                      fill={
                        sortConfig.column === 'input_price' && sortConfig.direction === 'asc'
                          ? '#219BF4'
                          : '#8A95A7'
                      }
                    />
                  </svg>
                </Box>
              </MyTooltip>
              <MyTooltip
                placement="bottom-end"
                width="auto"
                height="auto"
                label={
                  <Text
                    whiteSpace="nowrap"
                    color="grayModern.900"
                    fontFamily="PingFang SC"
                    fontSize="12px"
                    fontWeight={400}
                    lineHeight="16px"
                    letterSpacing="0.5px">
                    {t('price.sortDownTooltip')}
                  </Text>
                }>
                <Box
                  as="button"
                  onClick={() => handleSort('input_price', 'desc')}
                  cursor="pointer"
                  _hover={{ opacity: 0.8 }}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="6"
                    height="4"
                    viewBox="0 0 6 4"
                    fill="none">
                    <path
                      d="M5.15373 0C5.90617 0 6.28299 0.90973 5.75094 1.44178L3.59721 3.59551C3.26738 3.92534 2.73262 3.92534 2.40279 3.59551L0.249064 1.44178C-0.28299 0.90973 0.0938324 0 0.84627 0H5.15373Z"
                      fill={
                        sortConfig.column === 'input_price' && sortConfig.direction === 'desc'
                          ? '#219BF4'
                          : '#8A95A7'
                      }
                    />
                  </svg>
                </Box>
              </MyTooltip>
            </Flex>
          </Flex>
        )
      },
      cell: (info) => (
        <Text
          color="grayModern.600"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px">
          {info.getValue()}
        </Text>
      )
    }),
    columnHelper.accessor((row) => row.output_price, {
      id: 'output_price',
      header: () => (
        <Flex gap="8px">
          <Flex alignItems="center">
            <Text
              color="grayModern.600"
              fontFamily="PingFang SC"
              fontSize="12px"
              fontWeight={500}
              lineHeight="16px"
              mr={'4px'}
              letterSpacing="0.5px">
              {t('key.outputPrice')}
            </Text>
            <CurrencySymbol type={currencySymbol} fontSize={'12px'} h={'15px'} />
            <Text
              color="grayModern.500"
              fontFamily="PingFang SC"
              fontSize="12px"
              fontWeight={500}
              lineHeight="16px"
              letterSpacing="0.5px"
              textTransform="lowercase">
              /{t('price.per1kTokens').toLowerCase()}
            </Text>
          </Flex>
          <Flex direction="column" gap="6px">
            <MyTooltip
              placement="bottom-end"
              width="auto"
              height="auto"
              label={
                <Text
                  whiteSpace="nowrap"
                  color="grayModern.900"
                  fontFamily="PingFang SC"
                  fontSize="12px"
                  fontWeight={400}
                  lineHeight="16px"
                  letterSpacing="0.5px">
                  {t('price.sortUpTooltip')}
                </Text>
              }>
              <Box
                as="button"
                onClick={() => handleSort('output_price', 'asc')}
                cursor="pointer"
                _hover={{ opacity: 0.8 }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="6"
                  height="4"
                  viewBox="0 0 6 4"
                  fill="none">
                  <path
                    d="M5.15373 4C5.90617 4 6.28299 3.09027 5.75094 2.55822L3.59721 0.404486C3.26738 0.0746584 2.73262 0.0746584 2.40279 0.404486L0.249064 2.55822C-0.28299 3.09027 0.0938324 4 0.84627 4H5.15373Z"
                    fill={
                      sortConfig.column === 'output_price' && sortConfig.direction === 'asc'
                        ? '#219BF4'
                        : '#8A95A7'
                    }
                  />
                </svg>
              </Box>
            </MyTooltip>
            <MyTooltip
              placement="bottom-end"
              width="auto"
              height="auto"
              label={
                <Text
                  whiteSpace="nowrap"
                  color="grayModern.900"
                  fontFamily="PingFang SC"
                  fontSize="12px"
                  fontWeight={400}
                  lineHeight="16px"
                  letterSpacing="0.5px">
                  {t('price.sortDownTooltip')}
                </Text>
              }>
              <Box
                as="button"
                onClick={() => handleSort('output_price', 'desc')}
                cursor="pointer"
                _hover={{ opacity: 0.8 }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="6"
                  height="4"
                  viewBox="0 0 6 4"
                  fill="none">
                  <path
                    d="M5.15373 0C5.90617 0 6.28299 0.90973 5.75094 1.44178L3.59721 3.59551C3.26738 3.92534 2.73262 3.92534 2.40279 3.59551L0.249064 1.44178C-0.28299 0.90973 0.0938324 0 0.84627 0H5.15373Z"
                    fill={
                      sortConfig.column === 'output_price' && sortConfig.direction === 'desc'
                        ? '#219BF4'
                        : '#8A95A7'
                    }
                  />
                </svg>
              </Box>
            </MyTooltip>
          </Flex>
        </Flex>
      ),
      cell: (info) => (
        <Text
          color="grayModern.600"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px">
          {info.getValue()}
        </Text>
      )
    })
  ]

  const tableData = useMemo(() => {
    if (!sortConfig.direction || !sortConfig.column) {
      return modelConfigs
    }

    return [...modelConfigs].sort((a, b) => {
      let aValue = a[sortConfig.column as keyof ModelConfig]
      let bValue = b[sortConfig.column as keyof ModelConfig]

      // 确保数值比较
      if (typeof aValue === 'string') aValue = parseFloat(aValue as string) || 0
      if (typeof bValue === 'string') bValue = parseFloat(bValue as string) || 0

      if (sortConfig.direction === 'asc') {
        return (aValue as number) - (bValue as number)
      } else {
        return (bValue as number) - (aValue as number)
      }
    })
  }, [modelConfigs, sortConfig])

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel()
  })

  return (
    <TableContainer w="full" h="full" flex="1 0 0" minHeight="0" overflowY="auto">
      <Table variant="simple" w="full" size="md">
        <Thead position="sticky" top={0} zIndex={1} bg="white">
          {table.getHeaderGroups().map((headerGroup) => (
            <Tr key={headerGroup.id} height="42px" alignSelf="stretch" bg="grayModern.100">
              {headerGroup.headers.map((header, i) => (
                <Th
                  key={header.id}
                  border={'none'}
                  borderTopLeftRadius={i === 0 ? '6px' : '0'}
                  borderBottomLeftRadius={i === 0 ? '6px' : '0'}
                  borderTopRightRadius={i === headerGroup.headers.length - 1 ? '6px' : '0'}
                  borderBottomRightRadius={i === headerGroup.headers.length - 1 ? '6px' : '0'}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </Th>
              ))}
            </Tr>
          ))}
        </Thead>
        <Tbody>
          {isLoading ? (
            <Tr>
              <Td
                colSpan={columns.length}
                textAlign="center"
                border="none"
                height="100%"
                width="100%">
                <Center h="200px">
                  <Spinner size="md" color="grayModern.800" />
                </Center>
              </Td>
            </Tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <Tr
                key={row.id}
                height="48px"
                alignSelf="stretch"
                borderBottom="1px solid"
                borderColor="grayModern.150">
                {row.getVisibleCells().map((cell) => (
                  <Td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Td>
                ))}
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </TableContainer>
  )
}

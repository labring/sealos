'use client'
import {
  Box,
  Flex,
  Text,
  Button,
  Icon,
  Input,
  InputGroup,
  InputRightElement
} from '@chakra-ui/react'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { getEnabledMode } from '@/api/platform'
import { useMemo, useState } from 'react'
import { ModelConfig } from '@/types/models/model'
import Image from 'next/image'
import { QueryKey } from '@/types/query-key'
import { getTranslationWithFallback } from '@/utils/common'
import { SingleSelectComboboxUnstyle } from '@/components/common/SingleSelectComboboxUnStyle'
import { useDebounce } from '@/hooks/useDebounce'
import { getModelIcon } from './component/Model'
import { PriceTable } from './component/PriceTable'

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

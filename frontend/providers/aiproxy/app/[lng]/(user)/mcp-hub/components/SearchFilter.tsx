'use client'
import { useEffect, useState } from 'react'
import { Button, Flex, HStack, Input, InputGroup, InputLeftElement, Text } from '@chakra-ui/react'

import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'

export interface SearchFilterProps {
  searchTerm: string
  serviceType: 'hosted' | 'local' | ''
  onSearchChange: (value: string) => void
  onServiceTypeChange: (value: string) => void
}

export default function SearchFilter({
  searchTerm,
  serviceType,
  onSearchChange,
  onServiceTypeChange,
}: SearchFilterProps) {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')

  // 本地输入状态
  const [inputValue, setInputValue] = useState(searchTerm)

  // 本地多选状态管理 - 完全独立的视觉状态
  const [selectedTypes, setSelectedTypes] = useState<Set<'hosted' | 'local'>>(() => {
    return new Set<'hosted' | 'local'>() // 默认都不选
  })

  // 当外部searchTerm变化时，同步到本地状态
  useEffect(() => {
    setInputValue(searchTerm)
  }, [searchTerm])

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearchChange(inputValue)
    }
  }

  const handleInputBlur = () => {
    // 当失去焦点时也触发搜索，提供更好的用户体验
    if (inputValue !== searchTerm) {
      onSearchChange(inputValue)
    }
  }

  const handleServiceTypeToggle = (type: 'hosted' | 'local') => {
    const newSelectedTypes = new Set(selectedTypes)

    if (newSelectedTypes.has(type)) {
      // 取消选择该类型
      newSelectedTypes.delete(type)
    } else {
      // 选择该类型
      newSelectedTypes.add(type)
    }

    setSelectedTypes(newSelectedTypes)

    // 根据选择状态决定传递给父组件的值
    if (newSelectedTypes.size === 0 || newSelectedTypes.size === 2) {
      // 没有选择任何类型或选择了所有类型，都表示显示全部
      onServiceTypeChange('')
    } else if (newSelectedTypes.has('hosted')) {
      onServiceTypeChange('hosted')
    } else if (newSelectedTypes.has('local')) {
      onServiceTypeChange('local')
    }
  }

  return (
    <Flex gap="24px" flexWrap="wrap" alignItems="center">
      <InputGroup flex="1" minW="300px">
        <InputLeftElement pointerEvents="none" h="36px">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M7.33333 2.66667C4.75571 2.66667 2.66667 4.75571 2.66667 7.33333C2.66667 9.91095 4.75571 12 7.33333 12C9.91095 12 12 9.91095 12 7.33333C12 4.75571 9.91095 2.66667 7.33333 2.66667ZM1.33333 7.33333C1.33333 4.01962 4.01962 1.33333 7.33333 1.33333C10.647 1.33333 13.3333 4.01962 13.3333 7.33333C13.3333 10.647 10.647 13.3333 7.33333 13.3333C4.01962 13.3333 1.33333 10.647 1.33333 7.33333Z"
              fill="#9CA2A8"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M10.6267 10.6267C10.8533 10.4001 11.2267 10.4001 11.4533 10.6267L14.6267 13.8C14.8533 14.0267 14.8533 14.4001 14.6267 14.6267C14.4001 14.8533 14.0267 14.8533 13.8 14.6267L10.6267 11.4533C10.4001 11.2267 10.4001 10.8533 10.6267 10.6267Z"
              fill="#9CA2A8"
            />
          </svg>
        </InputLeftElement>
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          onBlur={handleInputBlur}
          placeholder={t('mcpHub.searchPlaceholder')}
          bg="white"
          border="1px solid"
          borderColor="grayModern.200"
          borderRadius="8px"
          fontSize="14px"
          h="36px"
          fontWeight={400}
          lineHeight="20px"
          _placeholder={{ color: 'grayModern.500' }}
          _focus={{
            borderColor: 'brightBlue.500',
            boxShadow: '0 0 0 1px var(--chakra-colors-brightBlue-500)',
          }}
        />
      </InputGroup>

      <HStack spacing="16px" alignItems="center">
        <Text color="grayModern.700" fontSize="14px" fontWeight={500}>
          {t('mcpHub.serviceType')}:
        </Text>

        <HStack spacing="12px">
          <Button
            variant="ghost"
            display="flex"
            px="12px"
            py="6px"
            h="auto"
            minW="auto"
            justifyContent="flex-start"
            alignItems="center"
            gap="6px"
            borderRadius="8px"
            color={selectedTypes.has('hosted') ? '#0884DD' : 'grayModern.600'}
            fontSize="14px"
            fontWeight="400"
            bg={selectedTypes.has('hosted') ? '#EEF2FF' : '#F8FAFC'}
            _hover={{
              bg: '#EEF2FF',
              color: '#0884DD',
            }}
            leftIcon={
              <svg
                viewBox="0 0 1024 1024"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="none"
              >
                <path
                  d="M539.861333 136.106667V122.24v-1.408a55.466667 55.466667 0 0 0-55.296-55.466667V191.573333a55.466667 55.466667 0 0 0 55.296-55.466666zM778.581333 508.288a266.666667 266.666667 0 1 1-533.333333 0 266.666667 266.666667 0 0 1 533.333333 0z m-58.325333 0a208.341333 208.341333 0 1 0-416.682667 0 208.341333 208.341333 0 0 0 416.682667 0zM437.930667 866.773333a55.466667 55.466667 0 0 1-54.016-55.466666h255.957333v1.365333a55.466667 55.466667 0 0 1-55.466667 54.101333H437.930667zM618.538667 903.125333v1.365334a55.466667 55.466667 0 0 1-55.466667 54.101333H459.264a55.466667 55.466667 0 0 1-54.016-55.466667h213.290667zM789.674667 148.352l-0.085334 0.170667-55.381333 95.872-7.594667 13.184a55.466667 55.466667 0 0 0 75.648-20.394667l0.213334-0.426667 7.253333-12.501333 0.085333-0.213333a55.466667 55.466667 0 0 0-20.138666-75.690667zM234.325333 148.48l-0.085333-0.128a55.466667 55.466667 0 0 0-20.138667 75.690667l0.128 0.213333 7.210667 12.544 0.213333 0.426667a55.466667 55.466667 0 0 0 75.648 20.352L234.325333 148.522667zM889.045333 432.64l-0.426666 0.213333a55.466667 55.466667 0 0 1-75.690667-20.138666l109.098667-62.976 0.128-0.128a55.466667 55.466667 0 0 1-20.352 75.648l-0.426667 0.256-12.373333 7.082666zM115.029333 357.248l0.170667 0.085333 95.914667 55.381334a55.466667 55.466667 0 0 1-75.306667 20.352l-13.141333-7.552-0.426667-0.256a55.466667 55.466667 0 0 1-20.394667-75.648l0.170667 0.128 13.013333 7.509333z"
                  p-id="6011"
                  fill="currentColor"
                ></path>
              </svg>
            }
            onClick={() => handleServiceTypeToggle('hosted')}
          >
            {t('mcpHub.hosted')}
          </Button>

          <Button
            variant="ghost"
            display="flex"
            px="12px"
            py="6px"
            h="auto"
            minW="auto"
            justifyContent="flex-start"
            alignItems="center"
            gap="6px"
            borderRadius="8px"
            color={selectedTypes.has('local') ? '#0884DD' : 'grayModern.600'}
            fontSize="14px"
            fontWeight="400"
            bg={selectedTypes.has('local') ? '#EEF2FF' : '#F8FAFC'}
            _hover={{
              bg: '#EEF2FF',
              color: '#0884DD',
            }}
            leftIcon={
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="2"
                  y="4"
                  width="12"
                  height="8"
                  rx="1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />
                <rect x="4" y="6" width="8" height="1" rx="0.5" fill="currentColor" />
                <rect x="4" y="8" width="6" height="1" rx="0.5" fill="currentColor" />
                <rect x="4" y="10" width="4" height="1" rx="0.5" fill="currentColor" />
              </svg>
            }
            onClick={() => handleServiceTypeToggle('local')}
          >
            {t('mcpHub.local')}
          </Button>
        </HStack>
      </HStack>
    </Flex>
  )
}

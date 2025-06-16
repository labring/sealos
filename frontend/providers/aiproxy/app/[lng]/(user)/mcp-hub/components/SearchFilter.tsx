'use client'
import { Flex, Input, Button, InputGroup, InputLeftElement, HStack, Text } from '@chakra-ui/react'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { useState, useEffect } from 'react'

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
  onServiceTypeChange
}: SearchFilterProps) {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')

  // 本地输入状态
  const [inputValue, setInputValue] = useState(searchTerm)

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
    // 如果点击的是当前选中的类型，则取消选择（回到全部）
    if (serviceType === type) {
      onServiceTypeChange('')
    } else {
      onServiceTypeChange(type)
    }
  }

  return (
    <Flex gap="24px" mb="24px" flexWrap="wrap" alignItems="center">
      <InputGroup flex="1" minW="300px">
        <InputLeftElement pointerEvents="none">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none">
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
          fontWeight={400}
          lineHeight="20px"
          _placeholder={{ color: 'grayModern.500' }}
          _focus={{
            borderColor: 'brightBlue.500',
            boxShadow: '0 0 0 1px var(--chakra-colors-brightBlue-500)'
          }}
        />
      </InputGroup>

      <HStack spacing="0" bg="grayModern.50" borderRadius="8px" p="4px">
        <Text color="grayModern.700" fontSize="14px" fontWeight={500} mr="12px" ml="8px">
          {t('mcpHub.serviceType')}:
        </Text>

        <Button
          size="sm"
          variant="ghost"
          bg={serviceType === 'hosted' ? 'brightBlue.500' : 'transparent'}
          color={serviceType === 'hosted' ? 'white' : 'grayModern.600'}
          border="none"
          borderRadius="6px"
          fontSize="14px"
          fontWeight={serviceType === 'hosted' ? 600 : 500}
          h="32px"
          px="12px"
          _hover={{
            bg: serviceType === 'hosted' ? 'brightBlue.600' : 'grayModern.100',
            color: serviceType === 'hosted' ? 'white' : 'grayModern.700'
          }}
          _active={{
            bg: serviceType === 'hosted' ? 'brightBlue.700' : 'grayModern.200'
          }}
          leftIcon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <path d="M8 2L10.5 4.5L8 7L5.5 4.5L8 2Z" fill="currentColor" opacity="0.8" />
              <path d="M2 8L4.5 10.5L7 8L4.5 5.5L2 8Z" fill="currentColor" />
              <path d="M9 8L11.5 10.5L14 8L11.5 5.5L9 8Z" fill="currentColor" />
              <path d="M8 9L10.5 11.5L8 14L5.5 11.5L8 9Z" fill="currentColor" opacity="0.8" />
            </svg>
          }
          onClick={() => handleServiceTypeToggle('hosted')}>
          {t('mcpHub.hosted')}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          bg={serviceType === 'local' ? 'brightBlue.500' : 'transparent'}
          color={serviceType === 'local' ? 'white' : 'grayModern.600'}
          border="none"
          borderRadius="6px"
          fontSize="14px"
          fontWeight={serviceType === 'local' ? 600 : 500}
          h="32px"
          px="12px"
          _hover={{
            bg: serviceType === 'local' ? 'brightBlue.600' : 'grayModern.100',
            color: serviceType === 'local' ? 'white' : 'grayModern.700'
          }}
          _active={{
            bg: serviceType === 'local' ? 'brightBlue.700' : 'grayModern.200'
          }}
          leftIcon={
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <path
                d="M2 4C2 3.44772 2.44772 3 3 3H13C13.5523 3 14 3.44772 14 4V5H2V4Z"
                fill="currentColor"
              />
              <path
                d="M2 6H14V11C14 11.5523 13.5523 12 13 12H3C2.44772 12 2 11.5523 2 11V6Z"
                fill="currentColor"
                opacity="0.8"
              />
              <circle cx="4" cy="8.5" r="0.5" fill="currentColor" />
              <circle cx="6" cy="8.5" r="0.5" fill="currentColor" />
            </svg>
          }
          onClick={() => handleServiceTypeToggle('local')}>
          {t('mcpHub.local')}
        </Button>
      </HStack>
    </Flex>
  )
}

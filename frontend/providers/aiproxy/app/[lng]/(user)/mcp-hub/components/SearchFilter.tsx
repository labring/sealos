'use client'
import { Flex, Input, Select, InputGroup, InputLeftElement } from '@chakra-ui/react'
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

  return (
    <Flex gap="16px" mb="24px" flexWrap="wrap">
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
      <Select
        value={serviceType}
        onChange={(e) => onServiceTypeChange(e.target.value)}
        w="200px"
        bg="white"
        border="1px solid"
        borderColor="grayModern.200"
        borderRadius="8px"
        fontSize="14px"
        fontWeight={400}
        _focus={{
          borderColor: 'brightBlue.500',
          boxShadow: '0 0 0 1px var(--chakra-colors-brightBlue-500)'
        }}>
        <option value="">{t('mcpHub.allTypes')}</option>
        <option value="hosted">{t('mcpHub.hosted')}</option>
        <option value="local">{t('mcpHub.local')}</option>
      </Select>
    </Flex>
  )
}

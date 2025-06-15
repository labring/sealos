'use client'
import { useState, Dispatch, SetStateAction } from 'react'
import {
  Box,
  Flex,
  Text,
  Button,
  VStack,
  FormControl,
  FormLabel,
  Input,
  FormErrorMessage,
  Badge
} from '@chakra-ui/react'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { McpDetail } from '@/types/mcp'
import { useMessage } from '@sealos/ui'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateMcpParams } from '@/api/platform'
import { QueryKey } from '@/types/query-key'

export interface McpParamsFormProps {
  mcpDetail: McpDetail
  showBackButton?: boolean
  setViewMode?: Dispatch<SetStateAction<'info' | 'config'>>
}

export default function McpParamsForm({
  mcpDetail,
  showBackButton,
  setViewMode
}: McpParamsFormProps) {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const { message } = useMessage()
  const queryClient = useQueryClient()

  // 初始化表单数据
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initialData: Record<string, string> = {}
    Object.keys(mcpDetail.reusing || {}).forEach((key) => {
      initialData[key] = mcpDetail.params?.[key] || ''
    })
    return initialData
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateParamsMutation = useMutation(
    (params: Record<string, string>) => updateMcpParams(mcpDetail.id, params),
    {
      onSuccess: () => {
        message({
          status: 'success',
          title: t('mcpHub.paramsSaved'),
          duration: 2000
        })
        queryClient.invalidateQueries([QueryKey.mcpDetail, mcpDetail.id])
        setViewMode?.('info')
      },
      onError: (error: any) => {
        message({
          status: 'error',
          title: t('mcpHub.paramsSaveFailed'),
          description: error?.message || t('mcpHub.paramsSaveFailed'),
          duration: 3000
        })
      }
    }
  )

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    // 清除错误
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    Object.entries(mcpDetail.reusing || {}).forEach(([key, config]) => {
      if (config.required && !formData[key]?.trim()) {
        newErrors[key] = t('mcpHub.required')
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validateForm()) {
      return
    }

    // 只提交有值的参数
    const paramsToSubmit: Record<string, string> = {}
    Object.entries(formData).forEach(([key, value]) => {
      if (value.trim()) {
        paramsToSubmit[key] = value.trim()
      }
    })

    updateParamsMutation.mutate(paramsToSubmit)
  }

  const reusingParams = mcpDetail.reusing || {}

  return (
    <Flex flex="1" direction="column" h="full" justifyContent="space-between">
      <Box flex="1" overflow="auto" h="full">
        <VStack spacing="16px" align="stretch">
          {Object.entries(reusingParams).map(([key, config]) => (
            <FormControl key={key} isInvalid={!!errors[key]}>
              <FormLabel>
                <Flex alignItems="center" gap="8px">
                  <Text fontSize="14px" fontWeight={500} color="grayModern.700">
                    {config.name}
                  </Text>
                  <Badge
                    fontSize="10px"
                    colorScheme={config.required ? 'red' : 'gray'}
                    variant="subtle">
                    {config.required ? t('mcpHub.required') : t('mcpHub.optional')}
                  </Badge>
                </Flex>
              </FormLabel>
              <Input
                value={formData[key] || ''}
                onChange={(e) => handleInputChange(key, e.target.value)}
                placeholder={`${t('common.add')} ${config.name}`}
                size="sm"
                bg="white"
                border="1px solid"
                borderColor="grayModern.200"
                borderRadius="6px"
                fontSize="14px"
                _placeholder={{ color: 'grayModern.400', fontSize: '14px' }}
                _focus={{
                  borderColor: 'brightBlue.500',
                  boxShadow: '0 0 0 1px var(--chakra-colors-brightBlue-500)'
                }}
              />
              {config.description && (
                <Text fontSize="12px" color="grayModern.500" mt="4px">
                  {config.description}
                </Text>
              )}
              <FormErrorMessage>{errors[key]}</FormErrorMessage>
            </FormControl>
          ))}
        </VStack>
      </Box>

      {/* Buttons */}
      <Flex gap="12px" mt="16px">
        {showBackButton && (
          <Button variant="outline" size="sm" onClick={() => setViewMode?.('info')} flex="1">
            {t('mcpHub.backToInfo')}
          </Button>
        )}
        <Button
          size="sm"
          onClick={handleSubmit}
          isLoading={updateParamsMutation.isLoading}
          flex="1">
          {t('mcpHub.saveParams')}
        </Button>
      </Flex>
    </Flex>
  )
}

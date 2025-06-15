'use client'
import { useState } from 'react'
import { Box, Flex, Text } from '@chakra-ui/react'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { McpDetail } from '@/types/mcp'
import McpConnectionInfo from './McpConnectionInfo'
import McpParamsForm from './McpParamsForm'

export interface McpParamsConfigProps {
  mcpDetail: McpDetail
}

type ViewMode = 'info' | 'config'

export default function McpParamsConfig({ mcpDetail }: McpParamsConfigProps) {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const [viewMode, setViewMode] = useState<ViewMode>('info')

  // 检查是否有连接信息
  const hasConnectionInfo = !!mcpDetail.endpoints?.host
  const hasReusing = Object.keys(mcpDetail.reusing || {}).length > 0

  return (
    <Box minH="0px" overflow="hidden" bg="grayModern.25" borderRadius="8px" p="20px">
      <Flex direction="column" h="full">
        {/* Header */}
        <Flex alignItems="center" justifyContent="space-between" mb="16px">
          <Text color="grayModern.900" fontSize="16px" fontWeight={600} lineHeight="22px">
            {viewMode === 'info'
              ? hasConnectionInfo
                ? t('mcpHub.connectService')
                : t('mcpHub.configParams')
              : t('mcpHub.configParams')}
          </Text>
        </Flex>

        {/* Content */}
        <Box flex="1" h="full" overflow="hidden">
          {viewMode === 'info' && hasConnectionInfo ? (
            hasReusing ? (
              <McpConnectionInfo mcpDetail={mcpDetail} setViewMode={() => setViewMode('config')} />
            ) : (
              <McpConnectionInfo mcpDetail={mcpDetail} />
            )
          ) : (
            <McpParamsForm
              mcpDetail={mcpDetail}
              showBackButton={hasConnectionInfo && viewMode === 'config'}
              setViewMode={setViewMode}
            />
          )}
        </Box>
      </Flex>
    </Box>
  )
}

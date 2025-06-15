'use client'
import { Flex, Text, Badge, Box } from '@chakra-ui/react'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { McpDetail } from '@/types/mcp'
import Image from 'next/image'
import { getMcpIcon } from '@/ui/icons/mcp-icons'

export interface McpDetailHeaderProps {
  mcpDetail: McpDetail
}

export default function McpDetailHeader({ mcpDetail }: McpDetailHeaderProps) {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')

  const mcpName = lng === 'zh' ? mcpDetail.name_cn || mcpDetail.name : mcpDetail.name
  const mcpDescription =
    lng === 'zh' ? mcpDetail.description_cn || mcpDetail.description : mcpDetail.description

  const iconSrc = getMcpIcon(mcpDetail.id)

  return (
    <Flex direction="column" gap="16px">
      {/* Main Info */}
      <Flex alignItems="center" gap="16px">
        <Box
          w="60px"
          h="60px"
          borderRadius="12px"
          overflow="hidden"
          bg="grayModern.50"
          p="12px"
          justifyContent="center"
          alignItems="center">
          <Image src={iconSrc} alt={mcpName} width={36} height={36} />
        </Box>
        <Flex direction="column" gap="8px" flex="1">
          <Flex alignItems="center" gap="12px">
            <Text color="grayModern.900" fontSize="20px" fontWeight={500} lineHeight="32px">
              {mcpName}
            </Text>
            {mcpDetail.hosted ? (
              <Badge
                display="inline-flex"
                padding="4px 12px"
                alignItems="center"
                borderRadius="16px"
                bg="green.50"
                color="green.600"
                fontSize="14px"
                fontWeight={500}>
                {t('mcpHub.hosted')}
              </Badge>
            ) : (
              <Badge
                display="inline-flex"
                padding="4px 12px"
                alignItems="center"
                borderRadius="16px"
                bg="grayModern.50"
                color="grayModern.500"
                fontSize="14px"
                fontWeight={500}>
                {t('mcpHub.local')}
              </Badge>
            )}
          </Flex>
          <Text color="grayModern.600" fontSize="16px" fontWeight={400} lineHeight="24px">
            {mcpDescription}
          </Text>
        </Flex>
      </Flex>
    </Flex>
  )
}

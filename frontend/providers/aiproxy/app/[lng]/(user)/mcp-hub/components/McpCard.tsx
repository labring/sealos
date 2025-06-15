'use client'
import { Box, Flex, Text, Badge, Icon } from '@chakra-ui/react'
import { useTranslationClientSide } from '@/app/i18n/client'
import { useI18n } from '@/providers/i18n/i18nContext'
import { Mcp } from '@/types/mcp'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getMcpIcon } from '@/ui/icons/mcp-icons'

export interface McpCardProps {
  mcp: Mcp
}

export default function McpCard({ mcp }: McpCardProps) {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const router = useRouter()

  const mcpName = lng === 'zh' ? mcp.name_cn || mcp.name : mcp.name
  const mcpDescription = lng === 'zh' ? mcp.description_cn || mcp.description : mcp.description

  const handleCardClick = () => {
    router.push(`/${lng}/mcp-hub/${mcp.id}`)
  }
  const iconSrc = getMcpIcon(mcp.id)
  return (
    <Box
      bg="white"
      borderRadius="12px"
      border="1px solid"
      borderColor="grayModern.150"
      p="20px"
      cursor="pointer"
      transition="all 0.2s ease"
      _hover={{
        borderColor: 'brightBlue.300',
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      }}
      onClick={handleCardClick}>
      <Flex direction="column" gap="16px">
        {/* Header with icon and title */}
        <Flex alignItems="center" gap="12px">
          <Box
            w="40px"
            h="40px"
            borderRadius="8px"
            overflow="hidden"
            bg="grayModern.50"
            display="flex"
            alignItems="center"
            justifyContent="center">
            <Image src={iconSrc} alt={mcpName} width={24} height={24} />
          </Box>
          <Flex direction="column" flex="1">
            <Flex alignItems="center" gap="8px">
              <Text
                color="grayModern.900"
                fontSize="16px"
                fontWeight={600}
                lineHeight="22px"
                noOfLines={1}>
                {mcpName}
              </Text>
              {mcp.hosted ? (
                <Badge
                  display="inline-flex"
                  padding="2px 8px"
                  alignItems="center"
                  borderRadius="12px"
                  bg="green.50"
                  color="green.600"
                  fontSize="12px"
                  fontWeight={500}>
                  {t('mcpHub.hosted')}
                </Badge>
              ) : (
                <Badge
                  display="inline-flex"
                  padding="2px 8px"
                  alignItems="center"
                  borderRadius="12px"
                  bg="grayModern.50"
                  color="grayModern.500"
                  fontSize="12px"
                  fontWeight={500}>
                  {t('mcpHub.local')}
                </Badge>
              )}
            </Flex>
          </Flex>
        </Flex>

        {/* Description */}
        <Text
          color="grayModern.600"
          fontSize="14px"
          fontWeight={400}
          lineHeight="20px"
          noOfLines={3}>
          {mcpDescription}
        </Text>

        {/* Footer */}
        <Flex justifyContent="flex-end">
          <Flex alignItems="center" gap="4px" color="brightBlue.500">
            <Text fontSize="12px" fontWeight={500}>
              {t('logs.detail')}
            </Text>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M4.5 2.25C4.5 1.97386 4.72386 1.75 5 1.75L9.25 1.75C9.52614 1.75 9.75 1.97386 9.75 2.25V6.5C9.75 6.77614 9.52614 7 9.25 7C8.97386 7 8.75 6.77614 8.75 6.5V3.31066L3.28033 8.78033C3.08507 8.97559 2.76849 8.97559 2.57322 8.78033C2.37796 8.58507 2.37796 8.26849 2.57322 8.07322L8.04289 2.60355L5 2.75C4.72386 2.75 4.5 2.52614 4.5 2.25Z"
                fill="currentColor"
              />
            </svg>
          </Flex>
        </Flex>
      </Flex>
    </Box>
  )
}

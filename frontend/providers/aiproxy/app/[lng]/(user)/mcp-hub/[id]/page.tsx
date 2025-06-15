'use client'
import { useTranslationClientSide } from '@/app/i18n/client'
import { Box, Flex, Text, Badge, Skeleton, SkeletonText, Center } from '@chakra-ui/react'
import { useI18n } from '@/providers/i18n/i18nContext'
import { useQuery } from '@tanstack/react-query'
import { getMcpDetail } from '@/api/platform'
import { QueryKey } from '@/types/query-key'
import { useParams } from 'next/navigation'
import McpDetailHeader from '../components/McpDetailHeader'
import McpDetailBody from '../components/McpDetailBody'

export default function McpDetailPage() {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const params = useParams()
  const id = params.id as string

  const { data: mcpDetail, isLoading } = useQuery({
    queryKey: [QueryKey.mcpDetail, id],
    queryFn: () => getMcpDetail(id),
    enabled: !!id
  })

  if (isLoading) {
    return (
      <Box
        w="full"
        h="full"
        display="flex"
        pt="4px"
        pb="12px"
        pr="12px"
        alignItems="center"
        overflow="hidden">
        <Box
          w="full"
          h="full"
          padding="27px 32px 12px 32px"
          bg="white"
          borderRadius="12px"
          overflow="hidden"
          minW="0">
          <Flex w="full" h="full" gap="24px" direction="column" minW="0">
            {/* Header Skeleton - 模拟 McpDetailHeader */}
            <Flex direction="column" gap="16px">
              {/* Main Info - 模拟图标、标题、徽章、描述 */}
              <Flex alignItems="center" gap="16px">
                <Skeleton w="60px" h="60px" borderRadius="12px" />
                <Flex direction="column" gap="8px" flex="1">
                  <Flex alignItems="center" gap="12px">
                    <Skeleton h="32px" w="200px" />
                    <Skeleton h="24px" w="60px" borderRadius="16px" />
                  </Flex>
                  <Skeleton h="24px" w="85%" />
                </Flex>
              </Flex>
            </Flex>

            {/* Body Skeleton - 模拟 McpDetailBody */}
            <Box flex="1" overflow="hidden" minW="0">
              <Flex h="full" gap="24px">
                {/* Readme Section Skeleton */}
                <Box flex="1" minW="0">
                  <Box h="full" overflow="hidden">
                    <SkeletonText
                      noOfLines={1}
                      spacing="4"
                      skeletonHeight="6"
                      mb="16px"
                      w="150px"
                    />
                    <SkeletonText noOfLines={15} spacing="3" skeletonHeight="4" />
                  </Box>
                </Box>

                {/* Params Config Section Skeleton */}
                <Box w="400px" flexShrink={0}>
                  <Box bg="grayModern.25" borderRadius="8px" p="20px" h="full">
                    <Flex direction="column" h="full">
                      {/* Header */}
                      <Flex alignItems="center" justifyContent="space-between" mb="16px">
                        <Skeleton h="22px" w="120px" />
                      </Flex>

                      {/* Content */}
                      <Box flex="1">
                        <SkeletonText noOfLines={8} spacing="4" skeletonHeight="4" />
                        <Box mt="20px">
                          <Skeleton h="40px" w="full" borderRadius="8px" />
                        </Box>
                      </Box>
                    </Flex>
                  </Box>
                </Box>
              </Flex>
            </Box>
          </Flex>
        </Box>
      </Box>
    )
  }

  if (!mcpDetail) {
    return (
      <Center h="400px">
        <Box textAlign="center">
          <Text color="grayModern.500" fontSize="16px" fontWeight={500} lineHeight="22px">
            {t('mcpHub.noResults')}
          </Text>
        </Box>
      </Center>
    )
  }

  return (
    <Box
      w="full"
      h="full"
      display="flex"
      pt="4px"
      pb="12px"
      pr="12px"
      alignItems="center"
      overflow="hidden">
      <Box
        w="full"
        h="full"
        padding="27px 32px 12px 32px"
        bg="white"
        borderRadius="12px"
        overflow="hidden"
        minW="0">
        <Flex w="full" h="full" gap="24px" direction="column" minW="0">
          {/* Header */}
          <McpDetailHeader mcpDetail={mcpDetail} />

          {/* Body */}
          <Box flex="1" overflow="hidden" minW="0">
            <McpDetailBody mcpDetail={mcpDetail} />
          </Box>
        </Flex>
      </Box>
    </Box>
  )
}

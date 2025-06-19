'use client'
import { useTranslationClientSide } from '@/app/i18n/client'
import { Box, Flex, Text, Badge, Skeleton, SkeletonText, Center, Icon } from '@chakra-ui/react'
import { useI18n } from '@/providers/i18n/i18nContext'
import { useQuery } from '@tanstack/react-query'
import { getMcpDetail } from '@/api/platform'
import { QueryKey } from '@/types/query-key'
import { useParams, useRouter } from 'next/navigation'
import McpDetailHeader from '../components/McpDetailHeader'
import McpDetailBody from '../components/McpDetailBody'

export default function McpDetailPage() {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: mcpDetail, isLoading } = useQuery({
    queryKey: [QueryKey.mcpDetail, id],
    queryFn: () => getMcpDetail(id),
    enabled: !!id
  })

  const handleNavigateToHub = () => {
    router.push(`/${lng}/mcp-hub`)
  }

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
            {/* Breadcrumb Skeleton */}
            <Flex alignItems="center" gap="8px">
              <Skeleton h="20px" w="80px" />
              <Text color="#7B838B" fontSize="16px" fontWeight={500}>
                /
              </Text>
              <Skeleton h="20px" w="120px" />
            </Flex>

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
          {/* Breadcrumb Navigation */}
          <Flex alignItems="center">
            <Flex
              alignItems={'center'}
              css={{
                ':hover': {
                  fill: '#219BF4',
                  color: '#219BF4',
                  '> svg': {
                    fill: '#219BF4'
                  }
                }
              }}
              onClick={handleNavigateToHub}>
              <Icon viewBox="0 0 15 15" fill={'#24282C'} w={'15px'} h="15px">
                <path d="M9.1875 13.1875L3.92187 7.9375C3.85937 7.875 3.81521 7.80729 3.78937 7.73438C3.76312 7.66146 3.75 7.58333 3.75 7.5C3.75 7.41667 3.76312 7.33854 3.78937 7.26562C3.81521 7.19271 3.85937 7.125 3.92187 7.0625L9.1875 1.79687C9.33333 1.65104 9.51562 1.57812 9.73438 1.57812C9.95312 1.57812 10.1406 1.65625 10.2969 1.8125C10.4531 1.96875 10.5312 2.15104 10.5312 2.35938C10.5312 2.56771 10.4531 2.75 10.2969 2.90625L5.70312 7.5L10.2969 12.0938C10.4427 12.2396 10.5156 12.4192 10.5156 12.6325C10.5156 12.8463 10.4375 13.0312 10.2812 13.1875C10.125 13.3438 9.94271 13.4219 9.73438 13.4219C9.52604 13.4219 9.34375 13.3438 9.1875 13.1875Z" />
              </Icon>
              <Text
                _hover={{ fill: '#219BF4', color: '#219BF4' }}
                ml="4px"
                color="#7B838B"
                fontSize="16px"
                fontWeight={500}
                lineHeight="20px"
                cursor="pointer">
                {t('Sidebar.McpHub')}
              </Text>
            </Flex>
            <Text color="#7B838B" fontSize="16px" fontWeight={500} px="8px">
              /
            </Text>
            <Text
              color="grayModern.900"
              fontSize="14px"
              fontWeight={500}
              lineHeight="20px"
              noOfLines={1}>
              {mcpDetail.name}
            </Text>
          </Flex>

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

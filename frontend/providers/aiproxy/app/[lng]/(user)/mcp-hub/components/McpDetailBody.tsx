'use client'
import { Flex, Box } from '@chakra-ui/react'
import { McpDetail } from '@/types/mcp'
import McpReadme from './McpReadme'
import McpParamsConfig from './McpParamsConfig'

export interface McpDetailBodyProps {
  mcpDetail: McpDetail
}

export default function McpDetailBody({ mcpDetail }: McpDetailBodyProps) {
  return (
    <Flex h="full" gap="24px" overflow="hidden" w="100%" minW="0">
      {/* Readme Section */}
      <Box flex="1" minW="0" maxW="100%" overflow="hidden" w="100%" position="relative">
        <Box position="absolute" top="0" left="0" right="0" bottom="0" overflow="hidden">
          <McpReadme mcpDetail={mcpDetail} />
        </Box>
      </Box>

      {/* Params Config Section - only show for hosted services */}
      {mcpDetail.hosted && (
        <Box w="400px" flexShrink={0}>
          <McpParamsConfig mcpDetail={mcpDetail} />
        </Box>
      )}
    </Flex>
  )
}

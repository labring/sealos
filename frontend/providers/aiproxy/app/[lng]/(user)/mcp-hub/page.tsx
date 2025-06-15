'use client'
import { useTranslationClientSide } from '@/app/i18n/client'
import { Box, Flex, Text } from '@chakra-ui/react'
import { useI18n } from '@/providers/i18n/i18nContext'
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMcpList } from '@/api/platform'
import { QueryKey } from '@/types/query-key'
import { Mcp } from '@/types/mcp'
import SearchFilter from './components/SearchFilter'
import McpList from './components/McpList'
import SwitchPage from '@/components/common/SwitchPage'

export default function McpHubPage() {
  const { lng } = useI18n()
  const { t } = useTranslationClientSide(lng, 'common')

  const [searchTerm, setSearchTerm] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(30) // 固定每页30个

  const { data: mcpListData, isLoading } = useQuery({
    queryKey: [QueryKey.mcpList, { page, perPage: pageSize }],
    queryFn: () => getMcpList({ page, perPage: pageSize })
  })

  const filteredMcps = useMemo(() => {
    if (!mcpListData?.mcps) return []

    let filtered = mcpListData.mcps

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      filtered = filtered.filter((mcp: Mcp) => {
        const name = lng === 'zh' ? mcp.name_cn || mcp.name : mcp.name
        const nameCn = mcp.name_cn || ''
        return name.toLowerCase().includes(term) || nameCn.toLowerCase().includes(term)
      })
    }

    // Service type filter
    if (serviceType) {
      if (serviceType === 'hosted') {
        filtered = filtered.filter((mcp: Mcp) => mcp.hosted)
      } else if (serviceType === 'local') {
        filtered = filtered.filter((mcp: Mcp) => !mcp.hosted)
      }
    }

    return filtered
  }, [mcpListData?.mcps, searchTerm, serviceType, lng])

  // 分页逻辑：对过滤后的结果进行分页
  const totalFiltered = filteredMcps.length
  const totalPages = Math.ceil(totalFiltered / pageSize)
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedMcps = filteredMcps.slice(startIndex, endIndex)

  return (
    <Box w="full" h="full" display="inline-flex" pt="4px" pb="12px" pr="12px" alignItems="center">
      <Box w="full" h="full" padding="27px 32px 0px 32px" bg="white" borderRadius="12px">
        <Flex w="full" h="full" gap="20px" direction="column">
          {/* Title */}
          <Flex>
            <Text
              color="black"
              fontFamily="PingFang SC"
              fontSize="20px"
              fontWeight={500}
              lineHeight="26px"
              letterSpacing="0.15px">
              {t('mcpHub.title')}
            </Text>
          </Flex>

          {/* Search and Filter */}
          <SearchFilter
            searchTerm={searchTerm}
            serviceType={serviceType}
            onSearchChange={(value) => {
              setSearchTerm(value)
              setPage(1) // 搜索时重置到第一页
            }}
            onServiceTypeChange={(type) => {
              setServiceType(type)
              setPage(1) // 筛选类型时重置到第一页
            }}
          />

          {/* MCP List - 可滚动区域 */}
          <Box
            flex="1"
            overflow="auto"
            pb="16px"
            pt="16px"
            sx={{
              '&::-webkit-scrollbar': {
                display: 'none'
              },
              msOverflowStyle: 'none',
              scrollbarWidth: 'none'
            }}>
            <McpList mcps={paginatedMcps} isLoading={isLoading} />
          </Box>

          {/* 分页组件 - 固定在底部 */}
          {totalFiltered > 0 && (
            <Box pb="8px">
              <SwitchPage
                m="0"
                justifyContent="end"
                currentPage={page}
                totalPage={totalPages}
                totalItem={totalFiltered}
                pageSize={pageSize}
                setCurrentPage={(idx: number) => setPage(idx)}
              />
            </Box>
          )}
        </Flex>
      </Box>
    </Box>
  )
}

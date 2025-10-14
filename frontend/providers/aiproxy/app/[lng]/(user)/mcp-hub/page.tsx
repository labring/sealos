'use client';
import { useState } from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';

import { getMcpList } from '@/api/platform';
import { useTranslationClientSide } from '@/app/i18n/client';
import SwitchPage from '@/components/common/SwitchPage';
import { useI18n } from '@/providers/i18n/i18nContext';
import { QueryKey } from '@/types/query-key';

import McpList from './components/McpList';
import SearchFilter from './components/SearchFilter';

export default function McpHubPage() {
  const { lng } = useI18n();
  const { t } = useTranslationClientSide(lng, 'common');

  const [searchTerm, setSearchTerm] = useState('');
  const [serviceType, setServiceType] = useState<'hosted' | 'local' | ''>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(28); // 固定每页28个

  const { data: mcpListData, isLoading } = useQuery({
    queryKey: [
      QueryKey.mcpList,
      { page, perPage: pageSize, type: serviceType, keyword: searchTerm },
    ],
    queryFn: () =>
      getMcpList({
        page,
        perPage: pageSize,
        type: serviceType,
        keyword: searchTerm,
      }),
  });

  const mcps = mcpListData?.mcps || [];
  const total = mcpListData?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

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
              letterSpacing="0.15px"
            >
              {t('mcpHub.title')}
            </Text>
          </Flex>

          {/* Search and Filter */}
          <SearchFilter
            searchTerm={searchTerm}
            serviceType={serviceType}
            onSearchChange={(value) => {
              setSearchTerm(value);
              setPage(1); // 搜索时重置到第一页
            }}
            onServiceTypeChange={(type) => {
              setServiceType(type as 'hosted' | 'local' | '');
              setPage(1); // 筛选类型时重置到第一页
            }}
          />

          {/* MCP List - 可滚动区域 */}
          <Box
            flex="1"
            overflow="auto"
            pb="12px"
            pt="8px"
            sx={{
              '&::-webkit-scrollbar': {
                display: 'none',
              },
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            }}
          >
            <McpList mcps={mcps} isLoading={isLoading} />
          </Box>

          {/* 分页组件 - 固定在底部 */}
          {total > 0 && (
            <Box pb="8px">
              <SwitchPage
                m="0"
                justifyContent="end"
                currentPage={page}
                totalPage={totalPages}
                totalItem={total}
                pageSize={pageSize}
                setCurrentPage={(idx: number) => setPage(idx)}
              />
            </Box>
          )}
        </Flex>
      </Box>
    </Box>
  );
}

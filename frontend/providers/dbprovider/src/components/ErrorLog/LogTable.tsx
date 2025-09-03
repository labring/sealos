import { BaseTable } from '@/components/BaseTable/baseTable';
import { SwitchPage } from '@/components/BaseTable/SwitchPage';
import MyIcon from '@/components/Icon';
import { formatTime } from '@/utils/tools';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable
} from '@tanstack/react-table';
import { useMemo } from 'react';

type LogContent = {
  timestamp: string;
  content: string;
};

interface LogTableProps {
  data: LogContent[];
  isLoading: boolean;
  globalFilter: string;
  onGlobalFilterChange: (filter: string) => void;
  page: number;
  pageSize: number;
  totalLogs: number;
  onPageChange: (page: number) => void;
  onExportLogs?: () => void;
}

export const LogTable = ({
  data,
  isLoading,
  globalFilter,
  onGlobalFilterChange,
  page,
  pageSize,
  totalLogs,
  onPageChange,
  onExportLogs
}: LogTableProps) => {
  const { t } = useTranslation();

  const columns = useMemo<Array<ColumnDef<LogContent>>>(
    () => [
      {
        accessorKey: 'timestamp',
        cell: ({ row }) => {
          return (
            <Box flexShrink={0} fontSize={'12px'} fontWeight={'500'} color={'grayModern.900'}>
              {formatTime(row.original.timestamp, 'YYYY-MM-DD HH:mm:ss.SSS')}
            </Box>
          );
        },
        header: () => {
          return (
            <Flex gap={'4px'} alignItems={'center'} w={'140px'}>
              {t('error_log.collection_time')}
            </Flex>
          );
        }
      },
      {
        accessorKey: 'content',
        header: () => {
          return (
            <Flex gap={'4px'} alignItems={'center'} w={'200px'}>
              {t('error_log.content')}
            </Flex>
          );
        },
        cell: ({ row }) => {
          return (
            <Box
              fontSize={'12px'}
              fontWeight={'400'}
              whiteSpace={'pre-wrap'}
              color={'grayModern.600'}
            >
              {row.original.content}
            </Box>
          );
        }
      }
    ],
    [t]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter
    },
    onGlobalFilterChange,
    globalFilterFn: (row, columnId, filterValue) => {
      const timestamp = formatTime(row.original.timestamp, 'YYYY-MM-DD HH:mm:ss.SSS')
        .toLowerCase()
        .includes(filterValue.toLowerCase());
      const content = row.original.content.toLowerCase().includes(filterValue.toLowerCase());
      return timestamp || content;
    }
  });

  return (
    <Flex flexDir={'column'} w={'100%'} h={'100%'}>
      <Flex alignItems={'center'} gap={4} justifyContent={'space-between'}>
        <Flex alignItems={'center'} gap={4}>
          <Text
            bg={'transparent'}
            border={'none'}
            boxShadow={'none'}
            color={'grayModern.900'}
            fontWeight={500}
            fontSize={'14px'}
            lineHeight={'20px'}
          >
            {t('Logs')}
          </Text>
        </Flex>
        {onExportLogs && (
          <Button
            minW={'75px'}
            fontSize={'12px'}
            variant={'outline'}
            h={'28px'}
            leftIcon={<MyIcon name="export" />}
            onClick={onExportLogs}
          >
            {t('error_log.export_log')}
          </Button>
        )}
      </Flex>

      {data.length > 0 ? (
        <>
          <BaseTable
            height={'100%'}
            mt={'12px'}
            table={table}
            isLoading={isLoading}
            overflowY={'auto'}
            tdStyle={{
              p: '10px 24px',
              borderBottom: 'none'
            }}
          />
          <SwitchPage
            mt={'auto'}
            justifyContent={'end'}
            currentPage={page}
            totalPage={Math.ceil(totalLogs / pageSize)}
            totalItem={totalLogs}
            pageSize={pageSize}
            setCurrentPage={onPageChange}
          />
        </>
      ) : (
        <Flex
          justifyContent={'center'}
          alignItems={'center'}
          flexDirection={'column'}
          height={'240px'}
        >
          <MyIcon name={'noEvents'} color={'transparent'} width={'36px'} height={'36px'} />
          <Box fontSize={'14px'} fontWeight={500} color={'grayModern.500'} pt={'8px'}>
            {t('no_data_available')}
          </Box>
        </Flex>
      )}
    </Flex>
  );
};

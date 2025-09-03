import { BaseTable } from '@/components/BaseTable/baseTable';
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
import type { ReactNode } from 'react';
import { Upload } from 'lucide-react';

type LogContent = {
  timestamp: string;
  content: string;
  container?: string;
  pod?: string;
};

interface LogTableProps {
  data: LogContent[];
  isLoading: boolean;
  globalFilter: string;
  onGlobalFilterChange: (filter: string) => void;
  onExportLogs?: () => void;
  pvcMap?: Record<string, string>; // pvcUid -> podName 映射
}

export const LogTable = ({
  data,
  isLoading,
  globalFilter,
  onGlobalFilterChange,
  onExportLogs,
  pvcMap = {}
}: LogTableProps) => {
  const { t } = useTranslation();

  const FieldLabel = ({ children }: { children: ReactNode }) => (
    <Box
      display={'flex'}
      flexDirection={'column'}
      justifyContent={'center'}
      flex={'1 0 0'}
      alignSelf={'stretch'}
      color={'#71717A'}
      fontFamily={'var( --typography-font-family-font-sans )'}
      fontWeight={'var( --font-weight-normal )'}
      fontStyle={'normal'}
      fontSize={'var( --typography-base-sizes-small-font-size )'}
      lineHeight={'var( --typography-base-sizes-small-line-height )'}
      letterSpacing={'0%'}
      verticalAlign={'middle'}
      textTransform={'none'}
    >
      {children}
    </Box>
  );

  const columns = useMemo<Array<ColumnDef<LogContent>>>(
    () => [
      {
        accessorKey: 'timestamp',
        cell: ({ row }) => {
          return (
            <Box
              flexShrink={0}
              overflow={'hidden'}
              color={'var(--base-foreground, #18181B)'}
              textOverflow={'ellipsis'}
              fontFamily={'Geist'}
              fontSize={'var(--typography-base-sizes-small-font-size, 14px)'}
              fontStyle={'normal'}
              fontWeight={'var(--font-weight-normal, 400)'}
              lineHeight={'var(--typography-base-sizes-small-line-height, 20px)'}
              display={'flex'}
              width={'100%'}
              minW={'85px'}
              pl={'0px'}
              p={'0'}
              alignItems={'flex-start'}
              gap={'0px'}
              alignSelf={'stretch'}
              borderBottom={'none'}
            >
              {formatTime(row.original.timestamp, 'YYYY/MM/DD HH:mm:ss')}
            </Box>
          );
        },
        header: () => <FieldLabel>time</FieldLabel>
      },
      {
        accessorKey: 'content',
        header: () => <FieldLabel>message</FieldLabel>,
        cell: ({ row }) => {
          return (
            <Box
              width={'100%'}
              maxWidth={'100%'}
              overflow={'hidden'}
              color={'var(--base-foreground, #18181B)'}
              fontFamily={'var(--typography-font-family-font-sans, Geist)'}
              fontSize={'var(--typography-base-sizes-small-font-size, 14px)'}
              fontStyle={'normal'}
              fontWeight={'var(--font-weight-normal, 400)'}
              lineHeight={'var(--typography-base-sizes-small-line-height, 20px)'}
              whiteSpace={'pre-wrap'}
              sx={{
                wordWrap: 'break-word',
                overflowWrap: 'break-word'
              }}
            >
              {row.original.content}
            </Box>
          );
        }
      },
      {
        accessorKey: 'container',
        header: () => <FieldLabel>container</FieldLabel>,
        cell: ({ row }) => {
          return (
            <Box
              flexShrink={0}
              overflow={'hidden'}
              color={'var(--base-foreground, #18181B)'}
              textOverflow={'ellipsis'}
              fontFamily={'Geist'}
              fontSize={'var(--typography-base-sizes-small-font-size, 14px)'}
              fontStyle={'normal'}
              fontWeight={'var(--font-weight-normal, 400)'}
              lineHeight={'var(--typography-base-sizes-small-line-height, 20px)'}
              display={'flex'}
              width={'100%'}
              pl={'0px'}
              p={'0'}
              alignItems={'flex-start'}
              gap={'0px'}
              alignSelf={'stretch'}
              borderBottom={'none'}
            >
              {row.original.container || '-'}
            </Box>
          );
        }
      },
      {
        accessorKey: 'pod',
        header: () => <FieldLabel>pod</FieldLabel>,
        cell: ({ row }) => {
          // 使用PVC映射将PVC UID转换为Pod名称
          const podDisplay = pvcMap[row.original.pod || ''] || row.original.pod || '-';
          return (
            <Box
              flexShrink={0}
              overflow={'hidden'}
              color={'var(--base-foreground, #18181B)'}
              textOverflow={'ellipsis'}
              fontFamily={'Geist'}
              fontSize={'var(--typography-base-sizes-small-font-size, 14px)'}
              fontStyle={'normal'}
              fontWeight={'var(--font-weight-normal, 400)'}
              lineHeight={'var(--typography-base-sizes-small-line-height, 20px)'}
              display={'flex'}
              width={'100%'}
              pl={'0px'}
              p={'0'}
              alignItems={'flex-start'}
              gap={'0px'}
              alignSelf={'stretch'}
              borderBottom={'none'}
            >
              {podDisplay}
            </Box>
          );
        }
      }
    ],
    [t, pvcMap]
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
            sx={{
              bg: 'transparent',
              border: 'none',
              boxShadow: 'none',
              color: '#000',
              fontFamily: 'Geist',
              fontWeight: 500,
              fontSize: '18px',
              lineHeight: '28px',
              fontStyle: 'normal'
            }}
          >
            Logs
          </Text>
        </Flex>
        {onExportLogs && (
          <Button
            onClick={onExportLogs}
            leftIcon={<Upload size={16} style={{ flexShrink: 0 }} strokeWidth="2" />}
            sx={{
              display: 'flex',
              height: '40px',
              padding: '8px 16px',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              borderRadius: '8px',
              border: '1px solid #E4E4E7',
              background: '#FFF',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              color: '#18181B',
              fontFamily: 'Geist',
              fontSize: '14px',
              fontWeight: 500,
              lineHeight: '20px',
              fontStyle: 'normal',
              '& svg': {
                color: '#737373'
              },
              '&:hover': {
                backgroundColor: '#000 !important',
                color: '#FFF !important',
                '& svg': {
                  color: '#FFF !important'
                }
              }
            }}
          >
            Export
          </Button>
        )}
      </Flex>

      {/* 分割线 */}
      <Box
        width={'100%'}
        height={'1px'}
        borderTop={'1px solid'}
        borderTopColor={'grayModern.200'}
        mt={'7px'}
        mb={'20px'}
      />

      {data.length > 0 ? (
        <>
          <BaseTable
            height={'100%'}
            mt={'0px'}
            table={table}
            isLoading={isLoading}
            overflowY={'auto'}
            tdStyle={{
              p: '10px 24px',
              borderBottom: 'none'
            }}
            sx={{
              '& table': {
                tableLayout: 'fixed !important',
                width: '100% !important'
              },
              '& td:first-child': {
                width: '15% !important',
                minWidth: '100px !important',
                maxWidth: '15% !important'
              },
              '& td:nth-child(2)': {
                width: '55% !important',
                maxWidth: '55% !important',
                overflow: 'hidden',
                wordWrap: 'break-word',
                whiteSpace: 'pre-wrap',
                paddingRight: '20px'
              },
              '& td:nth-child(3)': {
                width: '15% !important',
                minWidth: '100px !important',
                maxWidth: '15% !important',
                paddingLeft: '20px',
                paddingRight: '20px'
              },
              '& td:nth-child(4)': {
                width: '15% !important',
                minWidth: '100px !important',
                maxWidth: '15% !important',
                paddingLeft: '20px'
              },
              '& th:first-child': {
                width: '15% !important',
                minWidth: '100px !important',
                maxWidth: '15% !important'
              },
              '& th:nth-child(2)': {
                width: '55% !important',
                maxWidth: '55% !important'
              },
              '& th:nth-child(3)': {
                width: '15% !important',
                minWidth: '100px !important',
                maxWidth: '15% !important'
              },
              '& th:nth-child(4)': {
                width: '15% !important',
                minWidth: '100px !important',
                maxWidth: '15% !important'
              }
            }}
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

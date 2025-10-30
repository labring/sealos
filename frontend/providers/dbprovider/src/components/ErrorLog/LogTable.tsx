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
  const { t } = useTranslation('common');

  const FieldLabel = ({ children }: { children: ReactNode }) => (
    <Box
      display={'flex'}
      flexDirection={'column'}
      justifyContent={'center'}
      flex={'1 0 0'}
      alignSelf={'stretch'}
      color={'#71717A'}
      fontWeight={'400'}
      fontSize={'14px'}
      lineHeight={'20px'}
      textTransform={'none'}
    >
      {children}
    </Box>
  );

  const columns = useMemo<Array<ColumnDef<LogContent>>>(
    () => [
      {
        accessorKey: 'timestamp',
        size: 150,
        cell: ({ row }) => {
          return (
            <Box
              flexShrink={0}
              overflow={'hidden'}
              color={'#18181B'}
              fontSize={'14px'}
              lineHeight={'20px'}
              display={'flex'}
              width={'100%'}
              minW={'85px'}
              pl={'0px'}
              alignItems={'flex-start'}
              alignSelf={'stretch'}
            >
              {formatTime(row.original.timestamp, 'YYYY/MM/DD HH:mm:ss')}
            </Box>
          );
        },
        header: () => <FieldLabel>Time</FieldLabel>
      },
      {
        accessorKey: 'content',
        size: 350,
        header: () => <FieldLabel>Message</FieldLabel>,
        cell: ({ row }) => {
          return (
            <Box
              width={'100%'}
              overflow={'hidden'}
              color={'#18181B'}
              fontSize={'14px'}
              lineHeight={'20px'}
              whiteSpace={'pre-wrap'}
              pr={'20px'}
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
        size: 150,
        header: () => <FieldLabel>Container</FieldLabel>,
        cell: ({ row }) => {
          return (
            <Box
              flexShrink={0}
              overflow={'hidden'}
              color={'#18181B'}
              fontSize={'14px'}
              lineHeight={'20px'}
              display={'flex'}
              width={'100%'}
              pl={'0px'}
              pr={'20px'}
              alignItems={'flex-start'}
              alignSelf={'stretch'}
            >
              {row.original.container || '-'}
            </Box>
          );
        }
      },
      {
        accessorKey: 'pod',
        size: 250,
        header: () => <FieldLabel>Pod</FieldLabel>,
        cell: ({ row }) => {
          const podDisplay = pvcMap[row.original.pod || ''] || row.original.pod || '-';
          return (
            <Box
              flexShrink={0}
              overflow={'hidden'}
              color={'#18181B'}
              fontSize={'14px'}
              lineHeight={'20px'}
              display={'flex'}
              width={'100%'}
              pl={'20px'}
              p={'0'}
              alignItems={'flex-start'}
              alignSelf={'stretch'}
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
    columnResizeMode: 'onChange',
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
              fontWeight: 500,
              fontSize: '18px',
              lineHeight: '28px',
              fontStyle: 'normal'
            }}
          >
            {t('Logs')}
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
              color: '#18181B',
              fontSize: '14px',
              fontWeight: 500,
              lineHeight: '20px',
              fontStyle: 'normal',
              '& svg': {
                color: '#737373'
              },
              '&:hover': {
                backgroundColor: '#000',
                color: '#FFF',
                '& svg': {
                  color: '#FFF'
                }
              }
            }}
          >
            {t('Export')}
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
                tableLayout: 'fixed',
                width: '100%'
              },
              '& thead th': {
                position: 'sticky',
                top: 0,
                zIndex: 1
              },
              '& thead': {
                position: 'sticky',
                top: 0,
                zIndex: 1
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

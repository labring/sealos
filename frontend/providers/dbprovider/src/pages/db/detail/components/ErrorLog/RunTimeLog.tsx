import { getLogContent, getLogFiles } from '@/api/db';
import { BaseTable } from '@/components/BaseTable/baseTable';
import { SwitchPage } from '@/components/BaseTable/SwitchPage';
import MyIcon from '@/components/Icon';
import { useDBStore } from '@/store/db';
import { DBDetailType, SupportReconfigureDBType } from '@/types/db';
import { LogTypeEnum } from '@/constants/log';
import { TFile } from '@/utils/kubeFileSystem';
import { formatTime } from '@/utils/tools';
import { ChevronDownIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Flex,
  MenuButton,
  Input,
  InputGroup,
  InputLeftElement
} from '@chakra-ui/react';
import { SealosMenu } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable
} from '@tanstack/react-table';
import { useTranslation } from 'next-i18next';
import { useMemo, useState } from 'react';
import { I18nCommonKey } from '@/types/i18next';

type LogContent = {
  timestamp: string;
  content: string;
};

const getEmptyLogResult = (page = 0, pageSize = 0) => ({
  logs: [] as LogContent[],
  metadata: {
    total: 0,
    page,
    pageSize,
    processingTime: '',
    hasMore: false
  }
});

export default function RunTimeLog({
  db,
  logType,
  filteredSubNavList
}: {
  db: DBDetailType;
  logType: LogTypeEnum;
  filteredSubNavList?: {
    label: string;
    value: LogTypeEnum;
  }[];
}) {
  const { t } = useTranslation();
  const { intervalLoadPods, dbPods } = useDBStore();
  const [podName, setPodName] = useState('');
  const [logFile, setLogFile] = useState<TFile>();
  const [data, setData] = useState<LogContent[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [globalFilter, setGlobalFilter] = useState('');

  useQuery(['intervalLoadPods', db?.dbName], () => db?.dbName && intervalLoadPods(db?.dbName), {
    onSuccess: () => {
      !podName && setPodName(dbPods[0]?.podName);
    }
  });

  const { data: logFiles = [] } = useQuery(
    ['getLogFiles', podName, db?.dbType],
    async () => {
      if (!podName || !db?.dbType) return [];
      return await getLogFiles({
        podName,
        dbType: db.dbType as SupportReconfigureDBType,
        logType
      });
    },
    {
      enabled: !!podName && db?.dbType !== 'mongodb',
      onSuccess: (data) => {
        !logFile && setLogFile(data[0]);
      }
    }
  );

  const { data: logData, isLoading } = useQuery(
    ['getLogContent', logFile?.path, podName, db?.dbType, page, pageSize],
    async () => {
      if (!podName || !db?.dbType) return getEmptyLogResult();

      const params = {
        page,
        pageSize,
        podName,
        dbType: db.dbType as SupportReconfigureDBType,
        logType,
        logPath: 'default'
      } as const;

      if (db.dbType === 'mongodb') {
        return await getLogContent(params);
      }

      if (!logFile?.path) {
        return getEmptyLogResult();
      }

      return await getLogContent({ ...params, logPath: logFile.path });
    },
    {
      onSuccess(data) {
        setData(data.logs);
      }
    }
  );

  const columns = useMemo<Array<ColumnDef<LogContent>>>(
    () => [
      {
        accessorKey: 'timestamp',
        cell: ({ row }) => {
          return (
            <Box
              flexShrink={0}
              w="200px"
              fontSize={'12px'}
              fontWeight={'500'}
              color={'grayModern.900'}
            >
              {formatTime(row.original.timestamp, 'YYYY-MM-DD HH:mm:ss.SSS')}
            </Box>
          );
        },
        header: () => {
          return (
            <Flex gap={'4px'} alignItems={'center'} w={'200px'}>
              {t('error_log.collection_time')}
              <MyIcon name="time" />
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
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter
    },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const timestamp = formatTime(row.original.timestamp, 'YYYY-MM-DD HH:mm:ss.SSS')
        .toLowerCase()
        .includes(filterValue.toLowerCase());
      const content = row.original.content.toLowerCase().includes(filterValue.toLowerCase());
      return timestamp || content;
    }
  });

  return (
    <Flex flex={'1 0 0'} h={'0'} flexDirection={'column'}>
      <Flex mt={'8px'} mb="12px" ml={'26px'} position={'relative'} alignItems={'center'} zIndex={2}>
        {filteredSubNavList?.length === 1 && (
          <Box
            key={filteredSubNavList[0].label}
            mr={5}
            py={'8px'}
            cursor={'pointer'}
            fontSize={'md'}
          >
            {t(filteredSubNavList[0].label as I18nCommonKey)}
          </Box>
        )}

        <SealosMenu
          width={240}
          Button={
            <MenuButton
              as={Button}
              variant={'outline'}
              leftIcon={<MyIcon name="pods" width={'16px'} height={'16px'} />}
              minW={'240px'}
              h={'32px'}
              textAlign={'start'}
              bg={'grayModern.100'}
              borderRadius={'md'}
              border={'1px solid #E8EBF0'}
            >
              <Flex alignItems={'center'}>
                <Box flex={1}>{podName}</Box>
                <ChevronDownIcon ml={2} />
              </Flex>
            </MenuButton>
          }
          menuList={dbPods.map((item) => ({
            isActive: item.podName === podName,
            child: <Box>{item.podName}</Box>,
            onClick: () => setPodName(item.podName)
          }))}
        />

        {db?.dbType !== 'mongodb' && (
          <SealosMenu
            width={240}
            Button={
              <MenuButton
                ml={'12px'}
                as={Button}
                variant={'outline'}
                leftIcon={<MyIcon name="pods" width={'16px'} height={'16px'} />}
                minW={'240px'}
                h={'32px'}
                textAlign={'start'}
                bg={'grayModern.100'}
                borderRadius={'md'}
                border={'1px solid #E8EBF0'}
              >
                <Flex alignItems={'center'}>
                  <Box flex={1}>{logFile?.name}</Box>
                  <ChevronDownIcon ml={2} />
                </Flex>
              </MenuButton>
            }
            menuList={logFiles.map((item) => ({
              isActive: item.name === logFile?.name,
              child: <Box>{item.name}</Box>,
              onClick: () => setLogFile(item)
            }))}
          />
        )}

        <InputGroup w={'240px'} h={'32px'} ml={'auto'} mr={'24px'}>
          <InputLeftElement>
            <MyIcon name="search" />
          </InputLeftElement>
          <Input
            placeholder={t('error_log.search_content')}
            value={globalFilter ?? ''}
            onChange={(e) => table.setGlobalFilter(e.target.value)}
            bg={'white'}
          />
        </InputGroup>
      </Flex>
      <BaseTable table={table} isLoading={isLoading} overflowY={'auto'} />
      <SwitchPage
        mt={'auto'}
        justifyContent={'end'}
        currentPage={page}
        totalPage={Math.ceil((logData?.metadata?.total || 0) / pageSize)}
        totalItem={logData?.metadata?.total || 0}
        pageSize={pageSize}
        setCurrentPage={(idx: number) => setPage(idx)}
      />
    </Flex>
  );
}

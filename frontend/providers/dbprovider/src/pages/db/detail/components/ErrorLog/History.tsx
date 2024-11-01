import { getLogContent, getLogFiles } from '@/api/db';
import MyIcon from '@/components/Icon';
import { BaseTable } from '@/components/MyTable/baseTable';
import { useDBStore } from '@/store/db';
import { DBDetailType, SupportReconfigureDBType } from '@/types/db';
import { TFile } from '@/utils/kubeFileSystem';
import { formatTime } from '@/utils/tools';
import { ChevronDownIcon } from '@chakra-ui/icons';
import { Box, Button, Flex, MenuButton } from '@chakra-ui/react';
import { SealosMenu } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useTranslation } from 'next-i18next';
import { useMemo, useState } from 'react';

type LogContent = {
  timestamp: string;
  content: string;
};

export default function History({ db }: { db?: DBDetailType }) {
  const { t } = useTranslation();
  const { intervalLoadPods, dbPods } = useDBStore();
  const [podName, setPodName] = useState('');
  const [logFile, setLogFile] = useState<TFile>();
  const [data, setData] = useState<LogContent[]>([]);

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
        logType: 'error'
      });
    },
    {
      onSuccess: (data) => {
        !logFile && setLogFile(data[0]);
      }
    }
  );

  const { data: logContent = [], isLoading } = useQuery(
    ['getLogContent', logFile?.path, podName, db?.dbType],
    async () => {
      if (!logFile?.path) return [];
      return await getLogContent({
        logPath: logFile.path,
        page: 1,
        pageSize: 500,
        podName,
        dbType: db?.dbType as SupportReconfigureDBType,
        logType: 'error'
      });
    },
    {
      onSuccess(data) {
        setData(data);
      }
    }
  );

  console.log(logFiles, dbPods, logContent);

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
              {formatTime(row.original.timestamp)}
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
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <Flex mt={'8px'} flex={'1 0 0'} h={'0'} flexDirection={'column'}>
      <Box my="12px" ml={'26px'} position={'relative'} zIndex={2}>
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
      </Box>
      <BaseTable table={table} isLoading={isLoading} overflowY={'auto'} />
    </Flex>
  );
}

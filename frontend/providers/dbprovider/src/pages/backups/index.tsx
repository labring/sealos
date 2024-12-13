import { deleteBackup, getBackups } from '@/api/backup';
import MyIcon from '@/components/Icon';
import Sidebar from '@/components/Sidebar';
import useEnvStore from '@/store/env';
import { serviceSideProps } from '@/utils/i18n';
import { Box, Button, Center, Flex, Input, InputGroup, InputLeftElement } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useState, useMemo, useCallback } from 'react';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable
} from '@tanstack/react-table';
import dayjs from 'dayjs';
import { Tooltip } from '@chakra-ui/react';
import { QuestionOutlineIcon } from '@chakra-ui/icons';
import MyTooltip from '@/components/MyTooltip';
import { I18nCommonKey } from '@/types/i18next';
import { BackupStatusEnum, backupTypeMap } from '@/constants/backup';
import { BackupItemType } from '@/types/db';
import { useConfirm } from '@/hooks/useConfirm';
import { useMessage } from '@sealos/ui';
import { useLoading } from '@/hooks/useLoading';
import { getErrText } from '@/utils/tools';
import { BaseTable } from '@/components/BaseTable/baseTable';
import { groupBy } from 'lodash';

export default function Backups() {
  const { t } = useTranslation();
  const router = useRouter();
  const [globalFilter, setGlobalFilter] = useState('');
  const [backupInfo, setBackupInfo] = useState<BackupItemType>();
  const { SystemEnv } = useEnvStore();
  const { message: toast } = useMessage();
  const { Loading, setIsLoading } = useLoading();

  const { openConfirm: openConfirmDel, ConfirmChild: RestartConfirmDelChild } = useConfirm({
    content: t('confirm_delete_the_backup')
  });

  const { data, refetch, isLoading } = useQuery(['getBackups'], getBackups, {
    cacheTime: 2 * 60 * 1000
  });

  console.log(data);

  const operationIconStyles = {
    w: '18px'
  };

  const columns = useMemo<Array<ColumnDef<BackupItemType>>>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: () => t('name')
      },
      {
        id: 'remark',
        accessorKey: 'remark',
        header: () => t('remark')
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: () => t('status'),
        cell: ({ row }) => (
          <Flex color={row.original.status.color} alignItems={'center'}>
            {t(row.original.status.label as I18nCommonKey)}
            {row.original.failureReason && (
              <Tooltip label={row.original.failureReason}>
                <QuestionOutlineIcon ml={1} />
              </Tooltip>
            )}
          </Flex>
        )
      },
      {
        id: 'backupTime',
        accessorKey: 'startTime',
        header: () => t('backup_time'),
        cell: ({ row }) => dayjs(row.original.startTime).format('YYYY/MM/DD HH:mm')
      },
      {
        id: 'type',
        accessorKey: 'type',
        header: () => t('Type'),
        cell: ({ row }) => t(backupTypeMap[row.original.type]?.label) || '-'
      },
      {
        id: 'actions',
        header: () => t('operation'),
        cell: ({ row }) =>
          row.original.status.value !== BackupStatusEnum.InProgress ? (
            <Flex>
              <MyTooltip label={t('restore_backup')}>
                <Button variant={'square'} onClick={() => setBackupInfo(row.original)}>
                  <MyIcon name={'restore'} {...operationIconStyles} />
                </Button>
              </MyTooltip>
              <MyTooltip label={t('delete_backup')}>
                <Button
                  variant={'square'}
                  mr={0}
                  _hover={{ bg: '#EFF0F1', color: 'red.600' }}
                  onClick={openConfirmDel(() => confirmDel(row.original.name))}
                >
                  <MyIcon name={'delete'} {...operationIconStyles} />
                </Button>
              </MyTooltip>
            </Flex>
          ) : null
      }
    ],
    [t]
  );

  // const table = useReactTable({
  //   data: data || [],
  //   columns,
  //   getCoreRowModel: getCoreRowModel(),
  //   getFilteredRowModel: getFilteredRowModel(),
  //   state: {
  //     globalFilter
  //   },
  //   onGlobalFilterChange: setGlobalFilter
  // });

  const confirmDel = useCallback(
    async (name: string) => {
      try {
        setIsLoading(true);
        await deleteBackup(name);
        await refetch();
      } catch (err) {
        toast({
          title: getErrText(err),
          status: 'error'
        });
      }
      setIsLoading(false);
    },
    [refetch, setIsLoading, toast]
  );

  const groupedData = useMemo(() => {
    if (!data) return [];
    return Object.entries(groupBy(data, (item) => item.dbName)).map(([dbName, items]) => ({
      dbName,
      items
    }));
  }, [data]);

  console.log(groupedData);

  return (
    <Flex bg={'grayModern.100'} h={'100%'} pb={'12px'} pr={'12px'}>
      <Sidebar />
      <Box bg={'white'} px={'32px'} h={'full'} w={'full'} borderRadius={'xl'} overflow={'auto'}>
        <Flex h={'90px'} alignItems={'center'}>
          <Box fontSize={'xl'} color={'grayModern.900'} fontWeight={'bold'}>
            {t('backup_center')}
          </Box>

          <Box flex={1}></Box>
          <InputGroup w={'200px'} h={'32px'} mr={'24px'} ml={'12px'}>
            <InputLeftElement>
              <MyIcon name="search" />
            </InputLeftElement>
            <Input
              placeholder={t('error_log.search_content')}
              value={globalFilter ?? ''}
              // onChange={(e) => table.setGlobalFilter(e.target.value)}
            />
          </InputGroup>
        </Flex>

        {/* <BaseTable table={table} isLoading={isLoading} overflow={'auto'} /> */}
      </Box>
    </Flex>
  );
}

export async function getServerSideProps(content: any) {
  return {
    props: {
      ...(await serviceSideProps(content))
    }
  };
}

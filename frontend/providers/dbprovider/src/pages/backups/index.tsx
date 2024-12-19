import { deleteBackup, getBackups } from '@/api/backup';
import { getDBByName } from '@/api/db';
import MyIcon from '@/components/Icon';
import MyTooltip from '@/components/MyTooltip';
import Sidebar from '@/components/Sidebar';
import { BackupStatusEnum, backupTypeMap } from '@/constants/backup';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import useEnvStore from '@/store/env';
import { BackupItemType, DBDetailType } from '@/types/db';
import { I18nCommonKey } from '@/types/i18next';
import { serviceSideProps } from '@/utils/i18n';
import { getErrText } from '@/utils/tools';
import { QuestionOutlineIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Center,
  Flex,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr
} from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable
} from '@tanstack/react-table';
import dayjs from 'dayjs';
import { groupBy } from 'lodash';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import React, { useCallback, useMemo, useState } from 'react';
import RestoreModal from '../db/detail/components/RestoreModal';

const operationIconStyles = {
  w: '18px'
};

export default function Backups() {
  const { t } = useTranslation();
  const router = useRouter();
  const [globalFilter, setGlobalFilter] = useState('');
  const [backupInfo, setBackupInfo] = useState<BackupItemType>();
  const { SystemEnv } = useEnvStore();
  const { message: toast } = useMessage();
  const { Loading, setIsLoading } = useLoading();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const { openConfirm: openConfirmDel, ConfirmChild: ConfirmDelChild } = useConfirm({
    content: t('confirm_delete_the_backup')
  });

  const [db, setDb] = useState<DBDetailType>();

  const loadDBDetail = useCallback(
    async (dbName: string) => {
      try {
        const res = await getDBByName(dbName);
        setDb(res);
      } catch (err) {
        toast({
          title: getErrText(err),
          status: 'error'
        });
      }
    },
    [toast]
  );

  const { data, refetch, isLoading } = useQuery(['getBackupList'], getBackups, {
    onSuccess: (data) => {
      if (data.length > 0 && Object.keys(expandedGroups).length === 0) {
        const firstDbName = data[0].dbName;
        setExpandedGroups((prev) => ({
          ...prev,
          [firstDbName]: true
        }));
      }
    },
    refetchInterval: 60000
  });

  const confirmDel = useCallback(
    async (name: string) => {
      try {
        setIsLoading(true);
        await deleteBackup(name);
        await refetch();
        toast({
          title: t('Success'),
          status: 'success'
        });
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
              <MyTooltip label={row.original.failureReason}>
                <QuestionOutlineIcon ml={1} />
              </MyTooltip>
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
                <Button
                  variant={'square'}
                  onClick={() => {
                    loadDBDetail(row.original.dbName);
                    setBackupInfo(row.original);
                  }}
                >
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
    [confirmDel, openConfirmDel, t]
  );

  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter
    },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const name = row.original.name.toLowerCase().includes(filterValue.toLowerCase());
      const remark = row.original.remark.toLowerCase().includes(filterValue.toLowerCase());
      return name || remark;
    }
  });

  return (
    <Flex bg={'grayModern.100'} h={'100%'} pb={'12px'} pr={'12px'}>
      <Sidebar />
      <Box
        bg={'white'}
        px={'32px'}
        py={'24px'}
        h={'full'}
        w={'full'}
        borderRadius={'xl'}
        overflow={'auto'}
      >
        <Flex h={'36px'} alignItems={'center'} mb={'12px'}>
          <Box fontSize={'xl'} color={'grayModern.900'} fontWeight={'bold'}>
            {t('backup_center')}
          </Box>

          <Box flex={1}></Box>
          <InputGroup w={'200px'} h={'32px'} ml={'12px'}>
            <InputLeftElement>
              <MyIcon name="search" />
            </InputLeftElement>
            <Input
              placeholder={t('backup_center_search_tip')}
              value={globalFilter ?? ''}
              onChange={(e) => table.setGlobalFilter(e.target.value)}
            />
          </InputGroup>
        </Flex>
        <Table
          variant="unstyled"
          width={'full'}
          fontWeight={500}
          sx={{
            borderSpacing: '0 4px',
            borderCollapse: 'separate'
          }}
        >
          <Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Th
                    key={header.id}
                    fontSize={'12px'}
                    py="13px"
                    px={'24px'}
                    bg={'grayModern.100'}
                    color={'grayModern.600'}
                    border={'none'}
                    whiteSpace={'nowrap'}
                    _first={{
                      borderLeftRadius: '6px'
                    }}
                    _last={{
                      borderRightRadius: '6px'
                    }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </Th>
                ))}
              </Tr>
            ))}
          </Thead>
          <Tbody>
            {Object.entries(groupBy(table.getRowModel().rows, (row) => row.original.dbName)).map(
              ([dbName, rows]) => (
                <React.Fragment key={dbName}>
                  <Tr>
                    <Td colSpan={table.getAllColumns().length} px="0px">
                      <Flex alignItems="center">
                        <Center
                          _hover={{
                            bg: 'rgba(17, 24, 36, 0.05)'
                          }}
                          cursor="pointer"
                          w="24px"
                          h="24px"
                          borderRadius="4px"
                          onClick={() =>
                            setExpandedGroups((prev) => ({
                              ...prev,
                              [dbName]: !prev[dbName]
                            }))
                          }
                        >
                          <MyIcon
                            name={'chevronDown'}
                            transform={expandedGroups[dbName] ? 'rotate(0deg)' : 'rotate(-90deg)'}
                            w="20px"
                            h="20px"
                            color="grayModern.400"
                          />
                        </Center>
                        <Text ml={'8px'} fontWeight="bold" fontSize={'16px'}>
                          {dbName}
                        </Text>
                        <Image
                          ml={'16px'}
                          width={'20px'}
                          height={'20px'}
                          alt={dbName}
                          src={`/images/${rows[0]?.original?.dbType}.svg`}
                        />
                      </Flex>
                    </Td>
                  </Tr>
                  {expandedGroups[dbName] &&
                    rows.map((row, index) => (
                      <Tr key={row.id} fontSize={'12px'} bg={'grayModern.25'}>
                        {row.getVisibleCells().map((cell) => (
                          <Td
                            key={cell.id}
                            py="10px"
                            px={'24px'}
                            whiteSpace={'nowrap'}
                            sx={{
                              '&:first-of-type': {
                                borderLeftRadius: '6px'
                              },
                              '&:last-of-type': {
                                borderRightRadius: '6px'
                              }
                            }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </Td>
                        ))}
                      </Tr>
                    ))}
                </React.Fragment>
              )
            )}
          </Tbody>
        </Table>
        {data?.length === 0 && (
          <Flex
            height={'400px'}
            justifyContent={'center'}
            alignItems={'center'}
            flexDirection={'column'}
            flex={1}
          >
            <MyIcon name={'noEvents'} color={'transparent'} width={'36px'} height={'36px'} />
            <Box pt={'8px'}>{t('no_data_available')}</Box>
          </Flex>
        )}
      </Box>
      <ConfirmDelChild />
      {!!backupInfo?.name && db && (
        <RestoreModal db={db} backupInfo={backupInfo} onClose={() => setBackupInfo(undefined)} />
      )}
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

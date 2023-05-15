import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Flex,
  MenuButton
} from '@chakra-ui/react';
import type { BackupItemType } from '@/types/db';
import { useLoading } from '@/hooks/useLoading';
import { useToast } from '@/hooks/useToast';
import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { useDBStore } from '@/store/db';
import { useConfirm } from '@/hooks/useConfirm';
import dayjs from 'dayjs';
import { backupTypeMap } from '@/constants/backup';

const BackupTable = ({ dbName }: { dbName: string }) => {
  const { toast } = useToast();
  const { Loading } = useLoading();
  const { openConfirm: openConfirmDel, ConfirmChild: RestartConfirmDelChild } = useConfirm({
    content: '确认删除该备份？'
  });
  const { openConfirm: openConfirmRecover, ConfirmChild: RestartConfirmRecoverChild } = useConfirm({
    content: '确认恢复到该备份状态？'
  });

  const { intervalLoadBackups, backups } = useDBStore();

  const confirmDel = useCallback(async () => {
    console.log(111);
  }, []);
  const confirmRecover = useCallback(async () => {
    console.log(111);
  }, []);

  const columns: {
    title: string;
    dataIndex?: keyof BackupItemType;
    key: string;
    render?: (item: BackupItemType, i: number) => React.ReactNode | string;
  }[] = [
    {
      title: '名字',
      key: 'name',
      dataIndex: 'name'
    },
    {
      title: '状态',
      key: 'status',
      render: (item: BackupItemType) => <Box color={item.status.color}>{item.status.label}</Box>
    },
    {
      title: '备份时间段',
      key: 'backupTime',
      render: (item: BackupItemType) => (
        <Box>
          <Flex>start: {dayjs(item.startTime).format('YYYY/MM/DD hh:mm')}</Flex>
          <Flex>end: {dayjs(item.endTime).format('YYYY/MM/DD hh:mm')}</Flex>
        </Box>
      )
    },
    {
      title: '大小',
      key: 'storage',
      render: (item: BackupItemType) => <>{item.storage}Gi</>
    },
    {
      title: '类型',
      key: 'type',
      render: (item: BackupItemType) => <>{backupTypeMap[item.type]?.label || '-'}</>
    },
    {
      title: '操作',
      key: 'control',
      render: (item: BackupItemType, i: number) => (
        <Flex>
          <Button mr={3} variant={'base'} onClick={openConfirmRecover(confirmRecover)}>
            恢复
          </Button>
          <Button
            variant={'base'}
            color={'#EA7676'}
            _hover={{ color: '' }}
            onClick={openConfirmDel(confirmDel)}
          >
            删除
          </Button>
        </Flex>
      )
    }
  ];

  const { isInitialLoading } = useQuery(
    ['intervalLoadBackups'],
    () => {
      intervalLoadBackups(dbName);
      return null;
    },
    {
      refetchInterval: 3000
    }
  );

  return (
    <Box h={'100%'}>
      <TableContainer overflow={'overlay'}>
        <Table variant={'simple'} backgroundColor={'white'}>
          <Thead>
            <Tr>
              {columns.map((item) => (
                <Th
                  py={4}
                  key={item.key}
                  border={'none'}
                  backgroundColor={'#F8F8FA'}
                  fontWeight={'500'}
                >
                  {item.title}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {backups.map((app, i) => (
              <Tr key={app.id}>
                {columns.map((col) => (
                  <Td key={col.key}>
                    {col.render
                      ? col.render(app, i)
                      : col.dataIndex
                      ? `${app[col.dataIndex]}`
                      : '-'}
                  </Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
      <Loading loading={isInitialLoading} fixed={false} />
      <RestartConfirmDelChild />
      <RestartConfirmRecoverChild />
    </Box>
  );
};

export default BackupTable;

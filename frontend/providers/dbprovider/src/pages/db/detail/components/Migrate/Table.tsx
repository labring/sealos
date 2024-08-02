import { deleteMigrateByName, getMigrateList, getMigratePodList } from '@/api/migrate';
import MyIcon from '@/components/Icon';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import { MigrateItemType } from '@/types/migrate';
import { getErrText } from '@/utils/tools';
import {
  Box,
  Button,
  Flex,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr
} from '@chakra-ui/react';
import { MyTooltip, useMessage } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslation } from 'next-i18next';
import React, { useCallback, useState } from 'react';
import LogsModal from './LogsModal';
import MigrateStatus from './MigrateStatus';
import { I18nCommonKey } from '@/types/i18next';

export const MigrateTable = ({ dbName }: { dbName: string }) => {
  if (!dbName) return <></>;
  const { t } = useTranslation();
  const { message: toast } = useMessage();
  const { Loading, setIsLoading } = useLoading();
  const [migrateName, setMigrateName] = useState('');
  const [logsPodIndex, setLogsPodIndex] = useState<number>();

  const {
    data: migrateList = [],
    refetch,
    isInitialLoading,
    isSuccess
  } = useQuery(['getMigrateList', dbName], () => getMigrateList(dbName));

  const { data: MigratePods = [] } = useQuery(
    ['getMigratePodList', migrateName],
    () => getMigratePodList(migrateName),
    {
      enabled: !!migrateName,
      onSuccess(data) {
        if (data?.[0]?.metadata?.name) {
          setLogsPodIndex(0);
        }
      }
    }
  );

  const { openConfirm: openConfirmDel, ConfirmChild: ConfirmDelChild } = useConfirm({
    content: t('confirm_delete_the_migrate')
  });

  const confirmDel = useCallback(
    async (name: string) => {
      try {
        setIsLoading(true);
        await deleteMigrateByName(name);
        refetch();
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

  const openLogModal = async (name: string) => {
    setMigrateName(name);
  };

  const columns: {
    title: I18nCommonKey;
    dataIndex?: keyof MigrateItemType;
    key: string;
    render?: (item: MigrateItemType, i: number) => React.ReactNode | string;
  }[] = [
    {
      title: 'name',
      key: 'name',
      dataIndex: 'name'
    },
    {
      title: 'remark',
      key: 'remark',
      dataIndex: 'remark'
    },
    {
      title: 'status',
      key: 'status',
      render: (item: MigrateItemType) => (
        <MigrateStatus migrateStatus={item.status} migrateName={item.name} />
      )
    },
    {
      title: 'creation_time',
      key: 'creationtime',
      render: (item: MigrateItemType) => <>{dayjs(item.startTime).format('YYYY/MM/DD HH:mm')}</>
    },
    {
      title: 'operation',
      key: 'control',
      render: (item: MigrateItemType) => {
        return (
          <Flex alignItems={'center'} gap={'4px'}>
            <MyTooltip offset={[0, 10]} label={t('Logs')}>
              <Button variant={'square'} onClick={() => openLogModal(item.name)}>
                <MyIcon name={'log'} w="18px" h="18px" fill={'#485264'} />
              </Button>
            </MyTooltip>

            <MyTooltip offset={[0, 10]} label={t('Delete')}>
              <Button
                variant={'square'}
                onClick={openConfirmDel(() => confirmDel(item.name))}
                _hover={{ bg: '#EFF0F1', color: 'red.600' }}
              >
                <MyIcon name={'delete'} w="18px" h="18px" fill={'#485264'} />
              </Button>
            </MyTooltip>
          </Flex>
        );
      }
    }
  ];

  return (
    <Flex flexDirection={'column'} h={'100%'} position={'relative'}>
      <TableContainer overflowY={'auto'}>
        <Table variant={'simple'} backgroundColor={'white'}>
          <Thead>
            <Tr>
              {columns.map((item) => (
                <Th
                  fontSize={'12px'}
                  py={4}
                  key={item.key}
                  border={'none'}
                  backgroundColor={'grayModern.50'}
                  fontWeight={'500'}
                  color={'grayModern.600'}
                >
                  {t(item.title)}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {migrateList.map((app, i) => (
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
      {isSuccess && migrateList.length === 0 && (
        <Flex justifyContent={'center'} alignItems={'center'} flexDirection={'column'} flex={1}>
          <MyIcon name={'noEvents'} color={'transparent'} width={'36px'} height={'36px'} />
          <Box pt={'8px'}>{t('no_data_available')}</Box>
        </Flex>
      )}
      <ConfirmDelChild />
      <Loading loading={isInitialLoading} fixed={false} />

      {logsPodIndex !== undefined && (
        <LogsModal
          podName={MigratePods[logsPodIndex]?.metadata?.name || ''}
          containerName={migrateName}
          pods={MigratePods.map((item, i) => ({
            alias: `${migrateName}-${i + 1}`,
            podName: item?.metadata?.name || `${i + 1}`
          }))}
          podAlias={`${migrateName}-${logsPodIndex + 1}`}
          setLogsPodName={(name: string) =>
            setLogsPodIndex(MigratePods.findIndex((item) => item.metadata?.name! === name))
          }
          closeFn={() => {
            setLogsPodIndex(undefined);
            setMigrateName('');
          }}
        />
      )}
    </Flex>
  );
};

export default React.memo(MigrateTable);

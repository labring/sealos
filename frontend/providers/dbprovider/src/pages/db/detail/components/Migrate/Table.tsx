import { deleteMigrateByName, getMigrateList, getMigratePodList } from '@/api/migrate';
import MyIcon from '@/components/Icon';
import MyMenu from '@/components/Menu';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import { useToast } from '@/hooks/useToast';
import { MigrateItemType } from '@/types/migrate';
import { getErrText } from '@/utils/tools';
import { ChevronDownIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Flex,
  MenuButton,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useDisclosure
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslation } from 'next-i18next';
import React, { useCallback, useState } from 'react';
import LogsModal from './LogsModal';
import MigrateStatus from './MigrateStatus';

export const MigrateTable = ({ dbName }: { dbName: string }) => {
  if (!dbName) return <></>;
  const { t } = useTranslation();
  const { toast } = useToast();
  const { Loading, setIsLoading } = useLoading();
  const [migrateName, setMigrateName] = useState('');
  const [logsPodIndex, setLogsPodIndex] = useState<number>();

  const {
    data: migrateList = [],
    refetch,
    isInitialLoading
  } = useQuery(['getMigrateList', dbName], () => getMigrateList(dbName), {
    refetchInterval: 3000
  });

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
    content: t('Confirm delete the migrate')
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
    title: string;
    dataIndex?: keyof MigrateItemType;
    key: string;
    render?: (item: MigrateItemType, i: number) => React.ReactNode | string;
  }[] = [
    {
      title: 'Name',
      key: 'name',
      dataIndex: 'name'
    },
    {
      title: 'Remark',
      key: 'remark',
      dataIndex: 'remark'
    },
    {
      title: 'Status',
      key: 'status',
      render: (item: MigrateItemType) => (
        <MigrateStatus migrateStatus={item.status} migrateName={item.name} />
      )
    },
    {
      title: 'Backup Time',
      key: 'backupTime',
      render: (item: MigrateItemType) => <>{dayjs(item.startTime).format('YYYY/MM/DD HH:mm')}</>
    },
    {
      title: 'Operation',
      key: 'control',
      render: (item: MigrateItemType) => {
        return (
          <Flex>
            <Button
              mr={3}
              leftIcon={<MyIcon name="log" w="16px" h="16px" />}
              variant={'base'}
              px={3}
              onClick={() => openLogModal(item.name)}
            >
              {t('Logs')}
            </Button>
            <Button
              mr={3}
              leftIcon={<MyIcon name="delete" w="16px" h="16px" />}
              variant={'base'}
              px={3}
              onClick={openConfirmDel(() => confirmDel(item.name))}
            >
              {t('Delete')}
            </Button>
          </Flex>
        );
      }
    }
  ];

  return (
    <Box h={'100%'} position={'relative'}>
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
    </Box>
  );
};

export default React.memo(MigrateTable);

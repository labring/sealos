import { deleteBackup, getBackupList, getBackupPolicyByCluster } from '@/api/backup';
import MyIcon from '@/components/Icon';
import { BackupStatusEnum, backupTypeMap } from '@/constants/backup';
import { useConfirm } from '@/hooks/useConfirm';
import { useLoading } from '@/hooks/useLoading';
import type { BackupItemType, DBDetailType } from '@/types/db';
import { I18nCommonKey } from '@/types/i18next';
import { getErrText } from '@/utils/tools';
import { QuestionOutlineIcon } from '@chakra-ui/icons';
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
  Tooltip,
  Tr,
  useDisclosure
} from '@chakra-ui/react';
import { MyTooltip, useMessage } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslation } from 'next-i18next';
import dynamic from 'next/dynamic';
import React, {
  ForwardedRef,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState
} from 'react';

const BackupModal = dynamic(() => import('./BackupModal'));
const RestoreModal = dynamic(() => import('./RestoreModal'));

export type ComponentRef = {
  openBackup: () => void;
  backupProcessing: boolean;
};

const BackupTable = ({ db }: { db?: DBDetailType }, ref: ForwardedRef<ComponentRef>) => {
  if (!db) return <></>;
  const { t } = useTranslation();
  const { message: toast } = useMessage();
  const { Loading, setIsLoading } = useLoading();
  const {
    isOpen: isOpenBackupModal,
    onOpen: onOpenBackupModal,
    onClose: onCloseBackupModal
  } = useDisclosure();

  const { openConfirm: openConfirmDel, ConfirmChild: RestartConfirmDelChild } = useConfirm({
    content: t('confirm_delete_the_backup')
  });

  const [backupInfo, setBackupInfo] = useState<BackupItemType>();

  const {
    isInitialLoading,
    refetch,
    data: backups = [],
    isSuccess
  } = useQuery(
    ['intervalLoadBackups'],
    async () => {
      const backups: BackupItemType[] = await getBackupList(db.dbName);
      backups.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      return backups;
    },
    {
      refetchInterval: 3000
    }
  );

  // hav processing backup
  const backupProcessing = useMemo(
    () => !!backups.find((item) => item.status.value === BackupStatusEnum.InProgress),
    [backups]
  );

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

  const operationIconBoxStyles = {
    alignItems: 'center',
    justifyContent: 'center',
    w: '32px',
    h: '32px',
    borderRadius: '32px',
    mr: 3,
    cursor: 'pointer',
    _hover: { bg: '#EFF0F1' }
  };
  const operationIconStyles = {
    w: '18px'
  };

  const columns: {
    title: I18nCommonKey;
    dataIndex?: keyof BackupItemType;
    key: string;
    render?: (item: BackupItemType, i: number) => React.ReactNode | string;
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
      render: (item: BackupItemType) => (
        <Flex color={item.status.color} alignItems={'center'}>
          {t(item.status.label as I18nCommonKey)}
          {item.failureReason && (
            <Tooltip label={item.failureReason}>
              <QuestionOutlineIcon ml={1} />
            </Tooltip>
          )}
        </Flex>
      )
    },
    {
      title: 'backup_time',
      key: 'backupTime',
      render: (item: BackupItemType) => <>{dayjs(item.startTime).format('YYYY/MM/DD HH:mm')}</>
    },
    {
      title: 'Type',
      key: 'type',
      render: (item: BackupItemType) => <>{t(backupTypeMap[item.type]?.label) || '-'}</>
    },
    {
      title: 'operation',
      key: 'control',
      render: (item: BackupItemType) =>
        item.status.value !== BackupStatusEnum.InProgress ? (
          <Flex>
            <MyTooltip label={t('restore_backup')}>
              <Button variant={'square'} onClick={() => setBackupInfo(item)}>
                <MyIcon name={'restore'} {...operationIconStyles} />
              </Button>
            </MyTooltip>
            <MyTooltip label={t('delete_backup')}>
              <Button
                variant={'square'}
                mr={0}
                _hover={{ bg: '#EFF0F1', color: 'red.600' }}
                onClick={openConfirmDel(() => confirmDel(item.name))}
              >
                <MyIcon name={'delete'} {...operationIconStyles} />
              </Button>
            </MyTooltip>
          </Flex>
        ) : null
    }
  ];

  useImperativeHandle(ref, () => ({
    openBackup: onOpenBackupModal,
    backupProcessing
  }));

  const { data, refetch: refetchPolicy } = useQuery(['initpolicy', db.dbName, db.dbType], () =>
    getBackupPolicyByCluster({
      dbName: db.dbName,
      dbType: db.dbType
    })
  );

  return (
    <Flex flexDirection={'column'} h="100%" position={'relative'}>
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
      {isSuccess && backups.length === 0 && (
        <Flex justifyContent={'center'} alignItems={'center'} flexDirection={'column'} flex={1}>
          <MyIcon name={'noEvents'} color={'transparent'} width={'36px'} height={'36px'} />
          <Box pt={'8px'}>{t('no_data_available')}</Box>
        </Flex>
      )}
      <Loading loading={isInitialLoading} fixed={false} />
      <RestartConfirmDelChild />
      {isOpenBackupModal && data && (
        <BackupModal
          dbName={db.dbName}
          dbType={db.dbType}
          defaultVal={data}
          onClose={onCloseBackupModal}
          refetchPolicy={refetchPolicy}
        />
      )}
      {!!backupInfo?.name && (
        <RestoreModal db={db} backupInfo={backupInfo} onClose={() => setBackupInfo(undefined)} />
      )}
    </Flex>
  );
};

export default React.memo(forwardRef(BackupTable));

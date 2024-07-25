import { applyYamlList, getConfigByName, getOpsRequest } from '@/api/db';
import MyIcon from '@/components/Icon';
import { DBReconfigureKey, DBTypeConfigMap } from '@/constants/db';
import { useLoading } from '@/hooks/useLoading';
import type { DBDetailType, OpsRequestItemType } from '@/types/db';
import { I18nCommonKey } from '@/types/i18next';
import { json2Reconfigure } from '@/utils/json2Yaml';
import { adjustDifferencesForIni, compareDBConfig } from '@/utils/tools';
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
  Tr,
  useDisclosure
} from '@chakra-ui/react';
import { MyTooltip, useMessage } from '@sealos/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useTranslation } from 'next-i18next';
import React, { ForwardedRef, forwardRef, useImperativeHandle, useState } from 'react';
import EditConfig from './EditConfig';

export type ComponentRef = {
  openBackup: () => void;
};

const ReconfigureTable = ({ db }: { db?: DBDetailType }, ref: ForwardedRef<ComponentRef>) => {
  if (!db) return <></>;

  const { t } = useTranslation();
  const { message: toast } = useMessage();
  const { Loading, setIsLoading } = useLoading();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [parameters, setParameters] = useState<{ key: string; value: string }[]>([]);
  const [defaultConfig, setDefaultConfig] = useState('');
  const queryClient = useQueryClient();

  const {
    isInitialLoading,
    data: operationList = [],
    isSuccess
  } = useQuery(
    ['getOperationList', db.dbName],
    async () => {
      const operationList = await getOpsRequest({
        name: db.dbName,
        label: DBReconfigureKey
      });
      operationList.sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
      return operationList;
    },
    {
      enabled: !!db.dbName,
      refetchInterval: 60000
    }
  );

  const operationIconStyles = {
    w: '18px'
  };

  const handleOpsRequestDetail = (item: OpsRequestItemType) => {
    setParameters(item.parameters);
    onOpen();
  };

  const columns: {
    title: I18nCommonKey;
    dataIndex?: keyof OpsRequestItemType;
    key: string;
    render?: (item: OpsRequestItemType, i: number) => React.ReactNode | string;
  }[] = [
    {
      title: 'name',
      key: 'name',
      dataIndex: 'name'
    },

    {
      title: 'status',
      key: 'status',
      render: (item) => <Flex alignItems={'center'}>{item.status}</Flex>
    },
    {
      title: 'creation_time',
      key: 'creation_time',
      render: (item) => <>{dayjs(item.startTime).format('YYYY/MM/DD HH:mm')}</>
    },
    {
      title: 'operation',
      key: 'control',
      render: (item) => (
        <Flex>
          <MyTooltip label={t('details')} autoFocus={false}>
            <Button
              variant={'square'}
              autoFocus={false}
              onClick={() => handleOpsRequestDetail(item)}
            >
              <MyIcon name={'detail'} {...operationIconStyles} />
            </Button>
          </MyTooltip>
        </Flex>
      )
    }
  ];

  const { data: config } = useQuery(
    ['getConfigByName', db.dbName],
    async () => {
      return getConfigByName({ name: db.dbName, dbType: db.dbType });
    },
    {
      enabled: !!db.dbName
    }
  );

  useImperativeHandle(ref, () => ({
    openBackup: async () => {
      if (config) {
        setDefaultConfig(config);
        onOpen();
      } else {
        toast({
          title: t('dbconfig.get_config_err')
        });
      }
    }
  }));

  const handleReconfigure = async ({
    oldConfig,
    newConfig
  }: {
    oldConfig: string;
    newConfig: string;
  }) => {
    const reconfigureType = DBTypeConfigMap[db.dbType].type;
    const differences = compareDBConfig({
      oldConfig: oldConfig,
      newConfig: newConfig,
      type: reconfigureType
    });

    if (differences.length > 0) {
      const reconfigureYaml = json2Reconfigure(
        db.dbName,
        db.dbType,
        db.id,
        adjustDifferencesForIni(differences, reconfigureType)
      );
      await applyYamlList([reconfigureYaml], 'create');
      toast({ title: t('Success') });
    }
    queryClient.invalidateQueries({ queryKey: ['getOperationList'] });
  };

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
            {operationList.map((app, i) => (
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

      {isSuccess && operationList.length === 0 && (
        <Flex justifyContent={'center'} alignItems={'center'} flexDirection={'column'} flex={1}>
          <MyIcon name={'noEvents'} color={'transparent'} width={'36px'} height={'36px'} />
          <Box pt={'8px'}>{t('no_data_available')}</Box>
        </Flex>
      )}

      <Loading loading={isInitialLoading} fixed={false} />

      {isOpen && (
        <EditConfig
          parameters={parameters}
          dbType={db.dbType}
          defaultConfig={defaultConfig}
          onClose={() => {
            onClose();
            setParameters([]);
            setDefaultConfig('');
          }}
          successCb={(e) => {
            handleReconfigure({
              oldConfig: defaultConfig,
              newConfig: e
            });
          }}
        />
      )}
    </Flex>
  );
};

export default React.memo(forwardRef(ReconfigureTable));

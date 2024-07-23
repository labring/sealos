import {
  applyYamlList,
  delDBServiceByName,
  getDBSecret,
  getDBServiceByName,
  getDBStatefulSetByName
} from '@/api/db';
import MyIcon from '@/components/Icon';
import { DBTypeEnum, DBTypeSecretMap, defaultDBDetail, templateDeployKey } from '@/constants/db';
import useEnvStore from '@/store/env';
import { SOURCE_PRICE } from '@/store/static';
import type { DBDetailType } from '@/types/db';
import { I18nCommonKey } from '@/types/i18next';
import { json2NetworkService } from '@/utils/json2Yaml';
import { printMemory, useCopyData } from '@/utils/tools';
import {
  Box,
  Button,
  Center,
  Divider,
  Flex,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Switch,
  Text,
  useDisclosure
} from '@chakra-ui/react';
import { MyTooltip, SealosCoin, useMessage } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import { has, pick } from 'lodash';
import { useTranslation } from 'next-i18next';
import { useCallback, useMemo, useState } from 'react';
import { sealosApp } from 'sealos-desktop-sdk/app';

const AppBaseInfo = ({ db = defaultDBDetail }: { db: DBDetailType }) => {
  const { t } = useTranslation();
  const { copyData } = useCopyData();
  const { SystemEnv, initSystemEnv } = useEnvStore();
  const [showSecret, setShowSecret] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { message: toast } = useMessage();

  const [hasApplicationSource, sourceName] = useMemo(() => {
    return db?.labels
      ? [has(db.labels, templateDeployKey), db.labels[templateDeployKey]]
      : [false, ''];
  }, [db.labels]);

  const supportConnectDB = useMemo(() => {
    return !!['postgresql', 'mongodb', 'apecloud-mysql', 'redis', 'milvus'].find(
      (item) => item === db.dbType
    );
  }, [db.dbType]);

  const { data: dbStatefulSet } = useQuery(
    ['getDBStatefulSetByName', db.dbName, db.dbType],
    () => getDBStatefulSetByName(db.dbName, db.dbType),
    {
      enabled: !!db.dbName && !!db.dbType
    }
  );

  const { data: secret } = useQuery(
    ['getDBSecret', db.dbName],
    () => (db.dbName ? getDBSecret({ dbName: db.dbName, dbType: db.dbType }) : null),
    {
      enabled: supportConnectDB
    }
  );

  const { data: service, refetch } = useQuery(
    ['getDBService', db.dbName],
    () => (db.dbName ? getDBServiceByName(`${db.dbName}-export`) : null),
    {
      enabled: supportConnectDB,
      retry: 3,
      onSuccess(data) {
        setIsChecked(!!data);
      },
      onError(error) {
        setIsChecked(false);
      }
    }
  );

  const externalNetWork = useMemo(() => {
    const host = `${SystemEnv?.domain}`;
    const port = service?.spec?.ports?.[0]?.nodePort?.toString() || '';
    let connection = `${DBTypeSecretMap[db.dbType].connectKey}://${secret?.username}:${
      secret?.password
    }@${host}:${port}`;

    if (db?.dbType === 'mongodb' || db?.dbType === 'postgresql') {
      connection += '/?directConnection=true';
    }

    return {
      host,
      port,
      connection
    };
  }, [db, secret, service, SystemEnv]);

  const [baseSecret, otherSecret] = useMemo(
    () => [pick(secret, ['username', 'password']), pick(secret, ['host', 'port', 'connection'])],
    [secret]
  );

  const appInfoTable = useMemo<
    {
      name: I18nCommonKey;
      iconName: string;
      items: {
        label: I18nCommonKey;
        value?: string;
        copy?: string;
      }[];
    }[]
  >(
    () => [
      {
        name: 'basic',
        iconName: 'info',
        items: [
          { label: 'creation_time', value: db.createTime },
          { label: 'database_type', value: db.dbType },
          { label: 'version', value: db.dbVersion }
        ]
      },
      {
        name: 'config_info',
        iconName: 'settings',
        items: [
          { label: 'limit_cpu', value: `${db.cpu / 1000} Core` },
          {
            label: 'limit_memory',
            value: printMemory(db.memory)
          },
          { label: 'storage', value: `${db.storage}Gi` }
        ]
      }
    ],
    [db]
  );

  const onclickConnectDB = useCallback(() => {
    if (!secret) return;
    const commandMap = {
      [DBTypeEnum.postgresql]: `psql '${secret.connection}'`,
      [DBTypeEnum.mongodb]: `mongosh '${secret.connection}'`,
      [DBTypeEnum.mysql]: `mysql -h ${secret.host} -P ${secret.port} -u ${secret.username} -p${secret.password}`,
      [DBTypeEnum.redis]: `redis-cli -h ${secret.host} -p ${secret.port}`,
      [DBTypeEnum.kafka]: ``,
      [DBTypeEnum.qdrant]: ``,
      [DBTypeEnum.nebula]: ``,
      [DBTypeEnum.weaviate]: ``,
      [DBTypeEnum.milvus]: ``
    };

    const defaultCommand = commandMap[db.dbType];

    sealosApp.runEvents('openDesktopApp', {
      appKey: 'system-terminal',
      query: {
        defaultCommand
      },
      messageData: { type: 'new terminal', command: defaultCommand }
    });
  }, [db.dbType, secret]);

  const openNetWorkService = async () => {
    try {
      if (!dbStatefulSet || !db) {
        return toast({
          title: 'Missing Parameters',
          status: 'error'
        });
      }
      const yaml = json2NetworkService({ dbDetail: db, dbStatefulSet: dbStatefulSet });
      console.log(yaml);
      await applyYamlList([yaml], 'create');
      onClose();
      setIsChecked(true);
      refetch();
      toast({
        title: t('Success'),
        status: 'success'
      });
    } catch (error) {
      toast({
        title: String(error),
        status: 'error'
      });
    }
  };

  const closeNetWorkService = async () => {
    try {
      await delDBServiceByName(`${db.dbName}-export`);
      setIsChecked(false);
      toast({
        title: t('successfully_closed_external_network_access'),
        status: 'success'
      });
    } catch (error) {
      toast({
        title: typeof error === 'string' ? error : t('service_deletion_failed'),
        status: 'error'
      });
    }
  };

  return (
    <Box px={5} py={7} position={'relative'}>
      {hasApplicationSource && (
        <Box fontSize={'base'}>
          <Flex alignItems={'center'} gap={'8px'} color={'grayModern.600'} fontWeight={'bold'}>
            <MyIcon w={'16px'} name={'target'}></MyIcon>
            <Box>{t('application_source')}</Box>
          </Flex>
          <Box mt={'12px'} p={'16px'} backgroundColor={'grayModern.50'} borderRadius={'lg'}>
            <Flex
              flexWrap={'wrap'}
              _notFirst={{
                mt: 4
              }}
              cursor={'pointer'}
              onClick={() => {
                if (sourceName) {
                  sealosApp.runEvents('openDesktopApp', {
                    appKey: 'system-template',
                    pathname: '/instance',
                    query: { instanceName: sourceName }
                  });
                }
              }}
            >
              <Box flex={'0 0 110px'} w={0} color={'grayModern.900'}>
                {t('app_store')}
              </Box>
              <Box color={'grayModern.600'}>{t('manage_all_resources')}</Box>
              <MyIcon name="upperRight" width={'14px'} color={'grayModern.600'} />
            </Flex>
          </Box>
        </Box>
      )}
      {appInfoTable.map((info) => (
        <Box
          _notFirst={{
            mt: 6
          }}
          key={info.name}
          fontSize={'base'}
        >
          <Flex alignItems={'center'} gap={'8px'} color={'grayModern.600'} fontWeight={'bold'}>
            <MyIcon w={'16px'} name={info.iconName as any}></MyIcon>
            <Box>{t(info.name)}</Box>
          </Flex>

          <Box mt={'12px'} p={'16px'} backgroundColor={'grayModern.50'} borderRadius={'lg'}>
            {info.items.map((item, i) => (
              <Flex
                key={item.label || i}
                flexWrap={'wrap'}
                _notFirst={{
                  mt: 4
                }}
              >
                <Box flex={'0 0 110px'} w={0} color={'grayModern.900'}>
                  {t(item.label)}
                </Box>
                <Box
                  color={'grayModern.600'}
                  flex={'1 0 0'}
                  textOverflow={'ellipsis'}
                  overflow={'hidden'}
                  whiteSpace={'nowrap'}
                >
                  <MyTooltip label={item.value}>
                    <Box
                      as="span"
                      cursor={!!item.copy ? 'pointer' : 'default'}
                      onClick={() => item.value && !!item.copy && copyData(item.copy)}
                    >
                      {item.value}
                    </Box>
                  </MyTooltip>
                </Box>
              </Flex>
            ))}
          </Box>
        </Box>
      ))}
      {/* secret */}
      {secret && (
        <>
          <Flex
            fontSize={'base'}
            gap={'8px'}
            mt={'24px'}
            alignItems={'center'}
            color={'grayModern.600'}
          >
            <MyIcon w={'16px'} name={'connection'}></MyIcon>
            <Box fontWeight={'bold'}>{t('connection_info')}</Box>
            <Center
              h="28px"
              w="28px"
              bg="grayModern.150"
              borderRadius={'md'}
              cursor={'pointer'}
              onClick={() => setShowSecret(!showSecret)}
              _hover={{
                color: 'brightBlue.600'
              }}
            >
              <MyIcon name={showSecret ? 'read' : 'unread'} w={'16px'}></MyIcon>
            </Center>
            {db.dbType !== 'milvus' && (
              <>
                <Center
                  gap={'6px'}
                  h="28px"
                  fontSize={'12px'}
                  bg="grayModern.150"
                  borderRadius={'md'}
                  px="8px"
                  cursor={'pointer'}
                  fontWeight={'bold'}
                  onClick={() => onclickConnectDB()}
                  _hover={{
                    color: 'brightBlue.600'
                  }}
                >
                  <MyIcon name="terminal" w="16px" h="16px" />
                  {t('direct_connection')}
                </Center>
                <Center ml="auto">
                  <Text color={'grayModern.900'}> {t('external_network')} </Text>
                  <Switch
                    ml="12px"
                    size="md"
                    isChecked={isChecked}
                    onChange={(e) => (isChecked ? closeNetWorkService() : onOpen())}
                  />
                </Center>
              </>
            )}
          </Flex>
          <Box
            mt={'12px'}
            p={4}
            backgroundColor={'grayModern.50'}
            borderRadius={'lg'}
            position={'relative'}
            fontSize={'base'}
          >
            {Object.entries(baseSecret).map(([name, value]) => (
              <Box
                key={name}
                _notFirst={{
                  mt: 4
                }}
              >
                <Box color={'grayModern.900'}>{name}</Box>
                <Box color={'grayModern.600'}>
                  <Box as="span" cursor={'pointer'} onClick={() => copyData(value)}>
                    {showSecret ? value : '***********'}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
          <Box
            mt={'12px'}
            p={4}
            backgroundColor={'grayModern.50'}
            borderRadius={'lg'}
            position={'relative'}
            fontSize={'base'}
          >
            <Text color={'grayModern.900'}>{t('intranet_address')}</Text>
            <Divider my="12px" borderColor={'rgb(226, 232, 240)'} />
            {Object.entries(otherSecret).map(([name, value]) => (
              <Box
                key={name}
                _notFirst={{
                  mt: 4
                }}
              >
                <Box color={'grayModern.900'}>{name}</Box>
                <Box color={'grayModern.600'}>
                  <Box as="span" cursor={'pointer'} onClick={() => copyData(value)}>
                    {showSecret ? value : '***********'}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
          {isChecked && (
            <Box
              mt={'12px'}
              p={4}
              backgroundColor={'grayModern.50'}
              borderRadius={'lg'}
              position={'relative'}
              fontSize={'base'}
            >
              <Text color={'grayModern.900'}>{t('external_address')}</Text>
              <Divider my="12px" />
              {Object.entries(externalNetWork).map(([name, value]) => (
                <Box
                  key={name}
                  _notFirst={{
                    mt: 4
                  }}
                >
                  <Box color={'grayModern.900'}>{name}</Box>
                  <Box color={'grayModern.600'}>
                    <Box as="span" cursor={'pointer'} onClick={() => copyData(value)}>
                      {showSecret ? value : '***********'}
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          <Modal isOpen={isOpen} onClose={onClose} lockFocusAcrossFrames={false}>
            <ModalOverlay />
            <ModalContent minW={'430px'}>
              <ModalHeader height={'48px'}>{t('enable_external_network_access')}</ModalHeader>
              <ModalCloseButton top={'10px'} right={'10px'} />
              <Flex
                alignItems={'center'}
                justifyContent={'center'}
                flexDirection={'column'}
                pt="20px"
                pb="45px"
                px="40px"
              >
                <Text fontSize={'14px'} fontWeight={500} color={'grayModern.500'}>
                  {t('billing_standards')}
                </Text>
                <Center mt="16px" color={'#24282C'} fontSize={'24px'} fontWeight={600}>
                  {SOURCE_PRICE.nodeports}
                  <SealosCoin ml="8px" mr={'2px'} name="currency" w="20px" h="20px"></SealosCoin> /
                  {t('Hour')}
                </Center>
                <Button
                  minW={'100px'}
                  height={'32px'}
                  mt="32px"
                  variant={'solid'}
                  onClick={openNetWorkService}
                >
                  {t('turn_on')}
                </Button>
              </Flex>
            </ModalContent>
          </Modal>
        </>
      )}
    </Box>
  );
};

export default AppBaseInfo;

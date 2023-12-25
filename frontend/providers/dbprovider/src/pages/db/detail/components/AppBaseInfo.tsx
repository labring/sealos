import {
  applyYamlList,
  delDBServiceByName,
  getDBSecret,
  getDBServiceByName,
  getDBStatefulSetByName
} from '@/api/db';
import MyIcon from '@/components/Icon';
import { DBStatusEnum, DBTypeEnum, DBTypeSecretMap, defaultDBDetail } from '@/constants/db';
import { useToast } from '@/hooks/useToast';
import useEnvStore from '@/store/env';
import { SOURCE_PRICE } from '@/store/static';
import type { DBDetailType } from '@/types/db';
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
  Tooltip,
  useDisclosure
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { pick } from 'lodash';
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
  const { toast } = useToast();

  const supportConnectDB = useMemo(() => {
    return !!['postgresql', 'mongodb', 'apecloud-mysql', 'redis'].find(
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
      connection += '?directConnection=true';
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
      name: string;
      iconName: string;
      items: {
        label: string;
        value?: string;
        copy?: string;
      }[];
    }[]
  >(
    () => [
      {
        name: 'Basic',
        iconName: 'info',
        items: [
          { label: 'Creation Time', value: db.createTime },
          { label: 'DataBase Type', value: db.dbType },
          { label: 'Version', value: db.dbVersion }
        ]
      },
      {
        name: 'Config Info',
        iconName: 'settings',
        items: [
          { label: 'Limit CPU', value: `${db.cpu / 1000} Core` },
          {
            label: 'Limit Memory',
            value: printMemory(db.memory)
          },
          { label: 'Storage', value: `${db.storage}Gi` }
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
      [DBTypeEnum.weaviate]: ``
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
        title: t('Successfully closed external network access'),
        status: 'success'
      });
    } catch (error) {
      toast({
        title: typeof error === 'string' ? error : t('Service Deletion Failed'),
        status: 'error'
      });
    }
  };

  return (
    <Box px={5} py={7} position={'relative'}>
      {appInfoTable.map((info) => (
        <Box
          _notFirst={{
            mt: 6
          }}
          key={info.name}
        >
          <Flex alignItems={'center'} color={'myGray.500'}>
            <MyIcon w={'16px'} name={info.iconName as any}></MyIcon>
            <Box ml={2}>{t(info.name)}</Box>
          </Flex>
          <Box mt={3} p={4} backgroundColor={'myWhite.400'} borderRadius={'sm'}>
            {info.items.map((item, i) => (
              <Flex
                key={item.label || i}
                flexWrap={'wrap'}
                _notFirst={{
                  mt: 4
                }}
              >
                <Box flex={'0 0 110px'} w={0} color={'blackAlpha.800'}>
                  {t(item.label)}
                </Box>
                <Box
                  color={'blackAlpha.600'}
                  flex={'1 0 0'}
                  textOverflow={'ellipsis'}
                  overflow={'hidden'}
                  whiteSpace={'nowrap'}
                >
                  <Tooltip label={item.value}>
                    <Box
                      as="span"
                      cursor={!!item.copy ? 'pointer' : 'default'}
                      onClick={() => item.value && !!item.copy && copyData(item.copy)}
                    >
                      {item.value}
                    </Box>
                  </Tooltip>
                </Box>
              </Flex>
            ))}
          </Box>
        </Box>
      ))}
      {/* secret */}
      {secret && db.status.value === DBStatusEnum.Running && (
        <>
          <Flex mt={6} alignItems={'center'} color={'myGray.500'}>
            <MyIcon w={'16px'} name={'connection'} fill={'#5A646E'}></MyIcon>
            <Box ml={2}>{t('Connection Info')}</Box>
            <Center
              ml="12px"
              h="24px"
              w="26px"
              bg="#F4F6F8"
              borderRadius={'4px'}
              cursor={'pointer'}
              onClick={() => setShowSecret(!showSecret)}
            >
              <MyIcon
                name={showSecret ? 'read' : 'unread'}
                w={'16px'}
                color={'myGray.600'}
              ></MyIcon>
            </Center>
            <Center
              ml="12px"
              h="24px"
              color={'#24282C'}
              fontSize={'12px'}
              bg="#F4F6F8"
              borderRadius={'4px'}
              px="8px"
              cursor={'pointer'}
              onClick={() => onclickConnectDB()}
            >
              <MyIcon name="terminal" w="16px" h="16px" />
              {t('Direct Connection')}
            </Center>
            <Center fontSize={'12px'} fontWeight={400} ml="auto">
              <Text> {t('External Network')} </Text>
              <Switch
                ml="8px"
                size="sm"
                isChecked={isChecked}
                onChange={(e) => (isChecked ? closeNetWorkService() : onOpen())}
              />
            </Center>
          </Flex>
          <Box
            mt={3}
            p={4}
            backgroundColor={'myWhite.400'}
            borderRadius={'sm'}
            position={'relative'}
          >
            {Object.entries(baseSecret).map(([name, value]) => (
              <Box
                key={name}
                _notFirst={{
                  mt: 4
                }}
              >
                <Box color={'myGray.500'}>{name}</Box>
                <Box color={'myGray.800'}>
                  <Box as="span" cursor={'pointer'} onClick={() => copyData(value)}>
                    {showSecret ? value : '***********'}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
          <Box
            mt={3}
            p={4}
            backgroundColor={'myWhite.400'}
            borderRadius={'sm'}
            position={'relative'}
          >
            <Text fontWeight={500} fontSize={'12px'} color={'#24282C'}>
              {t('Intranet Address')}
            </Text>
            <Divider my="12px" />
            {Object.entries(otherSecret).map(([name, value]) => (
              <Box
                key={name}
                _notFirst={{
                  mt: 4
                }}
              >
                <Box color={'myGray.500'}>{name}</Box>
                <Box color={'myGray.800'}>
                  <Box as="span" cursor={'pointer'} onClick={() => copyData(value)}>
                    {showSecret ? value : '***********'}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
          {isChecked && (
            <Box
              mt={3}
              p={4}
              backgroundColor={'myWhite.400'}
              borderRadius={'sm'}
              position={'relative'}
            >
              <Text fontWeight={500} fontSize={'12px'} color={'#24282C'}>
                {t('External Address')}
              </Text>
              <Divider my="12px" />
              {Object.entries(externalNetWork).map(([name, value]) => (
                <Box
                  key={name}
                  _notFirst={{
                    mt: 4
                  }}
                >
                  <Box color={'myGray.500'}>{name}</Box>
                  <Box color={'myGray.800'}>
                    <Box as="span" cursor={'pointer'} onClick={() => copyData(value)}>
                      {showSecret ? value : '***********'}
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          <Modal isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>{t('Enable external network access')}</ModalHeader>
              <ModalCloseButton />
              <Flex
                alignItems={'center'}
                justifyContent={'center'}
                flexDirection={'column'}
                pt="20px"
                pb="45px"
                px="40px"
              >
                <Text fontSize={'16px'} fontWeight={500} color={'#5A646E'}>
                  {t('Billing Standards')}
                </Text>
                <Center mt="16px" color={'#24282C'} fontSize={'24px'} fontWeight={600}>
                  {SOURCE_PRICE.nodeports}
                  <MyIcon ml="8px" name="currency" w="32px" h="32px"></MyIcon>/ {t('Hour')}
                </Center>
                <Button mt="32px" variant={'primary'} onClick={openNetWorkService}>
                  {t('Turn On')}
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

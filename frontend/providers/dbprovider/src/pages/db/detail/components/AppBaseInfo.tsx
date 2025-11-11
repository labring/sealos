import {
  applyYamlList,
  delDBServiceByName,
  editPassword,
  getDBSecret,
  getDBServiceByName,
  getDBStatefulSetByName
} from '@/api/db';
import FormControl from '@/components/FormControl';
import MyIcon from '@/components/Icon';
import { DBTypeEnum, DBTypeSecretMap, defaultDBDetail } from '@/constants/db';
import { startDriver, detailDriverObj } from '@/hooks/driver';
import useEnvStore from '@/store/env';
import { useGuideStore } from '@/store/guide';
import { SOURCE_PRICE } from '@/store/static';
import type { DBDetailType, DBType } from '@/types/db';
import { I18nCommonKey } from '@/types/i18next';
import { json2NetworkService } from '@/utils/json2Yaml';
import { printMemory, useCopyData } from '@/utils/tools';
import {
  Box,
  Button,
  Center,
  Divider,
  Flex,
  FlexProps,
  FormErrorMessage,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Skeleton,
  SkeletonText,
  Stack,
  Switch,
  Text,
  useDisclosure
} from '@chakra-ui/react';
import { CurrencySymbol, MyTooltip, useMessage } from '@sealos/ui';
import { track } from '@sealos/gtm';
import { useQuery } from '@tanstack/react-query';
import { pick } from 'lodash';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { sealosApp } from 'sealos-desktop-sdk/app';
import { useUserStore } from '@/store/user';
import { WorkspaceQuotaItem } from '@/types/workspace';
import { InsufficientQuotaDialog } from '@/components/InsufficientQuotaDialog';
const CopyBox = ({
  value,
  showSecret = true,
  boxStyle
}: {
  value: string;
  showSecret?: boolean;
  boxStyle?: FlexProps;
}) => {
  const { copyData } = useCopyData();

  const defaultBoxStyle: FlexProps = {
    borderRadius: '4px',
    bg: 'grayModern.25',
    h: '32px',
    p: '8px 32px 8px 12px',
    border: '1px solid',
    borderColor: 'grayModern.100',
    color: 'grayModern.900',
    noOfLines: 1
  };

  return (
    <Flex position="relative" role="group" alignItems="center">
      <Flex {...defaultBoxStyle} {...boxStyle} flex={1}>
        {showSecret ? value : '***********'}
      </Flex>
      <Center
        position="absolute"
        right={2}
        top="50%"
        transform="translateY(-50%)"
        w={'22px'}
        h={'22px'}
        borderRadius={'4px'}
        opacity={0}
        _groupHover={{ opacity: 1 }}
        _hover={{
          bg: 'rgba(17, 24, 36, 0.05)'
        }}
        onClick={() => copyData(value)}
        cursor="pointer"
      >
        <MyIcon name="copy" w="14px" h="14px" color={'grayModern.500'} />
      </Center>
    </Flex>
  );
};

export interface ConnectionInfo {
  host: string;
  port: number | string;
  connection: string;
  username: string;
  password: string;
  dbType: DBType;
  dbName: string;
}

const AppBaseInfo = ({ db = defaultDBDetail }: { db: DBDetailType }) => {
  const { t } = useTranslation();
  const { copyData } = useCopyData();
  const { SystemEnv } = useEnvStore();
  const [showSecret, setShowSecret] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { message: toast } = useMessage();
  const [scenario, setScenario] = useState<'externalNetwork' | 'editPassword'>('externalNetwork');
  const router = useRouter();
  const { detailCompleted, applistCompleted } = useGuideStore();

  const { loadUserQuota, checkExceededQuotas, session } = useUserStore();
  const [quotaLoaded, setQuotaLoaded] = useState(false);
  const [exceededQuotas, setExceededQuotas] = useState<WorkspaceQuotaItem[]>([]);
  const [exceededDialogOpen, setExceededDialogOpen] = useState(false);

  useEffect(() => {
    if (!detailCompleted && applistCompleted) {
      const checkAndStartGuide = () => {
        const containerElement = document.getElementById('db-detail-container');
        if (!containerElement) return false;

        const guideListElement = containerElement.querySelector('#network-detail');
        if (guideListElement) {
          requestAnimationFrame(() => {
            startDriver(detailDriverObj(t));
          });
          return true;
        }

        return false;
      };

      if (!checkAndStartGuide()) {
        const observer = new MutationObserver((mutations, obs) => {
          if (checkAndStartGuide()) {
            obs.disconnect();
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });

        return () => {
          observer.disconnect();
        };
      }
    }
  }, [applistCompleted, detailCompleted, router?.query?.guide, t]);

  const supportConnectDB = useMemo(() => {
    return !![
      'postgresql',
      'mongodb',
      'apecloud-mysql',
      'redis',
      'milvus',
      'kafka',
      'clickhouse'
    ].find((item) => item === db.dbType);
  }, [db.dbType]);

  // load user quota on component mount
  // useEffect(() => {
  //   if (quotaLoaded) return;

  //   loadUserQuota();
  //   setQuotaLoaded(true);
  // }, [quotaLoaded, loadUserQuota]);

  // kb 0.9 StatefulSets have all been changed to instancesets
  // const { data: dbStatefulSet, refetch: refetchDBStatefulSet } = useQuery(
  //   ['getDBStatefulSetByName', db.dbName, db.dbType],
  //   () => getDBStatefulSetByName(db.dbName, db.dbType),
  //   {
  //     retry: 2,
  //     enabled: !!db.dbName && !!db.dbType
  //   }
  // );

  const { data: secret, refetch: refetchSecret } = useQuery(
    ['getDBSecret', db.dbName, db.dbType],
    () =>
      db.dbName
        ? getDBSecret({
            dbName: db.dbName,
            dbType: db.dbType,
            mock: router?.query?.guide === 'true'
          })
        : null,
    {
      enabled: supportConnectDB
    }
  );

  const { data: service, refetch: refetchService } = useQuery(
    ['getDBService', db.dbName, db.dbType],
    () => (db.dbName ? getDBServiceByName(`${db.dbName}-export`) : null),
    {
      // enabled: supportConnectDB,
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
    let connection = `${DBTypeSecretMap[db.dbType]?.connectKey}://${secret?.username}:${
      secret?.password
    }@${host}:${port}`;

    if (db?.dbType === 'mongodb' || db?.dbType === 'postgresql') {
      connection += '/?directConnection=true';
    }

    if (db?.dbType === 'kafka' || db?.dbType === 'milvus') {
      connection = host + ':' + port;
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
          { label: 'limit_cpu', value: `${db.totalCpu / 1000} Core` },
          {
            label: 'limit_memory',
            value: printMemory(db.totalMemory)
          },
          { label: 'storage', value: `${db.totalStorage}Gi` }
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
      [DBTypeEnum.redis]: `redis-cli -u redis://${secret.username}:${secret.password}@${secret.host}:${secret.port}`,
      [DBTypeEnum.kafka]: ``,
      [DBTypeEnum.qdrant]: ``,
      [DBTypeEnum.nebula]: ``,
      [DBTypeEnum.weaviate]: ``,
      [DBTypeEnum.milvus]: ``,
      [DBTypeEnum.clickhouse]: ``,
      [DBTypeEnum.pulsar]: ``
    };

    const defaultCommand = commandMap[db.dbType];

    track({
      event: 'deployment_action',
      module: 'database',
      event_type: 'terminal_open',
      context: 'app'
    } as any);

    sealosApp.runEvents('openDesktopApp', {
      appKey: 'system-terminal',
      query: {
        defaultCommand
      },
      messageData: { type: 'new terminal', command: defaultCommand }
    });
  }, [db.dbType, secret]);

  const refetchAll = () => {
    refetchSecret();
    refetchService();
  };

  const openNetWorkService = useCallback(async () => {
    try {
      if (!db) {
        return toast({
          title: 'Missing Parameters',
          status: 'error'
        });
      }
      const yaml = json2NetworkService({ dbDetail: db, dbCluster: db?.cluster });
      await applyYamlList([yaml], 'create');
      onClose();
      setIsChecked(true);
      refetchAll();
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
  }, [onClose, refetchAll, db, t, toast]);

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

  const handleOpenExternalNetwork = useCallback(async () => {
    if (session?.subscription?.type === 'PAYG') {
      setScenario('externalNetwork');
      onOpen();
      return;
    }

    // Subscription
    await loadUserQuota();
    const exceededQuotaItems = checkExceededQuotas({
      nodeport: 1,
      traffic: 1
    });

    if (exceededQuotaItems.length > 0) {
      setExceededQuotas(exceededQuotaItems);
      setExceededDialogOpen(true);
      return;
    } else {
      setExceededQuotas([]);
      openNetWorkService();
    }
  }, [checkExceededQuotas, onOpen, openNetWorkService, loadUserQuota, session]);

  const handelEditPassword: SubmitHandler<PasswordEdit> = async (data: PasswordEdit) => {
    try {
      onClose();
      await editPassword({
        dbType: db.dbType,
        dbName: db.dbName,
        newPassword: data.password
      });
      refetchAll();
      setIsChecked(false);
      toast({
        title: t('successfully_edit_password'),
        status: 'success'
      });
      reset();
    } catch (error) {
      toast({
        title: typeof error === 'string' ? error : t('edit_password_failed'),
        status: 'error'
      });
    }
  };

  type PasswordEdit = {
    password: string;
    confirmPassword: string;
  };

  const { register, handleSubmit, watch, formState, reset } = useForm<PasswordEdit>();

  function ModalDetail(scenario_: typeof scenario) {
    const password = watch('password');
    const errors = formState.errors;
    switch (scenario_) {
      case 'externalNetwork':
        return {
          mTitle: t('enable_external_network_access'),
          mContent: (
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
                <Text mr={'8px'}>{SOURCE_PRICE.nodeports.toFixed(3)}</Text>
                <CurrencySymbol
                  type={SystemEnv.CurrencySymbol}
                  shellCoin={{
                    mr: '2px',
                    w: '20px',
                    h: '20px'
                  }}
                />
                /{t('Hour')}
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
          )
        };
      case 'editPassword':
        return {
          mTitle: t('edit_password'),
          mContent: (
            <form onSubmit={handleSubmit(handelEditPassword)}>
              <Flex flexDirection={'column'} py="20px" px="40px">
                <FormControl isInvalid={Boolean(errors.password)} mb={4}>
                  <FormLabel>{t('new_password')}</FormLabel>
                  <Input
                    width={'100%'}
                    placeholder={t('confirm_new_password')}
                    {...register('password', {
                      required: t('password_required'),
                      minLength: {
                        value: 8,
                        message: t('password_min_length')
                      },
                      pattern: {
                        value: /^(?!-)[A-Za-z\d~`!@#%^&\*()\-\_=+\|:,<.>\/? ]{8,32}$/,
                        message: t('password_complexity')
                      }
                    })}
                  />
                  <FormErrorMessage>{String(errors.password?.message)}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={Boolean(errors.confirmPassword)}>
                  <FormLabel>{t('confirm_password')}</FormLabel>
                  <Input
                    width={'100%'}
                    placeholder={t('confirm_new_password')}
                    {...register('confirmPassword', {
                      required: t('confirm_password_required'),
                      validate: (value) => value === password || t('passwords_must_match')
                    })}
                  />
                  <FormErrorMessage>{String(errors.confirmPassword?.message)}</FormErrorMessage>
                </FormControl>

                <Flex mt={4} alignItems={'center'}>
                  <Text fontSize={'12px'} color={'grayModern.700'}>
                    <MyIcon
                      name="warningInfo"
                      w={'16px'}
                      h={'16px'}
                      mx={'4px'}
                      fill={'grayModern.700'}
                    />
                    {t('edit_password_tip')}
                  </Text>
                  <Button
                    type="submit"
                    px={5}
                    py={2}
                    width="fit-content"
                    mt={1}
                    ml="auto"
                    variant={'solid'}
                  >
                    {t('confirm')}
                  </Button>
                </Flex>
              </Flex>
            </form>
          )
        };
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { mTitle, mContent } = useMemo(() => ModalDetail(scenario), [scenario, formState]);

  return (
    <Flex position={'relative'} gap={'8px'} id="db-detail-container">
      <Box flex={'0 1 37%'} bg={'white'} borderRadius={'8px'} px={'32px'} py={'28px'}>
        {appInfoTable.map((info, index) => (
          <Box key={info.name} fontSize={'md'}>
            <Flex
              alignItems={'center'}
              gap={'8px'}
              color={'grayModern.900'}
              fontWeight={'bold'}
              fontSize={'16px'}
            >
              <Box>{t(info.name)}</Box>
            </Flex>
            <Box mt={'14px'}>
              {db?.source?.hasSource && index === 0 && (
                <Box>
                  <Flex
                    flexWrap={'wrap'}
                    cursor={'pointer'}
                    onClick={() => {
                      if (!db.source.sourceName) return;
                      if (db.source.sourceType === 'app_store') {
                        sealosApp.runEvents('openDesktopApp', {
                          appKey: 'system-template',
                          pathname: '/instance',
                          query: { instanceName: db.source.sourceName }
                        });
                      }
                      if (db.source.sourceType === 'sealaf') {
                        sealosApp.runEvents('openDesktopApp', {
                          appKey: 'system-sealaf',
                          pathname: '/',
                          query: { instanceName: db.source.sourceName }
                        });
                      }
                    }}
                  >
                    <Text flex={'0 1 30%'} color={'grayModern.600'} minW={'120px'}>
                      {t('application_source')}
                    </Text>
                    <Flex alignItems={'center'}>
                      <Text color={'grayModern.900'}>{t(db.source.sourceType)}</Text>
                      <Divider
                        orientation="vertical"
                        h={'12px'}
                        mx={'8px'}
                        borderColor={'grayModern.300'}
                      />
                      <Text color={'grayModern.600'}>{t('manage_all_resources')}</Text>
                      <MyIcon name="upperRight" width={'14px'} color={'grayModern.600'} />
                    </Flex>
                  </Flex>
                </Box>
              )}
              {info.items.map((item, i) => (
                <Flex
                  key={item.label || i}
                  flexWrap={'wrap'}
                  _notFirst={{
                    mt: '12px'
                  }}
                >
                  <Box flex={'0 1 30%'} w={0} color={'grayModern.600'} minW={'120px'}>
                    {t(item.label)}
                  </Box>
                  <Box
                    color={'grayModern.900'}
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
            {index !== appInfoTable.length - 1 && <Divider my={'16px'} />}
          </Box>
        ))}
      </Box>
      {secret ? (
        <Box
          id="network-detail"
          flex={'0 1 63%'}
          bg={'white'}
          borderRadius={'8px'}
          px={'24px'}
          py={'16px'}
        >
          <Flex
            fontSize={'base'}
            gap={'8px'}
            alignItems={'center'}
            color={'grayModern.600'}
            justifyContent={'space-between'}
          >
            <Box fontSize={'16px'} fontWeight={'bold'} color={'grayModern.900'}>
              {t('connection_info')}
            </Box>
            <HStack spacing={2} ml={'auto'}>
              <Center
                h="28px"
                w="28px"
                bg="white"
                border="1px solid #DFE2EA"
                borderRadius={'md'}
                cursor={'pointer'}
                onClick={() => setShowSecret(!showSecret)}
                _hover={{
                  color: 'brightBlue.600'
                }}
              >
                <MyIcon name={showSecret ? 'read' : 'unread'} w={'16px'}></MyIcon>
              </Center>

              {!['milvus', 'kafka'].includes(db.dbType) && (
                <Center
                  className="driver-detail-terminal-button"
                  gap={'6px'}
                  h="28px"
                  fontSize={'12px'}
                  bg="white"
                  border="1px solid #DFE2EA"
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
              )}
              {[DBTypeEnum.mysql, DBTypeEnum.postgresql, DBTypeEnum.mongodb].includes(
                db.dbType as DBTypeEnum
              ) && (
                <Center
                  className="driver-detail-terminal-button"
                  gap={'6px'}
                  h="28px"
                  fontSize={'12px'}
                  bg="white"
                  border="1px solid #DFE2EA"
                  borderRadius={'md'}
                  px="8px"
                  cursor={'pointer'}
                  fontWeight={'bold'}
                  onClick={() => {
                    reset();
                    setScenario('editPassword');
                    onOpen();
                  }}
                  _hover={{
                    color: 'brightBlue.600'
                  }}
                >
                  <MyIcon name="edit" w={'16px'} h={'16px'} />
                  {t('edit_password')}
                </Center>
              )}
            </HStack>
          </Flex>

          {!['milvus'].includes(db.dbType) && (
            <Flex position={'relative'} fontSize={'base'} mt={'16px'} gap={'12px'}>
              {Object.entries(baseSecret).map(([name, value]) => (
                <Box key={name} flex={1}>
                  <Box color={'grayModern.600'} textTransform={'capitalize'} mb={'4px'}>
                    {name}
                  </Box>
                  <CopyBox value={value} showSecret={showSecret} />
                </Box>
              ))}
            </Flex>
          )}

          <Box mt={'24px'} position={'relative'} fontSize={'base'}>
            <Text fontWeight={500} fontSize={'14px'} color={'grayModern.900'}>
              {t('intranet_address')}
            </Text>
            <Flex gap={'12px'} mt={'8px'}>
              {Object.entries(otherSecret).map(([name, value], index) => (
                <Box key={name} flex={index === 0 ? '0 1 280px' : index === 1 ? '0 0 100px' : '1'}>
                  <Box color={'grayModern.600'} textTransform={'capitalize'} mb={'4px'}>
                    {name}
                  </Box>
                  <CopyBox value={value} showSecret={showSecret} />
                </Box>
              ))}
            </Flex>
          </Box>

          <Box mt={'24px'} position={'relative'} fontSize={'base'}>
            <Flex alignItems={'center'}>
              <Text fontWeight={500} fontSize={'14px'} color={'grayModern.900'}>
                {t('external_address')}
              </Text>
              <Switch
                ml="12px"
                size="md"
                isChecked={isChecked}
                onChange={(e) => {
                  if (isChecked) {
                    closeNetWorkService();
                  } else {
                    handleOpenExternalNetwork();
                  }
                }}
              />
            </Flex>
            {isChecked ? (
              <Flex gap={'12px'} mt={'8px'}>
                {Object.entries(externalNetWork).map(([name, value], index) => (
                  <Box
                    key={name}
                    flex={index === 0 ? '0 1 280px' : index === 1 ? '0 0 100px' : '1'}
                  >
                    <Box color={'grayModern.600'} textTransform={'capitalize'} mb={'4px'}>
                      {name}
                    </Box>
                    <CopyBox value={value} showSecret={showSecret} />
                  </Box>
                ))}
              </Flex>
            ) : (
              <Center
                mt={'8px'}
                w={'100%'}
                h={'66px'}
                color={'grayModern.600'}
                fontSize={'12px'}
                borderRadius={'4px'}
                bg={'grayModern.25'}
                border={'1px solid'}
                borderColor={'grayModern.100'}
              >
                <Box>{t('no_data_available')}</Box>
              </Center>
            )}
          </Box>

          <Modal isOpen={isOpen} onClose={onClose} lockFocusAcrossFrames={false}>
            <ModalOverlay />
            <ModalContent minW={'430px'}>
              <ModalHeader height={'48px'}>{mTitle}</ModalHeader>
              <ModalCloseButton top={'10px'} right={'10px'} />
              {mContent}
            </ModalContent>
          </Modal>
        </Box>
      ) : (
        <Stack flex={'0 1 63%'} bg={'white'} borderRadius={'8px'} px={'24px'} py={'16px'}>
          <Skeleton
            startColor="white"
            endColor="grayModern.200"
            fadeDuration={0.6}
            width={'200px'}
            height={'40px'}
          />
          <Skeleton startColor="white" endColor="grayModern.200" fadeDuration={0.6} p={'20px'} />
          <SkeletonText
            startColor="white"
            endColor="grayModern.200"
            fadeDuration={0.6}
            mt="4"
            noOfLines={4}
            spacing="4"
            skeletonHeight="20px"
          />
        </Stack>
      )}

      <InsufficientQuotaDialog
        items={exceededQuotas}
        open={exceededDialogOpen}
        showControls={false}
        onOpenChange={(open) => {
          // Refresh quota on open change
          loadUserQuota();
          setExceededDialogOpen(open);
        }}
        onConfirm={() => {}}
      />
    </Flex>
  );
};

export default AppBaseInfo;

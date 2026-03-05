import { obj2Query } from '@/api/tools';
import MyIcon from '@/components/Icon';
import PriceBox from '@/components/PriceBox';
import QuotaBox from '@/components/QuotaBox';
import Tip from '@/components/Tip';
import {
  BackupSupportedDBTypeList,
  DBTypeEnum,
  DBTypeList,
  RedisHAConfig,
  SelectTimeList,
  WeekSelectList
} from '@/constants/db';
import { CpuSlideMarkList, MemorySlideMarkList } from '@/constants/editApp';
import useEnvStore from '@/store/env';
import { DBVersionMap, INSTALL_ACCOUNT } from '@/store/static';
import type { QueryType } from '@/types';
import { AutoBackupType } from '@/types/backup';
import type { DBEditType, DBType } from '@/types/db';
import { I18nCommonKey } from '@/types/i18next';
import { distributeResources } from '@/utils/database';
import { getAddonList } from '@/api/platform';
import type { AddonItem } from '@/pages/api/getAddonList';
import { useQuery } from '@tanstack/react-query';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Center,
  Checkbox,
  Flex,
  FormControl,
  Grid,
  Image,
  Input,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Switch,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useTheme
} from '@chakra-ui/react';
import { MySelect, MySlider, MyTooltip, RangeInput, Tabs } from '@sealos/ui';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';

function ResourcesDistributeTable({ data }: { data: Parameters<typeof distributeResources>[0] }) {
  const resources = distributeResources(data);
  const { t, i18n } = useTranslation();

  const compNum = Object.keys(resources).length;
  const dbName = DBTypeList.find((item) => item.id === data.dbType)?.label ?? '';

  const descriptionMap: Map<DBType, string> = new Map([
    [DBTypeEnum.postgresql, t('occupy', { comp: 'PostgreSQL', num: '100%' })],
    [DBTypeEnum.mongodb, t('occupy', { comp: 'MongoDB', num: '100%' })],
    [DBTypeEnum.mysql, t('occupy', { comp: 'MySQL', num: '100%' })],
    [DBTypeEnum.redis, `${t('occupy', { comp: 'Redis', num: '100%' })}, ${t('ha_desc')}`],
    [DBTypeEnum.kafka, `Controller, broker, exporter, server${t('each', { perc: '25%' })}`],
    [
      DBTypeEnum.milvus,
      `${t('occupy', { comp: 'Etcd', num: '30%' })}, ${t('occupy', {
        comp: 'milvus',
        num: '40%'
      })}, ${t('occupy', { comp: 'minio', num: '30%' })}`
    ]
  ]);

  return (
    <Accordion
      variant="unstyled"
      defaultIndex={[-1]}
      allowMultiple
      border="1px solid #BCE7FF"
      borderRadius="6px"
      overflow="hidden"
      marginTop={5}
      width={'100%'}
    >
      <AccordionItem borderStyle={'none'}>
        <h2>
          <AccordionButton
            bgColor="#F9FDFE"
            px={5}
            py={3}
            _hover={{ bg: '#F9FDFE' }}
            _expanded={{ bg: '#F9FDFE', borderBottom: '1px solid #BCE7FF' }}
            color="#485264"
          >
            <Box
              as="span"
              flex="1"
              textAlign="left"
              display="flex"
              flexDirection="row"
              color="#485264"
              alignItems="center"
            >
              <MyIcon name="warningInfo" w={'16px'} h={'16px'} mr={2} />
              <Text fontWeight="500">
                {dbName}&emsp;{t('has_comps', { number: compNum })}:&emsp;
              </Text>
              <Text>{descriptionMap.get(data.dbType)}</Text>
            </Box>
            <AccordionIcon />
          </AccordionButton>
        </h2>
        <AccordionPanel pb={4}>
          <TableContainer>
            <Table variant="unstyled" width={'full'}>
              <Thead>
                <Tr>
                  {[t('comp_name'), t('cpu'), t('memory'), t('storage_volumes'), t('Replicas')].map(
                    (header, i) => {
                      return (
                        <Th
                          fontSize={'12px'}
                          py="13px"
                          px={'24px'}
                          key={i}
                          bg={'grayModern.100'}
                          color={'grayModern.600'}
                          border={'none'}
                          _first={{
                            borderLeftRadius: '6px'
                          }}
                          _last={{
                            borderRightRadius: '6px'
                          }}
                        >
                          {header}
                        </Th>
                      );
                    }
                  )}
                </Tr>
              </Thead>
              <Tbody>
                {Object.entries(resources)
                  .sort()
                  .map(([keyName, value]) => {
                    return (
                      <Tr key={keyName}>
                        <Td w="190px">{keyName}</Td>
                        <Td>{value.cpuMemory.limits.cpu}</Td>
                        <Td>{value.cpuMemory.limits.memory}</Td>
                        <Td>{value.storage} G</Td>
                        <Td>{value.other?.replicas ?? data.replicas}</Td>
                      </Tr>
                    );
                  })}
              </Tbody>
            </Table>
          </TableContainer>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
}

const Form = ({
  formHook,
  pxVal,
  allocatedStorage,
  cpuCores
}: {
  formHook: UseFormReturn<DBEditType, any>;
  pxVal: number;
  allocatedStorage: number;
  cpuCores: number;
}) => {
  if (!formHook) return null;
  const { t } = useTranslation();
  const { SystemEnv } = useEnvStore();
  const router = useRouter();
  const { name } = router.query as QueryType;
  const theme = useTheme();
  const isEdit = useMemo(() => !!name, [name]);
  const {
    register,
    setValue,
    getValues,
    watch,
    formState: { errors }
  } = formHook;

  const dynamicCpuMarks = useMemo(() => {
    const base = CpuSlideMarkList.slice(0, 9);
    if (cpuCores > 8) {
      base.push({
        label: cpuCores,
        value: Math.round(cpuCores * 1000)
      });
    }
    return base;
  }, [cpuCores]);

  const timeZone = watch('parameterConfig')?.timeZone;
  const lowerCaseTableNames = watch('parameterConfig')?.lowerCaseTableNames;
  const maxConnections = watch('parameterConfig')?.maxConnections;
  const isMaxConnectionsCustomized = watch('parameterConfig')?.isMaxConnectionsCustomized;
  const maxmemory = watch('parameterConfig')?.maxmemory;
  const memory = watch('memory');

  const Label = ({
    children,
    w = 'auto',
    ...props
  }: {
    children: string;
    w?: number | 'auto';
    [key: string]: any;
  }) => (
    <Box
      flex={`0 0 ${w === 'auto' ? 'auto' : `${w}px`}`}
      color={'grayModern.900'}
      fontWeight={'bold'}
      userSelect={'none'}
      {...props}
    >
      {children}
    </Box>
  );

  const boxStyles = {
    border: theme.borders.base,
    borderRadius: 'lg',
    mb: 4,
    bg: 'white'
  };

  const headerStyles = {
    py: 4,
    pl: '42px',
    borderTopRadius: 'lg',
    fontSize: 'xl',
    color: 'grayModern.900',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'grayModern.50'
  };

  const supportBackup = useMemo(
    () => BackupSupportedDBTypeList.includes(getValues('dbType')) && SystemEnv.BACKUP_ENABLED,
    //eslint-disable-next-line react-hooks/exhaustive-deps
    [getValues('dbType'), SystemEnv.BACKUP_ENABLED]
  );

  const [dbType, dbVersion] = watch(['dbType', 'dbVersion']);
  const supportParameterConfig = useMemo(() => {
    if (dbType === 'apecloud-mysql' && dbVersion === 'mysql-5.7.42') {
      return false;
    }

    return ['postgresql', 'apecloud-mysql', 'mongodb', 'redis'].includes(dbType);
  }, [dbType, dbVersion]);

  const navList: { id: string; label: I18nCommonKey; icon: string; isConfig?: boolean }[] =
    useMemo(() => {
      const baseNav: { id: string; label: I18nCommonKey; icon: string; isConfig?: boolean }[] = [
        {
          id: 'baseInfo',
          label: 'basic',
          icon: 'formInfo'
        }
      ];

      if (supportParameterConfig) {
        baseNav.push({
          id: 'parameterConfig',
          label: 'ParameterConfig',
          icon: 'slider',
          isConfig: true
        });
      }

      if (supportBackup) {
        baseNav.push({
          id: 'backupSettings',
          label: 'backup_settings',
          icon: 'backupSettings'
        });
      }

      return baseNav;
    }, [supportBackup, supportParameterConfig]);

  const [activeNav, setActiveNav] = useState(navList[0].id);
  const [editingParam, setEditingParam] = useState<string | null>(null);
  // Fetch addon list using useQuery
  const { data: addonList = [], isLoading: addonLoading } = useQuery(
    ['addonList'],
    () => getAddonList(),
    {
      staleTime: 3 * 60 * 1000,
      cacheTime: 5 * 60 * 1000,
      retry: 3,
      onError: (error) => {
        console.error('Failed to fetch addon list:', error);
      }
    }
  );

  const { minStorageChange, minCPU, minMemory, minStorage } = useMemo(() => {
    const dbType = getValues('dbType');
    let minStorageChange = 1,
      minCPU = 0,
      minMemory = 0;
    let specialUse = 0;
    switch (dbType) {
      case DBTypeEnum.redis:
        minStorageChange = 1;
        specialUse = 2;
        break;
      case DBTypeEnum.kafka:
        [minStorageChange, minCPU, minMemory] = [4, 2, 2];
        break;
      case DBTypeEnum.milvus:
        [minStorageChange, minCPU, minMemory] = [3, 2, 2];
        break;
      default:
        break;
    }
    let minStorage = Math.max(allocatedStorage, minStorageChange, specialUse);
    return {
      minStorageChange,
      minCPU: minCPU * 1000,
      minMemory: minMemory * 1024,
      minStorage
    };
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getValues('dbType'), allocatedStorage]);

  useEffect(() => {
    if (getValues('cpu') < minCPU) {
      setValue('cpu', minCPU);
    }
    if (getValues('memory') < minMemory) {
      setValue('memory', minMemory);
    }
    setValue('storage', Math.max(3, minStorage, allocatedStorage));
  }, [getValues, allocatedStorage, isEdit, minCPU, minMemory, setValue, minStorage]);

  useEffect(() => {
    const currentDbType = getValues('dbType');
    const currentMemory = getValues('memory');

    if (editingParam === 'maxmemory') {
      return;
    }

    if (currentDbType === DBTypeEnum.redis && currentMemory) {
      const calculatedMaxmemory = calculateMaxmemory(currentMemory);
      const currentParameterConfig = getValues('parameterConfig') || {};

      setValue('parameterConfig', {
        ...currentParameterConfig,
        maxmemory: calculatedMaxmemory
      });
    }
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memory, dbType, editingParam]);

  const backupSettingsRef = useRef<HTMLDivElement | null>(null);
  const parameterConfigRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const backupRef = backupSettingsRef.current;
    const paramRef = parameterConfigRef.current;

    const observerCallback = (
      entries: IntersectionObserverEntry[],
      observer: IntersectionObserver
    ) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.75) {
          const targetId = entry.target.id;
          if (targetId === 'backupSettings') {
            setActiveNav('backupSettings');
          } else if (targetId === 'parameterConfig') {
            setActiveNav('parameterConfig');
          }
        } else {
          // If no section is prominently visible, default to baseInfo
          const hasVisibleSection = entries.some(
            (e) => e.isIntersecting && e.intersectionRatio >= 0.75
          );
          if (!hasVisibleSection) {
            setActiveNav('baseInfo');
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      threshold: 0.75
    });

    if (backupRef) {
      observer.observe(backupRef);
    }
    if (paramRef) {
      observer.observe(paramRef);
    }

    return () => {
      if (backupRef) {
        observer.unobserve(backupRef);
      }
      if (paramRef) {
        observer.unobserve(paramRef);
      }
    };
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backupSettingsRef, parameterConfigRef, supportBackup, supportParameterConfig]);

  const getScore = (dbType: DBType) => {
    const cpuCores = (getValues('cpu') || 0) / 1000; // cpu in cores
    const memoryGB = (getValues('memory') || 0) / 1024; // memory in GB

    let score = 0;
    if (
      dbType === DBTypeEnum.postgresql ||
      dbType === DBTypeEnum.mongodb ||
      dbType === DBTypeEnum.mysql
    ) {
      score = Math.min(cpuCores * 400 + memoryGB * 300, 100000);
    } else if (dbType === DBTypeEnum.redis) {
      score = Math.min(cpuCores * 500 + memoryGB * 400, 100000);
    }
    return Math.floor(score);
  };

  const getParaName = (dbType: DBType) => {
    if (dbType === DBTypeEnum.postgresql || dbType === DBTypeEnum.mysql) {
      return 'max_connections';
    } else if (dbType === DBTypeEnum.mongodb) {
      return 'maxIncomingConnections';
    } else if (dbType === DBTypeEnum.redis) {
      return 'maxclients';
    }
    return '';
  };

  const calculateMaxmemory = (memoryMi: number): string => {
    const memoryBytes = memoryMi * 1024 * 1024;
    const percentage = memoryMi > 512 ? 0.7 : 0.5;
    const maxmemoryBytes = Math.floor(memoryBytes * percentage);
    return maxmemoryBytes.toString();
  };

  const availableDBTypes = useMemo(() => {
    if (addonLoading) {
      return DBTypeList;
    }

    const addonStatusMap = new Map<string, string>();
    addonList.forEach((addon) => {
      addonStatusMap.set(addon.name, addon.status);
    });

    const filtered = DBTypeList.filter((dbType) => {
      // Exclude weaviate from create form
      if (dbType.id === DBTypeEnum.weaviate) {
        return false;
      }

      const addonName = dbType.id;
      const addonStatus = addonStatusMap.get(addonName);
      const shouldInclude = addonStatus !== 'Disabled';
      return shouldInclude;
    });

    return filtered;
  }, [addonList, addonLoading]);

  return (
    <>
      <Grid
        height={'100%'}
        templateColumns={'220px 1fr'}
        gridGap={5}
        alignItems={'start'}
        pl={`${pxVal}px`}
      >
        <Box>
          <Tabs
            list={[
              { id: 'form', label: t('config_form') },
              { id: 'yaml', label: t('yaml_file') }
            ]}
            activeId={'form'}
            onChange={() =>
              router.replace(
                `/db/edit?${obj2Query({
                  name,
                  type: 'yaml'
                })}`
              )
            }
          />
          <Box
            mt={3}
            borderRadius={'md'}
            overflow={'hidden'}
            backgroundColor={'white'}
            border={theme.borders.base}
            p={'4px'}
          >
            {navList.map((item) => (
              <Box key={item.id} onClick={() => router.replace(`#${item.id}`)}>
                <Flex
                  borderRadius={'base'}
                  cursor={'pointer'}
                  gap={'8px'}
                  alignItems={'center'}
                  h={'40px'}
                  _hover={{
                    backgroundColor: 'grayModern.100'
                  }}
                  color="grayModern.900"
                  backgroundColor={activeNav === item.id ? 'grayModern.100' : 'transparent'}
                  fontWeight={500}
                >
                  <Box
                    w={'2px'}
                    h={'24px'}
                    justifySelf={'start'}
                    bg={'grayModern.900'}
                    borderRadius={'12px'}
                    opacity={activeNav === item.id ? 1 : 0}
                  />
                  <MyIcon
                    name={item.icon as any}
                    w={'20px'}
                    h={'20px'}
                    color={activeNav === item.id ? 'grayModern.900' : 'grayModern.500'}
                  />
                  <Box>{t(item.label)}</Box>
                </Flex>
              </Box>
            ))}
          </Box>
          <Box mt={3} overflow={'hidden'}>
            <QuotaBox />
          </Box>
          {INSTALL_ACCOUNT && (
            <Box mt={3} overflow={'hidden'}>
              <PriceBox
                components={[
                  {
                    cpu: getValues('cpu'),
                    memory: getValues('memory'),
                    storage: getValues('storage'),
                    replicas: [getValues('replicas') || 1, getValues('replicas') || 1]
                  },
                  ...(getValues('dbType') === DBTypeEnum.redis
                    ? (() => {
                        const config = RedisHAConfig(getValues('replicas') > 1);
                        return [
                          {
                            ...config,
                            replicas: [config.replicas, config.replicas]
                          }
                        ];
                      })()
                    : [])
                ]}
              />
            </Box>
          )}
        </Box>
        <Box
          id={'form-container'}
          pr={`${pxVal}px`}
          height={'100%'}
          position={'relative'}
          overflowY={'scroll'}
          pb={'100px'}
        >
          {/* base info */}
          <Box id={'baseInfo'} {...boxStyles}>
            <Box {...headerStyles}>
              <MyIcon name={'formInfo'} mr={5} w={'24px'} color={'grayModern.600'} />
              {t('basic')}
            </Box>
            <Box px={'42px'} py={'24px'}>
              <Flex alignItems={'center'} mb={7}>
                <Label w={100} alignSelf={'flex-start'}>
                  {t('Type')}
                </Label>
                <Flex flexWrap={'wrap'} gap={'12px'}>
                  {addonLoading ? (
                    <Text color="grayModern.500" fontSize="sm">
                      Loading database types...
                    </Text>
                  ) : (
                    availableDBTypes &&
                    availableDBTypes?.map((item) => {
                      return (
                        <Center
                          key={item.id}
                          flexDirection={'column'}
                          w={'110px'}
                          height={'80px'}
                          border={'1px solid'}
                          borderRadius={'6px'}
                          cursor={isEdit ? 'not-allowed' : 'pointer'}
                          opacity={isEdit && getValues('dbType') !== item.id ? '0.4' : '1'}
                          fontWeight={'bold'}
                          color={'grayModern.900'}
                          {...(getValues('dbType') === item.id
                            ? {
                                bg: '#F9FDFE',
                                borderColor: 'brightBlue.500',
                                boxShadow: '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)'
                              }
                            : {
                                bg: '#F7F8FA',
                                borderColor: 'grayModern.200',
                                _hover: {
                                  borderColor: '#85ccff'
                                }
                              })}
                          onClick={() => {
                            if (isEdit) return;
                            setValue('dbType', item.id);
                            const versions = DBVersionMap[item.id] || [];
                            if (versions.length > 0) {
                              setValue('dbVersion', versions[0].id);
                            }
                          }}
                        >
                          <Image
                            width={'32px'}
                            height={'32px'}
                            alt={item.id}
                            src={`/images/${item.id}.svg`}
                          />
                          <Text
                            _firstLetter={{
                              textTransform: 'capitalize'
                            }}
                            mt={'4px'}
                            textAlign={'center'}
                          >
                            {item.label}
                          </Text>
                        </Center>
                      );
                    })
                  )}
                </Flex>
              </Flex>
              <Flex alignItems={'center'} mb={7}>
                <Label w={100}>{t('version')}</Label>
                <MySelect
                  isDisabled={isEdit}
                  width={'200px'}
                  placeholder={`${t('DataBase')} ${t('version')}`}
                  value={getValues('dbVersion')}
                  list={(DBVersionMap[getValues('dbType')] || []).map((i) => ({
                    label: i.label,
                    value: i.id
                  }))}
                  onchange={(val: any) => setValue('dbVersion', val)}
                />
              </Flex>
              <FormControl mb={7} isInvalid={!!errors.dbName} w={'500px'}>
                <Flex alignItems={'center'}>
                  <Label w={100}>{t('name')}</Label>
                  <Input
                    disabled={isEdit}
                    title={isEdit ? t('cannot_change_name') : ''}
                    autoFocus={true}
                    placeholder={t('database_name_regex')}
                    {...register('dbName', {
                      required: t('database_name_empty'),
                      pattern: {
                        value: /^[a-z]([-a-z0-9]*[a-z0-9])?$/g,
                        message: t('database_name_regex_error')
                      },
                      maxLength: {
                        value: 30,
                        message: t('database_name_max_length', { length: 30 })
                      }
                    })}
                  />
                </Flex>
              </FormControl>
              <Flex mb={10} pr={3} alignItems={'flex-start'}>
                <Label w={100}>CPU</Label>
                <MySlider
                  markList={dynamicCpuMarks}
                  activeVal={getValues('cpu')}
                  setVal={(e) => {
                    if (dynamicCpuMarks[e].value < minCPU) {
                      setValue('cpu', minCPU);
                    } else {
                      setValue('cpu', dynamicCpuMarks[e].value);
                    }
                  }}
                  max={dynamicCpuMarks.length - 1}
                  min={minCPU / 1000}
                  step={1}
                />
                <Box ml={5} transform={'translateY(10px)'} color={'grayModern.600'}>
                  (Cores)
                </Box>
              </Flex>
              <Flex mb={'50px'} pr={3} alignItems={'center'}>
                <Label w={100}>{t('memory')}</Label>
                <MySlider
                  markList={MemorySlideMarkList}
                  activeVal={getValues('memory')}
                  setVal={(e) => {
                    if (MemorySlideMarkList[e].value < minMemory) {
                      setValue('memory', minMemory);
                    } else {
                      setValue('memory', MemorySlideMarkList[e].value);
                    }
                  }}
                  max={MemorySlideMarkList.length - 1}
                  min={minMemory / 1024}
                  step={1}
                />
              </Flex>
              <Flex mb={7} alignItems={'center'}>
                <Label w={100}>{t('Replicas')}</Label>
                <RangeInput
                  w={180}
                  value={getValues('replicas')}
                  min={1}
                  max={20}
                  step={
                    getValues('dbType') === DBTypeEnum.mongodb ||
                    getValues('dbType') === DBTypeEnum.mysql
                      ? 2
                      : 1
                  }
                  setVal={(val) => {
                    register('replicas', {
                      required: t('replicas_cannot_empty'),
                      min: {
                        value: 1,
                        message: `${t('min_replicas')}1`
                      },
                      max: {
                        value: 20,
                        message: `${t('max_replicas')}20`
                      }
                    });
                    const dbType = getValues('dbType');
                    const oddVal = val % 2 === 0 ? val + 1 : val;
                    const replicasValue =
                      dbType === DBTypeEnum.mongodb || dbType === DBTypeEnum.mysql ? oddVal : val;
                    setValue('replicas', isNaN(replicasValue) ? 1 : replicasValue);
                  }}
                />

                {getValues('replicas') === 1 && (
                  <Tip
                    ml={4}
                    icon={<MyIcon name="warningInfo" width={'14px'} fill="#0884DD"></MyIcon>}
                    text={t('single_node_tip')}
                    size="sm"
                    borderRadius={'md'}
                  />
                )}
                {getValues('dbType') === DBTypeEnum.redis && getValues('replicas') > 1 && (
                  <Tip
                    ml={4}
                    icon={<InfoOutlineIcon />}
                    text={t('multi_replica_redis_tip')}
                    size="sm"
                    borderRadius={'md'}
                  />
                )}

                {(getValues('dbType') === DBTypeEnum.mongodb ||
                  getValues('dbType') === DBTypeEnum.mysql) &&
                  getValues('replicas') > 1 && (
                    <Tip
                      ml={4}
                      icon={<InfoOutlineIcon />}
                      text={t('db_instances_tip', {
                        db: getValues('dbType')
                      })}
                      size="sm"
                      borderRadius={'md'}
                    />
                  )}
              </Flex>

              <FormControl isInvalid={!!errors.storage} paddingTop={1}>
                <Flex alignItems={'center'}>
                  <Label w={100}>{t('storage')}</Label>
                  <MyTooltip
                    label={`${t('storage_range')}${minStorage}~${SystemEnv.STORAGE_MAX_SIZE} Gi`}
                  >
                    <NumberInput
                      w={'180px'}
                      max={SystemEnv.STORAGE_MAX_SIZE}
                      min={minStorage}
                      step={minStorageChange}
                      position={'relative'}
                      value={
                        Math.round(Math.max(getValues('storage') / minStorageChange, 1)) *
                        minStorageChange
                      }
                      onChange={(e) => {
                        e !== '' ? setValue('storage', +e) : setValue('storage', minStorage);
                      }}
                    >
                      <NumberInputField
                        {...register('storage', {
                          required: t('storage_cannot_empty'),
                          min: {
                            value: minStorage,
                            message: `${t('storage_min')}${minStorage} Gi`
                          },
                          max: {
                            value: SystemEnv.STORAGE_MAX_SIZE,
                            message: `${t('storage_max')}${SystemEnv.STORAGE_MAX_SIZE} Gi`
                          },
                          valueAsNumber: true
                        })}
                        min={minStorage}
                        max={SystemEnv.STORAGE_MAX_SIZE}
                        borderRadius={'md'}
                        borderColor={'#E8EBF0'}
                        bg={'#F7F8FA'}
                        _focusVisible={{
                          borderColor: 'brightBlue.500',
                          boxShadow: '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)',
                          bg: '#FFF',
                          color: '#111824'
                        }}
                        _hover={{
                          borderColor: 'brightBlue.300'
                        }}
                      />

                      <NumberInputStepper>
                        <NumberIncrementStepper>
                          <MyIcon name="arrowUp" width={'12px'} />
                        </NumberIncrementStepper>
                        <NumberDecrementStepper>
                          <MyIcon name="arrowDown" width={'12px'} />
                        </NumberDecrementStepper>
                      </NumberInputStepper>
                      <Box
                        zIndex={1}
                        position={'absolute'}
                        right={10}
                        top={'50%'}
                        transform={'translateY(-50%)'}
                        color={'grayModern.600'}
                      >
                        Gi
                      </Box>
                    </NumberInput>
                  </MyTooltip>
                  {[DBTypeEnum.redis, DBTypeEnum.kafka, DBTypeEnum.milvus].includes(
                    getValues('dbType') as DBTypeEnum
                  ) && (
                    <Tip
                      ml={4}
                      icon={<InfoOutlineIcon />}
                      text={t('multi_components_tip')}
                      size="sm"
                      borderRadius={'md'}
                      height={'fit-content'}
                      maxWidth={310}
                      maxHeight={'100%'}
                    />
                  )}
                </Flex>
              </FormControl>
              <ResourcesDistributeTable
                data={{
                  dbType: getValues('dbType'),
                  cpu: getValues('cpu'),
                  memory: getValues('memory'),
                  storage: getValues('storage'),
                  replicas: getValues('replicas'),
                  forDisplay: true
                }}
              />
            </Box>
          </Box>

          {/* parameter config */}
          {supportParameterConfig && (
            <Accordion
              id={'parameterConfig'}
              allowToggle
              defaultIndex={[0]}
              ref={parameterConfigRef}
            >
              <AccordionItem {...boxStyles}>
                <AccordionButton
                  {...headerStyles}
                  justifyContent={'space-between'}
                  _hover={{ bg: '' }}
                >
                  <Flex alignItems={'center'}>
                    <MyIcon name={'slider'} mr={5} w={'24px'} color={'grayModern.600'} />
                    {t('ParameterConfig')}
                  </Flex>
                  <AccordionIcon w={'20px'} h={'20px'} color={'grayModern.600'} />
                </AccordionButton>

                <AccordionPanel px={'42px'} py={'24px'}>
                  <TableContainer>
                    <Table variant="unstyled" width={'full'}>
                      <Thead>
                        <Tr>
                          <Th
                            fontSize={'14px'}
                            color={'grayModern.900'}
                            border={'none'}
                            _first={{
                              borderLeftRadius: '6px'
                            }}
                            _last={{
                              borderRightRadius: '6px'
                            }}
                          >
                            {t('dbconfig.parameter_name')}
                          </Th>
                          <Th
                            fontSize={'14px'}
                            color={'grayModern.900'}
                            border={'none'}
                            _first={{
                              borderLeftRadius: '6px'
                            }}
                            _last={{
                              borderRightRadius: '6px'
                            }}
                          >
                            {t('dbconfig.parameter_value')}
                          </Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        <Tr>
                          <Td w="350px">
                            <Text fontSize={'14px'} color={'grayModern.900'}>
                              {getParaName(getValues('dbType'))}
                            </Text>
                          </Td>
                          <Td>
                            <Flex alignItems={'center'} gap={'8px'}>
                              {editingParam === 'maxConnections' ? (
                                <Input
                                  value={
                                    isMaxConnectionsCustomized
                                      ? maxConnections
                                      : getScore(getValues('dbType'))
                                  }
                                  size="sm"
                                  type="number"
                                  borderRadius={'md'}
                                  borderColor={'#E8EBF0'}
                                  bg={'#F7F8FA'}
                                  width={'120px'}
                                  _focusVisible={{
                                    borderColor: 'brightBlue.500',
                                    boxShadow: '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)',
                                    bg: '#FFF',
                                    color: '#111824'
                                  }}
                                  _hover={{
                                    borderColor: 'brightBlue.300'
                                  }}
                                  onBlur={() => setEditingParam(null)}
                                  onChange={(e) => {
                                    setValue('parameterConfig', {
                                      ...getValues('parameterConfig'),
                                      maxConnections: e.target.value,
                                      isMaxConnectionsCustomized: true
                                    });
                                  }}
                                />
                              ) : (
                                <Text fontSize={'12px'} color={'grayModern.600'}>
                                  {isMaxConnectionsCustomized
                                    ? maxConnections
                                    : getScore(getValues('dbType'))}
                                </Text>
                              )}
                              <MyIcon
                                name="edit"
                                w={'16px'}
                                h={'16px'}
                                color={'grayModern.500'}
                                cursor={'pointer'}
                                _hover={{
                                  color: 'brightBlue.500'
                                }}
                                onClick={() =>
                                  setEditingParam(
                                    editingParam === 'maxConnections' ? null : 'maxConnections'
                                  )
                                }
                              />
                              {isMaxConnectionsCustomized && (
                                <MyIcon
                                  name="delete"
                                  w={'14px'}
                                  h={'14px'}
                                  color={'grayModern.400'}
                                  cursor={'pointer'}
                                  _hover={{
                                    color: 'brightBlue.500'
                                  }}
                                  onClick={() => {
                                    setValue('parameterConfig', {
                                      ...getValues('parameterConfig'),
                                      maxConnections: undefined,
                                      isMaxConnectionsCustomized: false
                                    });
                                  }}
                                />
                              )}
                            </Flex>
                          </Td>
                        </Tr>

                        {/* maxmemory parameter for Redis only */}
                        {getValues('dbType') === DBTypeEnum.redis && (
                          <Tr>
                            <Td w="350px">
                              <Text fontSize={'14px'} color={'grayModern.900'}>
                                maxmemory
                              </Text>
                            </Td>
                            <Td>
                              <Flex alignItems={'center'} gap={'8px'}>
                                <Text fontSize={'12px'} color={'grayModern.600'}>
                                  {maxmemory || calculateMaxmemory(getValues('memory'))}
                                </Text>
                              </Flex>
                            </Td>
                          </Tr>
                        )}

                        {/* Timezone parameter for MySQL and PostgreSQL */}
                        {(getValues('dbType') === DBTypeEnum.mysql ||
                          getValues('dbType') === DBTypeEnum.postgresql) && (
                          <Tr>
                            <Td w="350px">
                              <Text fontSize={'14px'} color={'grayModern.900'}>
                                {getValues('dbType') === DBTypeEnum.mysql
                                  ? 'default-time-zone'
                                  : 'time_zone'}
                              </Text>
                            </Td>
                            <Td>
                              <Flex alignItems={'center'} gap={'8px'}>
                                {editingParam === 'timeZone' ? (
                                  <MySelect
                                    width={'120px'}
                                    value={timeZone}
                                    list={[
                                      { value: 'UTC', label: 'UTC' },
                                      { value: 'Asia/Shanghai', label: 'Asia/Shanghai' }
                                    ]}
                                    onchange={(val: any) => {
                                      setValue('parameterConfig', {
                                        ...getValues('parameterConfig'),
                                        timeZone: val
                                      });
                                      setEditingParam(null);
                                    }}
                                  />
                                ) : (
                                  <Text fontSize={'12px'} color={'grayModern.600'}>
                                    {timeZone}
                                  </Text>
                                )}
                                <MyIcon
                                  name="edit"
                                  w={'16px'}
                                  h={'16px'}
                                  color={'grayModern.500'}
                                  cursor={'pointer'}
                                  _hover={{
                                    color: 'brightBlue.500'
                                  }}
                                  onClick={() =>
                                    setEditingParam(editingParam === 'timeZone' ? null : 'timeZone')
                                  }
                                />
                              </Flex>
                            </Td>
                          </Tr>
                        )}

                        {/* lower_case_table_names parameter for MySQL only */}
                        {getValues('dbType') === DBTypeEnum.mysql && !isEdit && (
                          <Tr>
                            <Td w="350px">
                              <Text fontSize={'14px'} color={'grayModern.900'}>
                                lower_case_table_names
                              </Text>
                            </Td>
                            <Td>
                              <Flex alignItems={'center'} gap={'8px'}>
                                {editingParam === 'lowerCaseTableNames' ? (
                                  <MySelect
                                    width={'140px'}
                                    value={lowerCaseTableNames}
                                    list={[
                                      { value: '0', label: '0 (' + t('case_sensitive') + ')' },
                                      { value: '1', label: '1 (' + t('case_insensitive') + ')' }
                                    ]}
                                    onchange={(val: string) => {
                                      setValue('parameterConfig', {
                                        ...getValues('parameterConfig'),
                                        lowerCaseTableNames: val
                                      });
                                      setEditingParam(null);
                                    }}
                                  />
                                ) : (
                                  <Text fontSize={'12px'} color={'grayModern.600'}>
                                    {lowerCaseTableNames} (
                                    {lowerCaseTableNames === '0'
                                      ? t('case_sensitive')
                                      : t('case_insensitive')}
                                    )
                                  </Text>
                                )}
                                <MyIcon
                                  name="edit"
                                  w={'16px'}
                                  h={'16px'}
                                  color={'grayModern.500'}
                                  cursor={'pointer'}
                                  _hover={{
                                    color: 'brightBlue.500'
                                  }}
                                  onClick={() =>
                                    setEditingParam(
                                      editingParam === 'lowerCaseTableNames'
                                        ? null
                                        : 'lowerCaseTableNames'
                                    )
                                  }
                                />
                              </Flex>
                            </Td>
                          </Tr>
                        )}
                      </Tbody>
                    </Table>
                  </TableContainer>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          )}

          {supportBackup && (
            <Box id={'backupSettings'} ref={backupSettingsRef} {...boxStyles}>
              <Box {...headerStyles}>
                <MyIcon name={'backupSettings'} mr={5} w={'24px'} color={'grayModern.600'} />
                {t('backup_settings')}
                <Switch
                  ml={'20px'}
                  isChecked={getValues('autoBackup.start')}
                  onChange={(e) => {
                    setValue('autoBackup.start', e.target.checked);
                  }}
                />
              </Box>
              <Box display={getValues('autoBackup.start') ? 'block' : 'none'}>
                <Box px={'42px'} py={'24px'} flex={1} userSelect={'none'}>
                  <Flex alignItems={'center'}>
                    <Box flex={'0 0 110px'}>{t('CronExpression')}</Box>
                    <Tabs
                      w={'220px'}
                      list={[
                        { id: 'hour', label: t('Hour') },
                        { id: 'day', label: t('Day') },
                        { id: 'week', label: t('Week') }
                      ]}
                      activeId={getValues('autoBackup.type')}
                      size={'sm'}
                      borderColor={'myGray.200'}
                      onChange={(e) => {
                        setValue('autoBackup.type', e as AutoBackupType);
                      }}
                    />
                  </Flex>
                  {getValues('autoBackup.type') === 'week' && (
                    <Flex mt={4}>
                      <Box flex={'0 0 110px'} />
                      {WeekSelectList.map((item) => (
                        <Box key={item.id} _notLast={{ mr: 4 }}>
                          <Checkbox
                            defaultChecked={getValues('autoBackup.week').includes(item.id)}
                            onChange={(e) => {
                              const val = e.target.checked;
                              const checkedList = [...getValues('autoBackup.week')];
                              const index = checkedList.findIndex((week) => week === item.id);
                              if (val && index === -1) {
                                setValue('autoBackup.week', checkedList.concat(item.id));
                              } else if (!val && index > -1) {
                                checkedList.splice(index, 1);
                                setValue('autoBackup.week', checkedList);
                              }
                            }}
                          >
                            {t(item.label)}
                          </Checkbox>
                        </Box>
                      ))}
                    </Flex>
                  )}
                  <Flex alignItems={'center'} mt={7}>
                    <Box flex={'0 0 110px'}>{t('start_time')}</Box>
                    {getValues('autoBackup.type') !== 'hour' && (
                      <Flex alignItems={'center'}>
                        <MySelect
                          width={'120px'}
                          value={getValues('autoBackup.hour')}
                          list={SelectTimeList.slice(0, 24).map((i) => ({
                            value: i.id,
                            label: i.label
                          }))}
                          onchange={(val: any) => {
                            setValue('autoBackup.hour', val);
                          }}
                        />
                        <Box flex={'0 0 110px'} ml={'8px'} mr={'12px'}>
                          {t('hour')}
                        </Box>
                      </Flex>
                    )}

                    <Flex alignItems={'center'}>
                      <MySelect
                        width={'120px'}
                        value={getValues('autoBackup.minute')}
                        list={SelectTimeList.map((i) => ({
                          value: i.id,
                          label: i.label
                        }))}
                        onchange={(val: any) => {
                          setValue('autoBackup.minute', val);
                        }}
                      />
                      <Box flex={'0 0 110px'} ml={'8px'}>
                        {t('minute')}
                      </Box>
                    </Flex>
                  </Flex>

                  <FormControl isInvalid={Boolean(errors?.autoBackup?.saveTime)} mt={7}>
                    <Flex alignItems={'center'}>
                      <Box flex={'0 0 110px'}>{t('SaveTime')}</Box>
                      <MyTooltip label={'1~100' + t('Day')}>
                        <NumberInput
                          w={'120px'}
                          max={100}
                          min={1}
                          step={1}
                          position={'relative'}
                          value={getValues('autoBackup.saveTime')}
                          onChange={(e) => {
                            e !== ''
                              ? setValue('autoBackup.saveTime', Math.min(+e, 100))
                              : setValue('autoBackup.saveTime', 1);
                          }}
                        >
                          <NumberInputField
                            {...register('autoBackup.saveTime', {
                              required: t('storage_cannot_empty'),
                              min: {
                                value: 1,
                                message: `${t('backup_saveTime_max')}1${t('Day')}`
                              },
                              max: {
                                value: 100,
                                message: `${t('backup_saveTime_min')}100${t('Day')} `
                              },
                              valueAsNumber: true
                            })}
                            min={0}
                            max={100}
                            borderRadius={'md'}
                            borderColor={'#E8EBF0'}
                            bg={'#F7F8FA'}
                            _focusVisible={{
                              borderColor: 'brightBlue.500',
                              boxShadow: '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)',
                              bg: '#FFF',
                              color: '#111824'
                            }}
                            _hover={{
                              borderColor: 'brightBlue.300'
                            }}
                          />

                          <NumberInputStepper>
                            <NumberIncrementStepper>
                              <MyIcon name="arrowUp" width={'12px'} />
                            </NumberIncrementStepper>
                            <NumberDecrementStepper>
                              <MyIcon name="arrowDown" width={'12px'} />
                            </NumberDecrementStepper>
                          </NumberInputStepper>
                          <Box
                            zIndex={100}
                            position={'absolute'}
                            right={10}
                            top={'50%'}
                            transform={'translateY(-50%)'}
                            color={'grayModern.600'}
                          >
                            {t('Day')}
                          </Box>
                        </NumberInput>
                      </MyTooltip>
                    </Flex>
                  </FormControl>

                  <Flex mt={7} alignItems={'start'}>
                    <Box flex={'0 0 110px'}>{t('termination_policy')}</Box>
                    {/* <Switch
                      isChecked={getValues('terminationPolicy') === 'Delete'}
                      onChange={(e) => {
                        setValue('terminationPolicy', e.target.checked ? 'Delete' : 'WipeOut');
                      }}
                    /> */}
                    <Flex gap={'12px'} flexDirection={'column'}>
                      {['Delete', 'WipeOut'].map((item) => {
                        const isChecked = getValues('terminationPolicy') === item;

                        return (
                          <Flex
                            key={item}
                            alignItems={'center'}
                            justifyContent={'start'}
                            minW={'300px'}
                            p={'10px 12px'}
                            gap={'8px'}
                            bg={'grayModern.50'}
                            border={'1px solid'}
                            boxShadow={
                              isChecked ? '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)' : 'none'
                            }
                            borderColor={isChecked ? 'brightBlue.500' : '#E8EBF0'}
                            borderRadius={'md'}
                            onClick={() => {
                              setValue(
                                'terminationPolicy',
                                getValues('terminationPolicy') === 'Delete' ? 'WipeOut' : 'Delete'
                              );
                            }}
                            cursor={'pointer'}
                          >
                            <Center
                              boxSize={'14px'}
                              borderRadius={'full'}
                              border={'1px solid'}
                              borderColor={isChecked ? 'brightBlue.500' : '#E8EBF0'}
                              boxShadow={
                                isChecked ? '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)' : '#C4CBD7'
                              }
                            >
                              {isChecked && (
                                <Box boxSize={'4px'} borderRadius={'full'} bg={'#219BF4'}></Box>
                              )}
                            </Center>
                            <Box>
                              <Text fontSize={'12px'} fontWeight={'bold'} color={'grayModern.900'}>
                                {t(`${item.toLowerCase()}_backup_with_db` as I18nCommonKey)}
                              </Text>
                              <Text fontSize={'10px'} fontWeight={'bold'} color="grayModern.500">
                                {t(`${item.toLowerCase()}_backup_with_db_tip` as I18nCommonKey)}
                              </Text>
                            </Box>
                          </Flex>
                        );
                      })}
                    </Flex>
                  </Flex>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </Grid>
    </>
  );
};

export default Form;

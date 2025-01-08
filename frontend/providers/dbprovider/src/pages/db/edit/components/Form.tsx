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
import type { DBEditType } from '@/types/db';
import { I18nCommonKey } from '@/types/i18next';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Center,
  Checkbox,
  Collapse,
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
  Text,
  useDisclosure,
  useTheme
} from '@chakra-ui/react';
import { MySelect, MySlider, MyTooltip, RangeInput, Tabs } from '@sealos/ui';
import { throttle } from 'lodash';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';

const Form = ({
  formHook,
  pxVal,
  minStorage
}: {
  formHook: UseFormReturn<DBEditType, any>;
  pxVal: number;
  minStorage: number;
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
    formState: { errors }
  } = formHook;

  const navList: { id: string; label: I18nCommonKey; icon: string }[] = [
    {
      id: 'baseInfo',
      label: 'basic',
      icon: 'formInfo'
    },
    {
      id: 'backupSettings',
      label: 'backup_settings',
      icon: 'backupSettings'
    }
  ];

  const [activeNav, setActiveNav] = useState(navList[0].id);

  // listen scroll and set activeNav
  useEffect(() => {
    const scrollFn = throttle((e: Event) => {
      if (!e.target) return;
      const doms = navList.map((item) => ({
        dom: document.getElementById(item.id),
        id: item.id
      }));

      const dom = e.target as HTMLDivElement;
      const scrollTop = dom.scrollTop;

      for (let i = doms.length - 1; i >= 0; i--) {
        const offsetTop = doms[i].dom?.offsetTop || 0;
        if (scrollTop + 200 >= offsetTop) {
          setActiveNav(doms[i].id);
          break;
        }
      }
    }, 200);
    document.getElementById('form-container')?.addEventListener('scroll', scrollFn);
    return () => {
      document.getElementById('form-container')?.removeEventListener('scroll', scrollFn);
    };
    // eslint-disable-next-line
  }, []);

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
        >
          {/* base info */}
          <Box id={'baseInfo'} {...boxStyles}>
            <Box {...headerStyles}>
              <MyIcon name={'formInfo'} mr={5} w={'20px'} color={'grayModern.600'} />
              {t('basic')}
            </Box>
            <Box px={'42px'} py={'24px'}>
              <Flex alignItems={'center'} mb={7}>
                <Label w={100} alignSelf={'flex-start'}>
                  {t('Type')}
                </Label>
                <Flex flexWrap={'wrap'} gap={'12px'}>
                  {DBTypeList &&
                    DBTypeList?.map((item) => {
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
                            setValue('dbVersion', DBVersionMap[getValues('dbType')][0].id);
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
                    })}
                </Flex>
              </Flex>
              <Flex alignItems={'center'} mb={7}>
                <Label w={100}>{t('version')}</Label>

                <MySelect
                  isDisabled={isEdit}
                  width={'200px'}
                  placeholder={`${t('DataBase')} ${t('version')}`}
                  value={getValues('dbVersion')}
                  list={DBVersionMap[getValues('dbType')].map((i) => ({
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
                  markList={CpuSlideMarkList}
                  activeVal={getValues('cpu')}
                  setVal={(e) => {
                    setValue('cpu', CpuSlideMarkList[e].value);
                  }}
                  max={CpuSlideMarkList.length - 1}
                  min={0}
                  step={1}
                />
                <Box ml={5} transform={'translateY(10px)'} color={'grayModern.600'}>
                  (Core)
                </Box>
              </Flex>
              <Flex mb={'50px'} pr={3} alignItems={'center'}>
                <Label w={100}>{t('memory')}</Label>
                <MySlider
                  markList={MemorySlideMarkList}
                  activeVal={getValues('memory')}
                  setVal={(e) => {
                    setValue('memory', MemorySlideMarkList[e].value);
                  }}
                  max={MemorySlideMarkList.length - 1}
                  min={0}
                  step={1}
                />
              </Flex>
              <Flex mb={8} alignItems={'center'}>
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
                    icon={<MyIcon name="warningInfo" width={'14px'}></MyIcon>}
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

              <FormControl isInvalid={!!errors.storage} w={'500px'}>
                <Flex alignItems={'center'}>
                  <Label w={100}>{t('storage')}</Label>
                  <MyTooltip
                    label={`${t('storage_range')}${minStorage}~${SystemEnv.STORAGE_MAX_SIZE} Gi`}
                  >
                    <NumberInput
                      w={'180px'}
                      max={SystemEnv.STORAGE_MAX_SIZE}
                      min={minStorage}
                      step={1}
                      position={'relative'}
                      value={getValues('storage')}
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
                </Flex>
              </FormControl>
            </Box>
          </Box>
          {BackupSupportedDBTypeList.includes(getValues('dbType')) && (
            <Box id={'backupSettings'} {...boxStyles}>
              <Box {...headerStyles}>
                <MyIcon name={'backupSettings'} mr={5} w={'20px'} color={'grayModern.600'} />
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

                  <Flex mt={7} alignItems={'center'}>
                    <Box flex={'0 0 110px'}>{t('SaveTime')}</Box>
                    <Input
                      height={'35px'}
                      maxW={'100px'}
                      bg={'#F7F8FA'}
                      borderTopRightRadius={0}
                      borderBottomRightRadius={0}
                      _focus={{
                        boxShadow: 'none',
                        borderColor: 'myGray.200',
                        bg: 'white'
                      }}
                      {...register('autoBackup.saveTime', {
                        min: 1,
                        valueAsNumber: true
                      })}
                    />
                    <MySelect
                      width={'80px'}
                      value={getValues('autoBackup.saveType').toString()}
                      borderLeft={0}
                      boxShadow={'none !important'}
                      borderColor={'myGray.200'}
                      list={[
                        { value: 'd', label: t('Day') },
                        { value: 'h', label: t('Hour') }
                      ]}
                      h={'35px'}
                      borderTopLeftRadius={0}
                      borderBottomLeftRadius={0}
                      onchange={(val: any) => {
                        setValue('autoBackup.saveType', val);
                      }}
                    />
                  </Flex>
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

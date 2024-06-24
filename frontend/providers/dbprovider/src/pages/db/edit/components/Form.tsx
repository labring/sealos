import { obj2Query } from '@/api/tools';
import MyIcon from '@/components/Icon';
import QuotaBox from '@/components/QuotaBox';
import Tip from '@/components/Tip';
import { DBTypeEnum, DBTypeList, RedisHAConfig } from '@/constants/db';
import { CpuSlideMarkList, MemorySlideMarkList } from '@/constants/editApp';
import { DBVersionMap, INSTALL_ACCOUNT } from '@/store/static';
import type { QueryType } from '@/types';
import type { DBEditType } from '@/types/db';
import { InfoOutlineIcon, WarningIcon } from '@chakra-ui/icons';
import {
  Box,
  Flex,
  Image,
  FormControl,
  Grid,
  Input,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  useTheme,
  Center,
  Text
} from '@chakra-ui/react';
import { MySelect, Tabs, MySlider, RangeInput, MyTooltip } from '@sealos/ui';
import { throttle } from 'lodash';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import PriceBox from '@/components/PriceBox';

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

  const navList = [
    {
      id: 'baseInfo',
      label: t('Basic'),
      icon: 'formInfo'
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
              { id: 'form', label: t('Config Form') },
              { id: 'yaml', label: t('YAML File') }
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
                    color={activeNav === item.id ? 'grayModern.600' : 'myGray.400'}
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
              {t('Basic')}
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
                          cursor={'pointer'}
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
                <Label w={100}>{t('Version')}</Label>

                <MySelect
                  width={'200px'}
                  placeholder={`${t('DataBase')} ${t('Version')}`}
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
                  <Label w={100}>{t('Name')}</Label>
                  <Input
                    disabled={isEdit}
                    title={isEdit ? t('Cannot Change Name') || '' : ''}
                    autoFocus={true}
                    placeholder={t('DataBase Name Regex') || ''}
                    {...register('dbName', {
                      required: t('DataBase Name Empty') || '',
                      pattern: {
                        value: /^[a-z]([-a-z0-9]*[a-z0-9])?$/g,
                        message: t('DataBase Name Regex Error')
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
                <Label w={100}>{t('Memory')}</Label>
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
                      required: t('Replicas Cannot Empty') || '',
                      min: {
                        value: 1,
                        message: `${t('Min Replicas')}1`
                      },
                      max: {
                        value: 20,
                        message: `${t('Max Replicas')}20`
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
                    text="The Single-node database is only suitable for development testing"
                    size="sm"
                    borderRadius={'md'}
                  />
                )}
                {getValues('dbType') === DBTypeEnum.redis && getValues('replicas') > 1 && (
                  <Tip
                    ml={4}
                    icon={<InfoOutlineIcon />}
                    text="The multi-replica Redis includes High Availability (HA) nodes, Please note, the anticipated price already encompasses the cost for the HA nodes"
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
                      text={t('db instances tip', {
                        db: getValues('dbType')
                      })}
                      size="sm"
                      borderRadius={'md'}
                    />
                  )}
              </Flex>

              <FormControl isInvalid={!!errors.storage} w={'500px'}>
                <Flex alignItems={'center'}>
                  <Label w={100}>{t('Storage')}</Label>
                  <MyTooltip label={`${t('Storage Range')}${minStorage}~300 Gi`}>
                    <NumberInput
                      w={'180px'}
                      max={300}
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
                          required: t('Storage Cannot Empty') || 'Storage Cannot Empty',
                          min: {
                            value: minStorage,
                            message: `${t('Storage Min')}${minStorage} Gi`
                          },
                          max: {
                            value: 300,
                            message: `${t('Storage Max')}300 Gi`
                          },
                          valueAsNumber: true
                        })}
                        min={minStorage}
                        max={300}
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
        </Box>
      </Grid>
    </>
  );
};

export default Form;

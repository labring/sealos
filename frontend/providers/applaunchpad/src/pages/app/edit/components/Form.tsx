import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Flex,
  Grid,
  FormControl,
  Input,
  Divider,
  Switch,
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  AccordionIcon,
  useTheme,
  useDisclosure
} from '@chakra-ui/react';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import { useFieldArray, UseFormReturn } from 'react-hook-form';
import { useRouter } from 'next/router';

import type { ConfigMapType } from './ConfigmapModal';
import type { StoreType } from './StoreModal';
import type { QueryType } from '@/types';
import type { AppEditType } from '@/types/app';
import { customAlphabet } from 'nanoid';
import { GpuAmountMarkList } from '@/constants/editApp';
import { DOMAIN_PORT, SEALOS_DOMAIN } from '@/store/static';
import { useTranslation } from 'next-i18next';
import { useGlobalStore } from '@/store/global';

import Tabs from '@/components/Tabs';
import Tip from '@/components/Tip';
import MySelect from '@/components/Select';
import PriceBox from './PriceBox';
import dynamic from 'next/dynamic';
import RangeInput from '@/components/RangeInput';
import MySlider from '@/components/Slider';
import MyRangeSlider from '@/components/RangeSlider';
import MyIcon from '@/components/Icon';
import MyTooltip from '@/components/MyTooltip';

const ConfigmapModal = dynamic(() => import('./ConfigmapModal'));
const StoreModal = dynamic(() => import('./StoreModal'));
const EditEnvs = dynamic(() => import('./EditEnvs'));

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);
import styles from './index.module.scss';
import { obj2Query } from '@/api/tools';
import { throttle } from 'lodash';
import { noGpuSliderKey } from '@/constants/app';
import { sliderNumber2MarkList } from '@/utils/adapt';

const labelWidth = 120;

const Form = ({
  formHook,
  already,
  defaultStorePathList,
  countGpuInventory,
  pxVal,
  refresh
}: {
  formHook: UseFormReturn<AppEditType, any>;
  already: boolean;
  defaultStorePathList: string[];
  countGpuInventory: (type?: string) => number;
  pxVal: number;
  refresh: boolean;
}) => {
  if (!formHook) return null;
  const { t } = useTranslation();
  const { userSourcePrice, formSliderListConfig } = useGlobalStore();
  const router = useRouter();
  const { name } = router.query as QueryType;
  const theme = useTheme();
  const isEdit = useMemo(() => !!name, [name]);
  const {
    register,
    control,
    setValue,
    getValues,
    formState: { errors }
  } = formHook;

  const { fields: envs, replace: replaceEnvs } = useFieldArray({
    control,
    name: 'envs'
  });
  const {
    fields: configMaps,
    append: appendConfigMaps,
    remove: removeConfigMaps
  } = useFieldArray({
    control,
    name: 'configMapList'
  });
  const {
    fields: storeList,
    append: appendStoreList,
    remove: removeStoreList
  } = useFieldArray({
    control,
    name: 'storeList'
  });

  const navList = useMemo(
    () => [
      {
        id: 'baseInfo',
        label: 'Basic Config',
        icon: 'formInfo',
        isSetting:
          getValues('appName') &&
          getValues('imageName') &&
          (getValues('secret.use')
            ? getValues('secret.username') &&
              getValues('secret.password') &&
              getValues('secret.serverAddress')
            : true)
      },
      {
        id: 'network',
        label: 'Network Configuration',
        icon: 'network',
        isSetting: !!getValues('containerOutPort')
      },
      {
        id: 'settings',
        label: 'Advanced Configuration',
        icon: 'settings',
        isSetting:
          getValues('runCMD') ||
          getValues('cmdParam') ||
          getValues('envs').length > 0 ||
          getValues('configMapList').length > 0 ||
          getValues('storeList').length > 0
      }
    ],
    [refresh]
  );

  const [activeNav, setActiveNav] = useState(navList[0].id);
  const [configEdit, setConfigEdit] = useState<ConfigMapType>();
  const [storeEdit, setStoreEdit] = useState<StoreType>();
  const { isOpen: isEditEnvs, onOpen: onOpenEditEnvs, onClose: onCloseEditEnvs } = useDisclosure();

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

  // common form label
  const Label = ({
    children,
    w = labelWidth,
    ...props
  }: {
    children: string;
    w?: number | 'auto';
    [key: string]: any;
  }) => (
    <Box
      flex={`0 0 ${w === 'auto' ? 'auto' : `${w}px`}`}
      color={'#333'}
      userSelect={'none'}
      {...props}
    >
      {children}
    </Box>
  );

  const boxStyles = {
    border: theme.borders.base,
    borderRadius: 'sm',
    mb: 4,
    bg: 'white'
  };
  const headerStyles = {
    py: 4,
    pl: '46px',
    fontSize: '2xl',
    color: 'myGray.900',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'myWhite.600'
  };

  // add NoGPU select item
  const gpuSelectList = useMemo(
    () =>
      userSourcePrice?.gpu
        ? [
            {
              label: t('No GPU'),
              value: ''
            },
            ...userSourcePrice.gpu.map((item) => ({
              icon: 'nvidia',
              label: (
                <Flex>
                  <Box color={'myGray.900'}>{item.type}</Box>
                  <Box mx={3} color={'myGray.500'}>
                    |
                  </Box>
                  <Box color={'myGray.500'}>
                    {t('vm')} : {item.vm}G
                  </Box>
                  <Box mx={3} color={'myGray.500'}>
                    |
                  </Box>
                  <Flex pr={3}>
                    <Box color={'myGray.500'}>{t('Inventory')}&ensp;:&ensp;</Box>
                    <Box color={'#FB7C3C'}>{countGpuInventory(item.type)}</Box>
                  </Flex>
                </Flex>
              ),
              value: item.type
            }))
          ]
        : [],
    [countGpuInventory, t, userSourcePrice?.gpu, refresh]
  );
  const selectedGpu = useMemo(() => {
    const selected = userSourcePrice?.gpu?.find((item) => item.type === getValues('gpu.type'));
    if (!selected) return;
    return {
      ...selected,
      inventory: countGpuInventory(selected.type)
    };
  }, [userSourcePrice?.gpu, countGpuInventory, getValues, refresh]);
  // cpu, memory have different sliderValue
  const countSliderList = useCallback(() => {
    const gpuType = getValues('gpu.type');
    const key = gpuType && formSliderListConfig[gpuType] ? gpuType : noGpuSliderKey;

    return {
      cpu: sliderNumber2MarkList({
        val: formSliderListConfig[key].cpu,
        type: 'cpu',
        gpuAmount: getValues('gpu.amount')
      }),
      memory: sliderNumber2MarkList({
        val: formSliderListConfig[key].memory,
        type: 'memory',
        gpuAmount: getValues('gpu.amount')
      })
    };
  }, [formSliderListConfig, getValues]);
  const SliderList = useMemo(() => countSliderList(), [countSliderList, refresh]);

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
              { id: 'form', label: 'Config Form' },
              { id: 'yaml', label: 'YAML File' }
            ]}
            activeId={'form'}
            onChange={() =>
              router.replace(
                `/app/edit?${obj2Query({
                  name,
                  type: 'yaml'
                })}`
              )
            }
          />
          <Box mt={3} borderRadius={'sm'} overflow={'hidden'} backgroundColor={'white'}>
            {navList.map((item) => (
              <Box key={item.id} onClick={() => router.replace(`#${item.id}`)}>
                <Flex
                  px={5}
                  py={3}
                  cursor={'pointer'}
                  borderLeft={'2px solid'}
                  alignItems={'center'}
                  h={'48px'}
                  _hover={{
                    backgroundColor: 'myWhite.400'
                  }}
                  {...(activeNav === item.id
                    ? {
                        fontWeight: 'bold',
                        borderColor: 'myGray.900',
                        backgroundColor: 'myWhite.600 !important'
                      }
                    : {
                        color: 'myGray.500',
                        borderColor: 'myGray.200',
                        backgroundColor: 'transparent'
                      })}
                >
                  <MyIcon
                    name={item.icon as any}
                    w={'20px'}
                    h={'20px'}
                    color={activeNav === item.id ? 'myGray.500' : 'myGray.400'}
                  />
                  <Box ml={4}>{t(item.label)}</Box>
                </Flex>
              </Box>
            ))}
          </Box>
          {userSourcePrice && (
            <Box mt={3} borderRadius={'sm'} overflow={'hidden'} backgroundColor={'white'} p={3}>
              <PriceBox
                pods={
                  getValues('hpa.use')
                    ? [getValues('hpa.minReplicas') || 1, getValues('hpa.maxReplicas') || 2]
                    : [getValues('replicas') || 1, getValues('replicas') || 1]
                }
                cpu={getValues('cpu')}
                memory={getValues('memory')}
                storage={getValues('storeList').reduce((sum, item) => sum + item.value, 0)}
                gpu={
                  !!getValues('gpu.type')
                    ? {
                        type: getValues('gpu.type'),
                        amount: getValues('gpu.amount')
                      }
                    : undefined
                }
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
              <MyIcon name={'formInfo'} mr={5} w={'20px'} color={'myGray.500'} />
              {t('Basic Config')}
            </Box>
            <Box px={'42px'} py={'24px'}>
              {/* app name */}
              <FormControl mb={7} isInvalid={!!errors.appName} w={'500px'}>
                <Flex alignItems={'center'}>
                  <Label>{t('App Name')}</Label>
                  <Input
                    disabled={isEdit}
                    title={isEdit ? t('Not allowed to change app name') || '' : ''}
                    autoFocus={true}
                    placeholder={
                      t(
                        'Starts with a letter and can contain only lowercase letters, digits, and hyphens (-)'
                      ) || ''
                    }
                    {...register('appName', {
                      required: t('Not allowed to change app name') || '',
                      pattern: {
                        value: /^[a-z][a-z0-9]+([-.][a-z0-9]+)*$/g,
                        message: t(
                          'The application name can contain only lowercase letters, digits, and hyphens (-) and must start with a letter'
                        )
                      }
                    })}
                  />
                </Flex>
              </FormControl>
              {/* image */}
              <Box mb={7}>
                <Flex alignItems={'center'}>
                  <Label>{t('Image')}</Label>
                  <Tabs
                    w={'126px'}
                    size={'sm'}
                    list={[
                      {
                        label: 'public',
                        id: `public`
                      },
                      {
                        label: 'private',
                        id: `private`
                      }
                    ]}
                    activeId={getValues('secret.use') ? 'private' : 'public'}
                    onChange={(val) => {
                      if (val === 'public') {
                        setValue('secret.use', false);
                      } else {
                        setValue('secret.use', true);
                      }
                    }}
                  />
                </Flex>
                <Box mt={4} pl={`${labelWidth}px`}>
                  <FormControl isInvalid={!!errors.imageName} w={'420px'}>
                    <Box mb={1} fontSize={'sm'}>
                      {t('Image Name')}
                    </Box>
                    <Input
                      value={getValues('imageName')}
                      backgroundColor={getValues('imageName') ? 'myWhite.500' : 'myWhite.400'}
                      placeholder={`${t('Image Name')}`}
                      {...register('imageName', {
                        required: 'Image name cannot be empty.',
                        setValueAs(e) {
                          return e.replace(/\s*/g, '');
                        }
                      })}
                    />
                  </FormControl>
                  {getValues('secret.use') ? (
                    <>
                      <FormControl mt={4} isInvalid={!!errors.secret?.username} w={'420px'}>
                        <Box mb={1} fontSize={'sm'}>
                          {t('Username')}
                        </Box>
                        <Input
                          backgroundColor={getValues('imageName') ? 'myWhite.500' : 'myWhite.400'}
                          placeholder={`${t('Username for the image registry')}`}
                          {...register('secret.username', {
                            required: t('The user name cannot be empty') || ''
                          })}
                        />
                      </FormControl>
                      <FormControl mt={4} isInvalid={!!errors.secret?.password} w={'420px'}>
                        <Box mb={1} fontSize={'sm'}>
                          {t('Password')}
                        </Box>
                        <Input
                          type={'password'}
                          placeholder={`${t('Password for the image registry')}`}
                          backgroundColor={getValues('imageName') ? 'myWhite.500' : 'myWhite.400'}
                          {...register('secret.password', {
                            required: t('The password cannot be empty') || ''
                          })}
                        />
                      </FormControl>
                      <FormControl mt={4} isInvalid={!!errors.secret?.serverAddress} w={'420px'}>
                        <Box mb={1} fontSize={'sm'}>
                          {t('Image Address')}
                        </Box>
                        <Input
                          backgroundColor={getValues('imageName') ? 'myWhite.500' : 'myWhite.400'}
                          placeholder={`${t('Image Address')}`}
                          {...register('secret.serverAddress', {
                            required: t('The image cannot be empty') || ''
                          })}
                        />
                      </FormControl>
                    </>
                  ) : null}
                </Box>
              </Box>
              {/* replicas */}
              <Box mb={7}>
                <Flex alignItems={'center'}>
                  <Label>{t('Deployment Mode')}</Label>
                  <Tabs
                    w={'195px'}
                    size={'sm'}
                    list={[
                      {
                        label: 'Fixed instance',
                        id: `static`
                      },
                      {
                        label: 'Auto scaling',
                        id: `hpa`
                      }
                    ]}
                    activeId={getValues('hpa.use') ? 'hpa' : 'static'}
                    onChange={(val) => {
                      if (val === 'static') {
                        setValue('hpa.use', false);
                      } else {
                        setValue('hpa.use', true);
                      }
                    }}
                  />
                </Flex>
                <Box mt={4} pl={`${labelWidth}px`}>
                  {getValues('hpa.use') ? (
                    <>
                      <Flex alignItems={'center'}>
                        <MySelect
                          width={'130px'}
                          value={getValues('hpa.target')}
                          list={[
                            { value: 'cpu', label: t('CPU') },
                            { value: 'memory', label: t('Memory') }
                          ]}
                          onchange={(val: any) => setValue('hpa.target', val)}
                        />

                        <Input
                          type={'number'}
                          backgroundColor={getValues('hpa.value') ? 'myWhite.500' : 'myWhite.400'}
                          mx={2}
                          w={`${labelWidth}px`}
                          {...register('hpa.value', {
                            required: t('The Cpu target is empty') || '',
                            valueAsNumber: true,
                            min: {
                              value: 1,
                              message: t('The cpu target value must be positive')
                            },
                            max: {
                              value: 100,
                              message: t('The target cpu value must be less than 100')
                            }
                          })}
                        />
                        <Box>%</Box>
                        <Tip
                          ml={4}
                          icon={<InfoOutlineIcon />}
                          text="CPU target is the CPU utilization rate of any container"
                          size="sm"
                        />
                      </Flex>

                      <Box mt={5} pb={5} pr={3}>
                        <Label mb={1} fontSize={'sm'}>
                          {t('Replicas')}
                        </Label>
                        <Box w={'410px'} ml={'7px'}>
                          <MyRangeSlider
                            min={1}
                            max={20}
                            step={1}
                            value={[getValues('hpa.minReplicas'), getValues('hpa.maxReplicas')]}
                            setVal={(e) => {
                              setValue('hpa.minReplicas', e[0]);
                              setValue('hpa.maxReplicas', e[1]);
                            }}
                          />
                        </Box>
                      </Box>
                    </>
                  ) : (
                    <Flex alignItems={'center'}>
                      <Label w={'auto'} mr={3}>
                        {t('Replicas')}
                      </Label>
                      <RangeInput
                        value={getValues('replicas')}
                        min={1}
                        max={20}
                        hoverText={
                          t('Number of instances: 1 to 20') || 'Number of instances: 1 to 20'
                        }
                        setVal={(val) => {
                          register('replicas', {
                            required:
                              t('The number of instances cannot be empty') ||
                              'The number of instances cannot be empty',
                            min: {
                              value: 1,
                              message: t('The minimum number of instances is 1')
                            },
                            max: {
                              value: 20,
                              message: t('The maximum number of instances is 20')
                            }
                          });
                          setValue('replicas', val || '');
                        }}
                      />
                    </Flex>
                  )}
                </Box>
              </Box>

              {userSourcePrice?.gpu && (
                <Box mb={7}>
                  <Flex alignItems={'center'}>
                    <Label>GPU</Label>
                    <MySelect
                      minW={'300px'}
                      w={'auto'}
                      placeholder={t('No GPU') || ''}
                      value={getValues('gpu.type')}
                      list={gpuSelectList}
                      onchange={(type: any) => {
                        const selected = userSourcePrice?.gpu?.find((item) => item.type === type);
                        const inventory = countGpuInventory(type);
                        if (type === '' || (selected && inventory > 0)) {
                          setValue('gpu.type', type);
                        }
                      }}
                    />
                  </Flex>
                  {!!getValues('gpu.type') && (
                    <Box mt={4} pl={`${labelWidth}px`}>
                      <Box mb={1}>{t('Amount')}</Box>
                      <Flex alignItems={'center'}>
                        {GpuAmountMarkList.map((item) => {
                          const inventory = selectedGpu?.inventory || 0;
                          const hasInventory = item.value <= inventory;

                          return (
                            <MyTooltip
                              key={item.value}
                              label={hasInventory ? '' : t('Under Stock')}
                            >
                              <Box
                                mr={2}
                                w={'32px'}
                                h={'32px'}
                                lineHeight={'32px'}
                                textAlign={'center'}
                                borderRadius={'md'}
                                border={'1px solid'}
                                bg={'myWhite.500'}
                                {...(getValues('gpu.amount') === item.value
                                  ? {
                                      borderColor: 'myBlue.600',
                                      boxShadow: '0px 0px 4px #A8DBFF'
                                    }
                                  : {
                                      borderColor: 'myGray.200'
                                    })}
                                {...(hasInventory
                                  ? {
                                      cursor: 'pointer',
                                      onClick: () => {
                                        setValue('gpu.amount', item.value);
                                        const sliderList = countSliderList();
                                        setValue('cpu', sliderList.cpu[1].value);
                                        setValue('memory', sliderList.memory[1].value);
                                      }
                                    }
                                  : {
                                      cursor: 'default',
                                      opacity: 0.5
                                    })}
                              >
                                {item.label}
                              </Box>
                            </MyTooltip>
                          );
                        })}
                        <Box ml={3} color={'MyGray.500'}>
                          / {t('Card')}
                        </Box>
                      </Flex>
                    </Box>
                  )}
                </Box>
              )}

              {/* cpu && memory */}
              <Flex mb={10} pr={3} alignItems={'flex-start'}>
                <Label mr={'7px'}>{t('CPU')}</Label>
                <MySlider
                  markList={SliderList.cpu}
                  activeVal={getValues('cpu')}
                  setVal={(e) => {
                    setValue('cpu', SliderList.cpu[e].value);
                  }}
                  max={SliderList.cpu.length - 1}
                  min={0}
                  step={1}
                />
                <Box ml={5} transform={'translateY(10px)'} color={'myGray.500'}>
                  (Core)
                </Box>
              </Flex>
              <Flex mb={8} pr={3} alignItems={'center'}>
                <Label mr={'7px'}>{t('Memory')}</Label>
                <MySlider
                  markList={SliderList.memory}
                  activeVal={getValues('memory')}
                  setVal={(e) => {
                    setValue('memory', SliderList.memory[e].value);
                  }}
                  max={SliderList.memory.length - 1}
                  min={0}
                  step={1}
                />
              </Flex>
            </Box>
          </Box>

          {/* network */}
          <Box id={'network'} {...boxStyles}>
            <Box {...headerStyles}>
              <MyIcon name={'network'} mr={5} w={'20px'} color={'myGray.500'} />
              {t('Network Configuration')}
            </Box>
            <Box px={'42px'} py={'24px'}>
              <FormControl mb={7}>
                <Flex alignItems={'center'}>
                  <Label>{t('Container Port')}</Label>
                  <Input
                    type={'number'}
                    bg={getValues('containerOutPort') ? 'myWhite.500' : 'myWhite.400'}
                    w={'100px'}
                    {...register('containerOutPort', {
                      required: '容器暴露端口不能为空',
                      valueAsNumber: true,
                      min: {
                        value: 1,
                        message: '暴露端口需要为正数'
                      }
                    })}
                  />
                </Flex>
              </FormControl>
              <Box>
                <Flex mb={5}>
                  <Label>{t('Open Public Access')}</Label>
                  <Switch
                    size={'lg'}
                    colorScheme={'blackAlpha'}
                    isChecked={getValues('accessExternal.use')}
                    {...register('accessExternal.use', {
                      onChange: () => {
                        // first open, add init data
                        if (!getValues('accessExternal.outDomain')) {
                          setValue('accessExternal', {
                            use: true,
                            backendProtocol: 'HTTP',
                            outDomain: nanoid(),
                            selfDomain: ''
                          });
                        }
                      }
                    })}
                  />
                </Flex>
                {getValues('accessExternal.use') && (
                  <Box pl={'120px'}>
                    <FormControl mt={5}>
                      <Flex>
                        <Box mr={'32px'}>
                          <Box mb={1}>{t('Protocol')}</Box>
                          <MySelect
                            width={'120px'}
                            value={getValues('accessExternal.backendProtocol')}
                            list={[
                              { value: 'HTTP', label: 'https' },
                              { value: 'GRPC', label: 'grpcs' },
                              { value: 'WS', label: 'websocket' }
                            ]}
                            onchange={(val: any) => setValue('accessExternal.backendProtocol', val)}
                          />
                        </Box>
                        <Box color={'myGray.500'}>
                          <Label mb={1} color={'myGray.500'}>
                            {t('Export Domain')}
                          </Label>
                          <Box userSelect={'all'} h={'34px'} lineHeight={'34px'}>
                            {getValues('accessExternal.outDomain')}.{SEALOS_DOMAIN}
                            {DOMAIN_PORT}
                          </Box>
                        </Box>
                      </Flex>
                    </FormControl>
                    <FormControl mt={5}>
                      <Label mb={1}>{t('Custom Domain')}</Label>
                      <Input
                        w={'350px'}
                        bg={getValues('accessExternal.selfDomain') ? 'myWhite.500' : 'myWhite.400'}
                        placeholder="Custom Domain"
                        {...register('accessExternal.selfDomain')}
                      />
                    </FormControl>
                    {!!getValues('accessExternal.selfDomain') && (
                      <Flex>
                        <Tip
                          mt={3}
                          size={'sm'}
                          icon={<InfoOutlineIcon />}
                          text={`${t('Please CNAME your custom domain to')} ${getValues(
                            'accessExternal.outDomain'
                          )}.${SEALOS_DOMAIN}`}
                        />
                      </Flex>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
          {/* settings */}
          {already && (
            <Accordion
              id={'settings'}
              allowToggle
              defaultIndex={navList[2].isSetting ? 0 : undefined}
            >
              <AccordionItem {...boxStyles}>
                <AccordionButton
                  {...headerStyles}
                  justifyContent={'space-between'}
                  _hover={{ bg: '' }}
                >
                  <Flex alignItems={'center'}>
                    <MyIcon name={'settings'} mr={5} w={'20px'} color={'myGray.500'} />
                    <Box>{t('Advanced Configuration')}</Box>
                    <Box
                      bg={'myGray.100'}
                      w={'46px'}
                      py={'2px'}
                      ml={3}
                      fontSize={'sm'}
                      borderRadius={'20px'}
                      color={'myGray.600'}
                      border={'1px solid'}
                      borderColor={'myGray.200'}
                    >
                      {t('Option')}
                    </Box>
                  </Flex>
                  <AccordionIcon w={'1.3em'} h={'1.3em'} color={'myGray.700'} />
                </AccordionButton>

                <AccordionPanel px={'42px'} py={'24px'}>
                  {/* command && param */}
                  <FormControl mb={7}>
                    <Flex alignItems={'center'}>
                      <Label>{t('Run command')}</Label>
                      <Input
                        w={'350px'}
                        bg={getValues('runCMD') ? 'myWhite.500' : 'myWhite.400'}
                        placeholder={`${t('Such as')} /bin/bash -c`}
                        {...register('runCMD')}
                      />
                    </Flex>
                  </FormControl>
                  <FormControl>
                    <Flex alignItems={'center'}>
                      <Label>{t('Command parameters')}</Label>
                      <Input
                        w={'350px'}
                        bg={getValues('cmdParam') ? 'myWhite.500' : 'myWhite.400'}
                        placeholder={`${t('Such as')} sleep 10 && /entrypoint.sh db createdb`}
                        {...register('cmdParam')}
                      />
                    </Flex>
                  </FormControl>

                  <Divider my={'30px'} bg={'myGray.100'} />

                  {/* env */}
                  <Box w={'100%'} maxW={'600px'}>
                    <Flex alignItems={'center'}>
                      <Label className={styles.formSecondTitle}>{t('Environment Variables')}</Label>
                      <Button
                        w={'100%'}
                        variant={'base'}
                        leftIcon={<MyIcon name="edit" />}
                        onClick={onOpenEditEnvs}
                      >
                        {t('Edit Environment Variables')}
                      </Button>
                    </Flex>
                    <Box pl={`${labelWidth}px`} mt={3}>
                      <table className={styles.table}>
                        <tbody>
                          {envs.map((env) => {
                            const valText = env.value
                              ? env.value
                              : env.valueFrom
                              ? 'value from | ***'
                              : '';
                            return (
                              <tr key={env.id}>
                                <th>{env.key}</th>
                                <MyTooltip label={valText}>
                                  <th
                                    className={styles.textEllipsis}
                                    style={{
                                      userSelect: 'auto'
                                    }}
                                  >
                                    {valText}
                                  </th>
                                </MyTooltip>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </Box>
                  </Box>

                  <Divider my={'30px'} bg={'myGray.100'} />

                  <Box>
                    <Flex alignItems={'center'}>
                      <Label className={styles.formSecondTitle}>{t('Configuration File')}</Label>
                      <Button
                        onClick={() => setConfigEdit({ mountPath: '', value: '' })}
                        variant={'base'}
                        leftIcon={<MyIcon name="plus" w={'10px'} />}
                        w={'320px'}
                      >
                        {t('Add')}
                        {t('Configuration File')}
                      </Button>
                    </Flex>
                    <Box mt={4} pl={`${labelWidth}px`}>
                      {configMaps.map((item, index) => (
                        <Flex key={item.id} _notLast={{ mb: 5 }} alignItems={'center'}>
                          <Flex
                            alignItems={'center'}
                            px={4}
                            py={1}
                            border={theme.borders.base}
                            flex={'0 0 320px'}
                            w={0}
                            borderRadius={'sm'}
                            cursor={'pointer'}
                            onClick={() => setConfigEdit(item)}
                            bg={'myWhite.300'}
                          >
                            <MyIcon name={'configMap'} />
                            <Box ml={4} flex={'1 0 0'} w={0}>
                              <Box color={'myGray.900'} fontWeight={'bold'}>
                                {item.mountPath}
                              </Box>
                              <Box
                                className={styles.textEllipsis}
                                color={'myGray.500'}
                                fontSize={'sm'}
                              >
                                {item.value}
                              </Box>
                            </Box>
                          </Flex>
                          <Box
                            className={styles.deleteIcon}
                            ml={3}
                            cursor={'pointer'}
                            onClick={() => removeConfigMaps(index)}
                          >
                            <MyIcon name="delete" w={'16px'} h={'16px'} />
                          </Box>
                        </Flex>
                      ))}
                    </Box>
                  </Box>

                  <Divider my={'30px'} bg={'myGray.100'} />

                  <Box>
                    <Flex alignItems={'center'} mb={'10px'}>
                      <Label className={styles.formSecondTitle} m={0}>
                        {t('Local Storage')}
                      </Label>

                      <Button
                        onClick={() => setStoreEdit({ name: '', path: '', value: 1 })}
                        variant={'base'}
                        leftIcon={<MyIcon name="plus" w={'10px'} />}
                        w={'320px'}
                      >
                        {t('Add volume')}
                      </Button>
                      <Tip
                        ml={4}
                        icon={<InfoOutlineIcon />}
                        size="sm"
                        text="Data cannot be communicated between multiple instances"
                      />
                    </Flex>
                    <Box mt={4} pl={`${labelWidth}px`}>
                      {storeList.map((item, index) => (
                        <Flex key={item.id} _notLast={{ mb: 5 }} alignItems={'center'}>
                          <Flex
                            alignItems={'center'}
                            px={4}
                            py={1}
                            border={theme.borders.base}
                            flex={'0 0 320px'}
                            w={0}
                            borderRadius={'sm'}
                            cursor={'pointer'}
                            bg={'myWhite.300'}
                            onClick={() => setStoreEdit(item)}
                          >
                            <MyIcon name={'store'} />
                            <Box ml={4} flex={'1 0 0'} w={0}>
                              <Box color={'myGray.900'} fontWeight={'bold'}>
                                {item.path}
                              </Box>
                              <Box
                                className={styles.textEllipsis}
                                color={'myGray.500'}
                                fontSize={'sm'}
                              >
                                {item.value} Gi
                              </Box>
                            </Box>
                          </Flex>
                          <Box
                            className={styles.deleteIcon}
                            ml={3}
                            cursor={'pointer'}
                            onClick={() => removeStoreList(index)}
                          >
                            <MyIcon name="delete" w={'16px'} h={'16px'} />
                          </Box>
                        </Flex>
                      ))}
                    </Box>
                  </Box>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          )}
        </Box>
      </Grid>
      {isEditEnvs && (
        <EditEnvs defaultEnv={envs} onClose={onCloseEditEnvs} successCb={(e) => replaceEnvs(e)} />
      )}
      {configEdit && (
        <ConfigmapModal
          defaultValue={configEdit}
          listNames={configMaps
            .filter((item) => item.id !== configEdit.id)
            .map((item) => item.mountPath.toLocaleLowerCase())}
          successCb={(e) => {
            if (!e.id) {
              appendConfigMaps(e);
            } else {
              setValue(
                'configMapList',
                configMaps.map((item) => ({
                  mountPath: item.id === e.id ? e.mountPath : item.mountPath,
                  value: item.id === e.id ? e.value : item.value
                }))
              );
            }
            setConfigEdit(undefined);
          }}
          closeCb={() => setConfigEdit(undefined)}
        />
      )}
      {storeEdit && (
        <StoreModal
          defaultValue={storeEdit}
          isEditStore={defaultStorePathList.includes(storeEdit.path)}
          listNames={storeList
            .filter((item) => item.id !== storeEdit.id)
            .map((item) => item.path.toLocaleLowerCase())}
          successCb={(e) => {
            if (!e.id) {
              appendStoreList(e);
            } else {
              setValue(
                'storeList',
                storeList.map((item) => ({
                  name: item.id === e.id ? e.name : item.name,
                  path: item.id === e.id ? e.path : item.path,
                  value: item.id === e.id ? e.value : item.value
                }))
              );
            }
            setStoreEdit(undefined);
          }}
          closeCb={() => setStoreEdit(undefined)}
        />
      )}
    </>
  );
};

export default Form;

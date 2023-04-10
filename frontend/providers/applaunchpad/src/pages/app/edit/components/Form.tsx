import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Link,
  useTheme,
  useDisclosure
} from '@chakra-ui/react';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import { useFieldArray, UseFormReturn } from 'react-hook-form';
import { useRouter } from 'next/router';
import RangeInput from '@/components/RangeInput';
import MySlider from '@/components/Slider';
import MyRangeSlider from '@/components/RangeSlider';
import MyIcon from '@/components/Icon';
import EditEnvs from './EditEnvs';
import type { ConfigMapType } from './ConfigmapModal';
import type { StoreType } from './StoreModal';
import type { QueryType } from '@/types';
import type { AppEditType } from '@/types/app';
import { customAlphabet } from 'nanoid';
import { CpuSlideMarkList, MemorySlideMarkList } from '@/constants/editApp';
import { SEALOS_DOMAIN } from '@/store/static';
import Tabs from '@/components/Tabs';
import Tip from '@/components/Tip';
import MySelect from '@/components/Select';

import dynamic from 'next/dynamic';

const ConfigmapModal = dynamic(() => import('./ConfigmapModal'));
const StoreModal = dynamic(() => import('./StoreModal'));

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);
import styles from './index.module.scss';
import { obj2Query } from '@/api/tools';
import { throttle } from 'lodash';
import { Tooltip } from '@chakra-ui/react';

const Form = ({
  formHook,
  already,
  defaultStorePathList,
  pxVal
}: {
  formHook: UseFormReturn<AppEditType, any>;
  already: boolean;
  defaultStorePathList: string[];
  pxVal: number;
}) => {
  if (!formHook) return null;

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

  const navList = [
    {
      id: 'baseInfo',
      label: '基础配置',
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
      id: 'deployMode',
      label: '部署模式',
      icon: 'deployMode',
      isSetting: getValues('hpa.use') ? !!getValues('hpa.value') : !!getValues('replicas')
    },
    {
      id: 'network',
      label: '网络配置',
      icon: 'network',
      isSetting: !!getValues('containerOutPort')
    },
    {
      id: 'settings',
      label: '高级配置',
      icon: 'settings',
      isSetting:
        getValues('runCMD') ||
        getValues('cmdParam') ||
        getValues('envs').length > 0 ||
        getValues('configMapList').length > 0 ||
        getValues('storeList').length > 0
    }
  ];

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

  const Label = ({
    children,
    w = 80,
    ...props
  }: {
    children: string;
    w?: number | 'auto';
    [key: string]: any;
  }) => (
    <Box
      flex={`0 0 ${w === 'auto' ? 'auto' : `${w}px`}`}
      {...props}
      color={'#333'}
      userSelect={'none'}
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
              { id: 'form', label: '配置表单' },
              { id: 'yaml', label: 'YAML 文件' }
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
                  <Box ml={4}>{item.label}</Box>
                </Flex>
              </Box>
            ))}
          </Box>
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
              基础配置
            </Box>
            <Box px={'42px'} py={'24px'}>
              <FormControl mb={7} isInvalid={!!errors.appName} w={'500px'}>
                <Flex alignItems={'center'}>
                  <Label>应用名称</Label>
                  <Input
                    disabled={isEdit}
                    title={isEdit ? '不允许修改应用名称' : ''}
                    autoFocus={true}
                    {...register('appName', {
                      required: '应用名称不能为空',
                      pattern: {
                        value: /^[a-z0-9]+([-.][a-z0-9]+)*$/g,
                        message: '应用名只能包含小写字母、数字、-和.'
                      }
                    })}
                  />
                </Flex>
              </FormControl>
              <Box mb={7}>
                <Flex alignItems={'center'}>
                  <Label>镜像源</Label>
                  <Tabs
                    w={'126px'}
                    size={'sm'}
                    list={[
                      {
                        label: '公共',
                        id: `public`
                      },
                      {
                        label: '私有',
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
                <Box mt={4} pl={10} borderLeft={theme.borders.base}>
                  <FormControl isInvalid={!!errors.imageName} w={'500px'}>
                    <Flex alignItems={'center'}>
                      <Label>镜像名</Label>
                      <Input
                        value={getValues('imageName')}
                        backgroundColor={getValues('imageName') ? 'myWhite.500' : 'myWhite.400'}
                        placeholder="镜像名"
                        {...register('imageName', {
                          required: '镜像名不能为空',
                          // pattern: {
                          //   value: /^.+\/.+:.+$/g,
                          //   message: '镜像名需满足 url/name:version 的格式'
                          // },
                          setValueAs(e) {
                            return e.replace(/\s*/g, '');
                          }
                        })}
                      />
                    </Flex>
                  </FormControl>
                  {getValues('secret.use') ? (
                    <>
                      <FormControl mt={5} isInvalid={!!errors.secret?.username} w={'500px'}>
                        <Flex alignItems={'center'}>
                          <Label>用户名</Label>
                          <Input
                            backgroundColor={getValues('imageName') ? 'myWhite.500' : 'myWhite.400'}
                            placeholder={'镜像仓库的用户名'}
                            {...register('secret.username', {
                              required: '私有镜像, 用户名不能为空'
                            })}
                          />
                        </Flex>
                      </FormControl>
                      <FormControl mt={5} isInvalid={!!errors.secret?.password} w={'500px'}>
                        <Flex alignItems={'center'}>
                          <Label>密码</Label>
                          <Input
                            type={'password'}
                            placeholder={'镜像仓库的密码'}
                            backgroundColor={getValues('imageName') ? 'myWhite.500' : 'myWhite.400'}
                            {...register('secret.password', {
                              required: '私有镜像, 密码不能为空'
                            })}
                          />
                        </Flex>
                      </FormControl>
                      <FormControl mt={5} isInvalid={!!errors.secret?.serverAddress} w={'500px'}>
                        <Flex alignItems={'center'}>
                          <Label w={110}>镜像仓库地址</Label>
                          <Input
                            backgroundColor={getValues('imageName') ? 'myWhite.500' : 'myWhite.400'}
                            placeholder={'镜像仓库的地址'}
                            {...register('secret.serverAddress', {
                              required: '私有镜像, 地址不能为空'
                            })}
                          />
                        </Flex>
                      </FormControl>
                    </>
                  ) : null}
                </Box>
              </Box>
              <Flex mb={10} pr={3} alignItems={'flex-start'}>
                <Label w={60}>CPU</Label>
                <MySlider
                  markList={CpuSlideMarkList}
                  activeVal={getValues('cpu')}
                  setVal={(e) => {
                    setValue('cpu', CpuSlideMarkList[e].value);
                  }}
                  max={7}
                  min={0}
                  step={1}
                />
                <Box ml={5} transform={'translateY(10px)'} color={'myGray.500'}>
                  (Core)
                </Box>
              </Flex>
              <Flex mb={8} pr={3} alignItems={'center'}>
                <Label w={60}>内存</Label>
                <MySlider
                  markList={MemorySlideMarkList}
                  activeVal={getValues('memory')}
                  setVal={(e) => {
                    setValue('memory', MemorySlideMarkList[e].value);
                  }}
                  max={8}
                  min={0}
                  step={1}
                />
              </Flex>
            </Box>
          </Box>

          {/* deploy mode */}
          <Box id={'deployMode'} {...boxStyles}>
            <Box {...headerStyles}>
              <MyIcon name={'deployMode'} mr={5} w={'20px'} color={'myGray.500'} />
              部署模式
            </Box>
            <Box px={'42px'} py={'24px'}>
              <Tabs
                w={'165px'}
                size={'sm'}
                list={[
                  {
                    label: '固定实例',
                    id: `static`
                  },
                  {
                    label: '弹性伸缩',
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
              <Box mt={6} pl={10} borderLeft={'2px solid'} borderLeftColor={'myGray.100'}>
                {getValues('hpa.use') ? (
                  <>
                    <Flex alignItems={'center'}>
                      <MySelect
                        width={'130px'}
                        placeholder="hpa对象"
                        value={getValues('hpa.target')}
                        list={[
                          { id: 'cpu', label: 'CPU目标值' },
                          { id: 'memory', label: '内存目标值' }
                        ]}
                        onchange={(val: any) => setValue('hpa.target', val)}
                      />

                      <Input
                        type={'number'}
                        backgroundColor={getValues('hpa.value') ? 'myWhite.500' : 'myWhite.400'}
                        mx={2}
                        w={'80px'}
                        {...register('hpa.value', {
                          required: 'cpu目标值为空',
                          valueAsNumber: true,
                          min: {
                            value: 1,
                            message: 'cpu目标值需为正数'
                          },
                          max: {
                            value: 100,
                            message: 'cpu目标值需在100内'
                          }
                        })}
                      />
                      <Box>%</Box>
                      <Tip
                        ml={4}
                        icon={<InfoOutlineIcon />}
                        text="CPU 目标值为任一容器的 CPU 利用率"
                        size="sm"
                      />
                    </Flex>

                    <Flex mt={5} pb={5} pr={3} alignItems={'center'}>
                      <Label w={100}>实例数</Label>
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
                    </Flex>
                  </>
                ) : (
                  <Flex alignItems={'center'}>
                    <Label>实例数</Label>
                    <RangeInput
                      value={getValues('replicas')}
                      min={1}
                      max={20}
                      hoverText="实例数范围：1~20"
                      setVal={(val) => {
                        register('replicas', {
                          required: '实例数不能为空',
                          min: {
                            value: 1,
                            message: '实例数最小为1'
                          },
                          max: {
                            value: 20,
                            message: '实例数最大为20'
                          }
                        });
                        setValue('replicas', val || '');
                      }}
                    />
                  </Flex>
                )}
              </Box>
            </Box>
          </Box>

          {/* network */}
          <Box id={'network'} {...boxStyles}>
            <Box {...headerStyles}>
              <MyIcon name={'network'} mr={5} w={'20px'} color={'myGray.500'} />
              网络配置
            </Box>
            <Box px={'42px'} py={'24px'}>
              <FormControl mb={5}>
                <Flex alignItems={'center'}>
                  <Box flex={'0 0 100px'}>容器暴露端口</Box>
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
                  <Box fontWeight={'bold'} mr={4}>
                    外网访问
                  </Box>
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
                  <Box pl={10} borderLeft={theme.borders.base}>
                    <FormControl mt={5}>
                      <Flex alignItems={'center'}>
                        <Box flex={'0 0 80px'}>协议</Box>
                        <MySelect
                          width={'120px'}
                          value={getValues('accessExternal.backendProtocol')}
                          list={[
                            { id: 'HTTP', label: 'https' },
                            { id: 'GRPC', label: 'grpcs' },
                            { id: 'WS', label: 'websocket' }
                          ]}
                          onchange={(val: any) => setValue('accessExternal.backendProtocol', val)}
                        />
                      </Flex>
                    </FormControl>
                    <FormControl mt={5}>
                      <Flex alignItems={'center'} color={'myGray.500'}>
                        <Box flex={'0 0 80px'}>出口域名</Box>
                        <Box userSelect={'all'}>
                          {getValues('accessExternal.outDomain')}.{SEALOS_DOMAIN}
                        </Box>
                      </Flex>
                    </FormControl>
                    <FormControl mt={5}>
                      <Flex alignItems={'center'}>
                        <Box flex={'0 0 80px'}>自定义域名</Box>
                        <Input
                          w={'320px'}
                          bg={
                            getValues('accessExternal.selfDomain') ? 'myWhite.500' : 'myWhite.400'
                          }
                          placeholder="custom domain"
                          {...register('accessExternal.selfDomain')}
                        />
                      </Flex>
                    </FormControl>
                    {!!getValues('accessExternal.selfDomain') && (
                      <Flex>
                        <Tip
                          mt={3}
                          size={'sm'}
                          icon={<InfoOutlineIcon />}
                          text={`请将您的自定义域名 cname 到 ${getValues(
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
              defaultIndex={navList[3].isSetting ? 0 : undefined}
            >
              <AccordionItem {...boxStyles}>
                <AccordionButton
                  {...headerStyles}
                  justifyContent={'space-between'}
                  _hover={{ bg: '' }}
                >
                  <Flex alignItems={'center'}>
                    <MyIcon name={'settings'} mr={5} w={'20px'} color={'myGray.500'} />
                    <Box>高级配置</Box>
                    <Box
                      bg={'myGray.100'}
                      w={'46px'}
                      h={'28px'}
                      lineHeight={'28px'}
                      ml={3}
                      fontSize={'sm'}
                      borderRadius={'20px'}
                      color={'myGray.600'}
                    >
                      选填
                    </Box>
                  </Flex>
                  <AccordionIcon w={'1.3em'} h={'1.3em'} color={'myGray.700'} />
                </AccordionButton>

                <AccordionPanel px={'42px'} py={'24px'}>
                  <FormControl mb={5}>
                    <Box mb={3}>运行命令</Box>
                    <Input
                      w={'320px'}
                      bg={getValues('runCMD') ? 'myWhite.500' : 'myWhite.400'}
                      placeholder='如：["/bin/bash", "-c"]'
                      {...register('runCMD')}
                    />
                  </FormControl>
                  <FormControl>
                    <Box mb={3}>命令参数</Box>
                    <Input
                      w={'320px'}
                      bg={getValues('cmdParam') ? 'myWhite.500' : 'myWhite.400'}
                      placeholder='如：["HOSTNAME", "PORT"] '
                      {...register('cmdParam')}
                    />
                  </FormControl>

                  <Divider my={'24px'} bg={'myGray.100'} />

                  <Box w={'320px'}>
                    <Box className={styles.formSecondTitle}>环境变量</Box>
                    <table className={styles.table}>
                      {envs.map((env) => (
                        <tr key={env.id}>
                          <th>{env.key}</th>
                          <Tooltip label={env.value}>
                            <th
                              className={styles.textEllipsis}
                              style={{
                                userSelect: 'auto'
                              }}
                            >
                              {env.value}
                            </th>
                          </Tooltip>
                        </tr>
                      ))}
                    </table>
                    <Button
                      mt={4}
                      w={'100%'}
                      variant={'base'}
                      leftIcon={<MyIcon name="edit" />}
                      onClick={onOpenEditEnvs}
                    >
                      编辑境变量
                    </Button>
                  </Box>

                  <Divider my={'24px'} bg={'myGray.100'} />

                  <Box>
                    <Box className={styles.formSecondTitle}>Configmap 配置文件</Box>
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

                    <Button
                      mt={3}
                      onClick={() => setConfigEdit({ mountPath: '', value: '' })}
                      variant={'base'}
                      leftIcon={<MyIcon name="plus" />}
                      w={'320px'}
                    >
                      新增 configmap
                    </Button>
                  </Box>

                  <Divider my={'24px'} bg={'myGray.100'} />

                  <Box>
                    <Flex alignItems={'center'} mb={'10px'}>
                      <Box className={styles.formSecondTitle} m={0}>
                        本地存储
                      </Box>
                      <Tip
                        ml={4}
                        icon={<InfoOutlineIcon />}
                        size="sm"
                        text="多个实例间数据不互通"
                      />
                    </Flex>
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

                    <Button
                      mt={3}
                      onClick={() => setStoreEdit({ path: '', value: 1 })}
                      variant={'base'}
                      leftIcon={<MyIcon name="plus" />}
                      w={'320px'}
                    >
                      新增存储卷
                    </Button>
                  </Box>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          )}
        </Box>
      </Grid>
      {isEditEnvs && (
        <EditEnvs
          defaultVal={envs.map((item) => `${item.key}=${item.value}`).join('\n')}
          onClose={onCloseEditEnvs}
          successCb={(e) => replaceEnvs(e)}
        />
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

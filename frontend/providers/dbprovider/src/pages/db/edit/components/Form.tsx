import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Flex,
  Grid,
  FormControl,
  Input,
  useTheme,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Tooltip
} from '@chakra-ui/react';
import { UseFormReturn } from 'react-hook-form';
import { useRouter } from 'next/router';
import RangeInput from '@/components/RangeInput';
import MySlider from '@/components/Slider';
import MyRangeSlider from '@/components/RangeSlider';
import MyIcon from '@/components/Icon';
import type { QueryType } from '@/types';
import type { DBEditType } from '@/types/db';
import { customAlphabet } from 'nanoid';
import { CpuSlideMarkList, MemorySlideMarkList } from '@/constants/editApp';
import Tabs from '@/components/Tabs';
import MySelect from '@/components/Select';
import { DBTypeList, DBVersionMap } from '@/constants/db';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12);
import styles from './index.module.scss';
import { obj2Query } from '@/api/tools';
import { throttle } from 'lodash';

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
      label: '基础配置',
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
                `/db/edit?${obj2Query({
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
                  {...{
                    fontWeight: 'bold',
                    borderColor: 'myGray.900'
                  }}
                  // {...(activeNav === item.id
                  //   ? {
                  //       fontWeight: 'bold',
                  //       borderColor: 'myGray.900',
                  //       backgroundColor: 'myWhite.600 !important'
                  //     }
                  //   : {
                  //       color: 'myGray.500',
                  //       borderColor: 'myGray.200',
                  //       backgroundColor: 'transparent'
                  //     })}
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
              <Flex alignItems={'center'} mb={7}>
                <Label>集群类型</Label>
                <MySelect
                  isDisabled={isEdit}
                  width={'130px'}
                  placeholder="集群类型"
                  value={getValues('dbType')}
                  list={DBTypeList}
                  onchange={(val: any) => {
                    setValue('dbType', val);
                    setValue('dbVersion', DBVersionMap[getValues('dbType')][0].id);
                  }}
                />
              </Flex>
              <Flex alignItems={'center'} mb={7}>
                <Label>数据库版本</Label>
                <MySelect
                  width={'200px'}
                  placeholder="数据库版本"
                  value={getValues('dbVersion')}
                  list={DBVersionMap[getValues('dbType')]}
                  onchange={(val: any) => setValue('dbVersion', val)}
                />
              </Flex>
              <FormControl mb={7} isInvalid={!!errors.dbName} w={'500px'}>
                <Flex alignItems={'center'}>
                  <Label>集群名称</Label>
                  <Input
                    disabled={isEdit}
                    title={isEdit ? '不允许修改应用名称' : ''}
                    autoFocus={true}
                    {...register('dbName', {
                      required: '应用名称不能为空',
                      pattern: {
                        value: /^[a-z0-9]+([-.][a-z0-9]+)*$/g,
                        message: '应用名只能包含小写字母、数字、-和.'
                      }
                    })}
                  />
                </Flex>
              </FormControl>
              <Flex mb={10} pr={3} alignItems={'flex-start'}>
                <Label w={80}>CPU</Label>
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
              <Flex mb={'50px'} pr={3} alignItems={'center'}>
                <Label w={80}>内存</Label>
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
              <Flex mb={8} alignItems={'center'}>
                <Label>实例数</Label>
                <RangeInput
                  value={getValues('replicas')}
                  min={1}
                  max={20}
                  hoverText={isEdit ? '不支持修改实例数' : '实例数范围：1~20'}
                  disabled={isEdit}
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
                    setValue('replicas', val || 1);
                  }}
                />
              </Flex>
              <FormControl isInvalid={!!errors.dbName} w={'500px'}>
                <Flex alignItems={'center'}>
                  <Label>存储容量</Label>
                  <Tooltip label={`容量范围: ${minStorage}~200 Gi`}>
                    <NumberInput
                      max={200}
                      min={minStorage}
                      step={1}
                      position={'relative'}
                      value={getValues('storage')}
                      onChange={(e) => e && setValue('storage', +e)}
                    >
                      <NumberInputField
                        {...register('storage', {
                          required: '容量不能为空',
                          min: {
                            value: minStorage,
                            message: `容量最为为 ${minStorage} Gi`
                          },
                          max: {
                            value: 200,
                            message: '容量最大为 200 Gi'
                          },
                          valueAsNumber: true
                        })}
                        min={minStorage}
                        max={200}
                      />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                      <Box
                        position={'absolute'}
                        right={10}
                        top={'50%'}
                        transform={'translateY(-50%)'}
                        color={'blackAlpha.600'}
                      >
                        Gi
                      </Box>
                    </NumberInput>
                  </Tooltip>
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

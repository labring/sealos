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
import MyIcon from '@/components/Icon';
import type { QueryType } from '@/types';
import type { DBEditType } from '@/types/db';
import { CpuSlideMarkList, MemorySlideMarkList } from '@/constants/editApp';
import Tabs from '@/components/Tabs';
import MySelect from '@/components/Select';
import { DBTypeList, DBVersionMap } from '@/constants/db';
import { useTranslation } from 'next-i18next';
import PriceBox from './PriceBox';
import { INSTALL_ACCOUNT } from '@/store/static';

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
      label: 'Basic',
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
              { id: 'form', label: 'Config Form' },
              { id: 'yaml', label: 'YAML File' }
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
                  <Box ml={4}>{t(item.label)}</Box>
                </Flex>
              </Box>
            ))}
          </Box>

          {INSTALL_ACCOUNT && (
            <Box mt={3} borderRadius={'sm'} overflow={'hidden'} backgroundColor={'white'} p={3}>
              <PriceBox
                pods={[getValues('replicas') || 1, getValues('replicas') || 1]}
                cpu={getValues('cpu')}
                memory={getValues('memory')}
                storage={getValues('storage')}
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
              {t('Basic')}
            </Box>
            <Box px={'42px'} py={'24px'}>
              <Flex alignItems={'center'} mb={7}>
                <Label w={80}>{t('Type')}</Label>
                <MySelect
                  isDisabled={isEdit}
                  width={'130px'}
                  placeholder={`${t('DataBase')} ${t('Type')}`}
                  value={getValues('dbType')}
                  list={DBTypeList}
                  onchange={(val: any) => {
                    setValue('dbType', val);
                    setValue('dbVersion', DBVersionMap[getValues('dbType')][0].id);
                  }}
                />
              </Flex>
              <Flex alignItems={'center'} mb={7}>
                <Label w={80}>{t('Version')}</Label>
                <MySelect
                  width={'200px'}
                  placeholder={`${t('DataBase')} ${t('Version')}`}
                  value={getValues('dbVersion')}
                  list={DBVersionMap[getValues('dbType')]}
                  onchange={(val: any) => setValue('dbVersion', val)}
                />
              </Flex>
              <FormControl mb={7} isInvalid={!!errors.dbName} w={'500px'}>
                <Flex alignItems={'center'}>
                  <Label w={80}>{t('Name')}</Label>
                  <Input
                    disabled={isEdit}
                    title={isEdit ? t('Cannot Change Name') || '' : ''}
                    autoFocus={true}
                    placeholder={t('DataBase Name Regex') || ''}
                    {...register('dbName', {
                      required: t('DataBase Name Empty') || '',
                      pattern: {
                        value: /^[a-z][a-z0-9]+([-.][a-z0-9]+)*$/g,
                        message: t('DataBase Name Regex Error')
                      }
                    })}
                  />
                </Flex>
              </FormControl>
              <Flex mb={10} pr={3} alignItems={'flex-start'}>
                <Label w={85}>CPU</Label>
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
                <Box ml={5} transform={'translateY(10px)'} color={'myGray.500'}>
                  (Core)
                </Box>
              </Flex>
              <Flex mb={'50px'} pr={3} alignItems={'center'}>
                <Label w={85}>{t('Memory')}</Label>
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
                <Label w={80}>{t('Replicas')}</Label>
                <RangeInput
                  value={getValues('replicas')}
                  min={1}
                  max={20}
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
                    setValue('replicas', val || 1);
                  }}
                />
              </Flex>
              <FormControl isInvalid={!!errors.storage} w={'500px'}>
                <Flex alignItems={'center'}>
                  <Label w={80}>{t('Storage')}</Label>
                  <Tooltip label={`${t('Storage Range')}${minStorage}~200 Gi`}>
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
                          required: t('Storage Cannot Empty') || 'Storage Cannot Empty',
                          min: {
                            value: minStorage,
                            message: `${t('Storage Min')}${minStorage} Gi`
                          },
                          max: {
                            value: 200,
                            message: `${t('Storage Max')}200 Gi`
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
                        zIndex={1}
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

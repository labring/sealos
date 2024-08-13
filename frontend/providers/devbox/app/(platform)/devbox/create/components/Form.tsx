'use client'

import {
  Box,
  Center,
  Flex,
  FormControl,
  Grid,
  Image,
  Input,
  Text,
  useTheme
} from '@chakra-ui/react'
import { throttle } from 'lodash'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UseFormReturn } from 'react-hook-form'
import { MySelect, MySlider, Tabs } from '@sealos/ui'

import MyIcon from '@/components/Icon'
import { obj2Query } from '@/utils/tools'
import PriceBox from '@/components/PriceBox'
import QuotaBox from '@/components/QuotaBox'
import { RuntimeTypeList } from '@/constants/devbox'
import type { DevboxEditType } from '@/types/devbox'
import { INSTALL_ACCOUNT, runtimeVersionMap } from '@/stores/static'
import { CpuSlideMarkList, MemorySlideMarkList } from '@/constants/devbox'

const Form = ({
  formHook,
  pxVal
}: {
  formHook: UseFormReturn<DevboxEditType, any>
  pxVal: number
}) => {
  const theme = useTheme()
  const router = useRouter()
  const navList: { id: string; label: string; icon: string }[] = [
    {
      id: 'baseInfo',
      label: '基础配置',
      icon: 'formInfo'
    }
  ]
  const [activeNav, setActiveNav] = useState(navList[0].id)

  // listen scroll and set activeNav
  useEffect(() => {
    const scrollFn = throttle((e: Event) => {
      if (!e.target) return
      const doms = navList.map((item) => ({
        dom: document.getElementById(item.id),
        id: item.id
      }))

      const dom = e.target as HTMLDivElement
      const scrollTop = dom.scrollTop

      for (let i = doms.length - 1; i >= 0; i--) {
        const offsetTop = doms[i].dom?.offsetTop || 0
        if (scrollTop + 200 >= offsetTop) {
          setActiveNav(doms[i].id)
          break
        }
      }
    }, 200)
    document.getElementById('form-container')?.addEventListener('scroll', scrollFn)
    return () => {
      document.getElementById('form-container')?.removeEventListener('scroll', scrollFn)
    }
    // eslint-disable-next-line
  }, [])

  if (!formHook) return null

  const {
    register,
    setValue,
    getValues,
    formState: { errors }
  } = formHook

  const Label = ({
    children,
    w = 'auto',
    ...props
  }: {
    children: string
    w?: number | 'auto'
    [key: string]: any
  }) => (
    <Box
      flex={`0 0 ${w === 'auto' ? 'auto' : `${w}px`}`}
      color={'grayModern.900'}
      fontWeight={'bold'}
      userSelect={'none'}
      {...props}>
      {children}
    </Box>
  )

  const boxStyles = {
    border: theme.borders.base,
    borderRadius: 'lg',
    mb: 4,
    bg: 'white'
  }

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
  }

  return (
    <>
      <Grid
        height={'100%'}
        templateColumns={'220px 1fr'}
        gridGap={5}
        alignItems={'start'}
        pl={`${pxVal}px`}>
        {/* left sidebar */}
        <Box>
          <Tabs
            list={[
              { id: 'form', label: '配置表单' },
              { id: 'yaml', label: 'YAML文件' }
            ]}
            activeId={'form'}
            onChange={() =>
              router.replace(
                `/devbox/create?${obj2Query({
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
            p={'4px'}>
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
                  backgroundColor={activeNav === item.id ? 'grayModern.100' : 'transparent'}>
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
                  <Box>{item.label}</Box>
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
                    memory: getValues('memory')
                  }
                ]}
              />
            </Box>
          )}
        </Box>
        {/* right content */}
        <Box
          id={'form-container'}
          pr={`${pxVal}px`}
          height={'100%'}
          position={'relative'}
          overflowY={'scroll'}>
          {/* base info */}
          <Box id={'baseInfo'} {...boxStyles}>
            <Box {...headerStyles}>
              <MyIcon name={'formInfo'} mr={5} w={'20px'} color={'grayModern.600'} />
              {'基础配置'}
            </Box>
            <Box px={'42px'} py={'24px'}>
              {/* Devbox Name */}
              <FormControl mb={7} isInvalid={!!errors.devboxName} w={'500px'}>
                <Flex alignItems={'center'}>
                  <Label w={100}>{'项目名称'}</Label>
                  {/* TODO：不知道项目名称的正则怎么整 */}
                  <Input
                    autoFocus={true}
                    placeholder={'请输入项目名称'}
                    {...register('devboxName', {
                      required: '项目名称不能为空'
                    })}
                  />
                </Flex>
              </FormControl>
              {/* Runtime Type */}
              <Flex alignItems={'center'} mb={7}>
                <Label w={100} alignSelf={'flex-start'}>
                  {'运行环境'}
                </Label>
                <Flex flexWrap={'wrap'} gap={'12px'}>
                  {RuntimeTypeList &&
                    RuntimeTypeList?.map((item) => {
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
                          {...(getValues('runtimeType') === item.id
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
                            setValue('runtimeType', item.id)
                            setValue(
                              'runtimeVersion',
                              runtimeVersionMap[getValues('runtimeType')][0].id
                            )
                          }}>
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
                            textAlign={'center'}>
                            {item.label}
                          </Text>
                        </Center>
                      )
                    })}
                </Flex>
              </Flex>
              {/* Runtime Version */}
              <Flex alignItems={'center'} mb={7}>
                <Label w={100}>{'版本'}</Label>
                <MySelect
                  width={'200px'}
                  placeholder={`${'运行时'} ${'版本'}`}
                  value={getValues('runtimeVersion')}
                  list={runtimeVersionMap[getValues('runtimeType')].map((i) => ({
                    label: i.label,
                    value: i.id
                  }))}
                  onchange={(val: any) => setValue('runtimeVersion', val)}
                />
              </Flex>
              {/* CPU */}
              <Flex mb={10} pr={3} alignItems={'flex-start'}>
                <Label w={100}>CPU</Label>
                <MySlider
                  markList={CpuSlideMarkList}
                  activeVal={getValues('cpu')}
                  setVal={(e) => {
                    setValue('cpu', CpuSlideMarkList[e].value)
                  }}
                  max={CpuSlideMarkList.length - 1}
                  min={0}
                  step={1}
                />
                <Box ml={5} transform={'translateY(10px)'} color={'grayModern.600'}>
                  Core
                </Box>
              </Flex>
              {/* Memory */}
              <Flex mb={'50px'} pr={3} alignItems={'center'}>
                <Label w={100}>{'内存'}</Label>
                <MySlider
                  markList={MemorySlideMarkList}
                  activeVal={getValues('memory')}
                  setVal={(e) => {
                    setValue('memory', MemorySlideMarkList[e].value)
                  }}
                  max={MemorySlideMarkList.length - 1}
                  min={0}
                  step={1}
                />
              </Flex>
            </Box>
          </Box>
        </Box>
      </Grid>
    </>
  )
}

export default Form

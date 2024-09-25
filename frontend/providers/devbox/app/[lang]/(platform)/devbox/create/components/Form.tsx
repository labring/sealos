'use client'

import {
  Box,
  Button,
  Center,
  Flex,
  FormControl,
  FormErrorMessage,
  Grid,
  IconButton,
  Image,
  Input,
  Switch,
  Text,
  useTheme
} from '@chakra-ui/react'
import { throttle } from 'lodash'
import dynamic from 'next/dynamic'
import { customAlphabet } from 'nanoid'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { UseFormReturn, useFieldArray } from 'react-hook-form'
import { MySelect, MySlider, Tabs, useMessage } from '@sealos/ui'

import {
  INSTALL_ACCOUNT,
  SEALOS_DOMAIN,
  frameworkTypeList,
  frameworkVersionMap,
  languageTypeList,
  languageVersionMap,
  osTypeList,
  osVersionMap,
  getRuntimeVersionList
} from '@/stores/static'
import { useRouter } from '@/i18n'
import MyIcon from '@/components/Icon'
import PriceBox from '@/components/PriceBox'
import QuotaBox from '@/components/QuotaBox'
import { useDevboxStore } from '@/stores/devbox'
import { ProtocolList } from '@/constants/devbox'
import type { DevboxEditType } from '@/types/devbox'
import { getValueDefault, obj2Query } from '@/utils/tools'
import { CpuSlideMarkList, MemorySlideMarkList } from '@/constants/devbox'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 12)

export type CustomAccessModalParams = {
  publicDomain: string
  customDomain: string
}

const CustomAccessModal = dynamic(() => import('@/components/modals/CustomAccessModal'))

const Form = ({
  formHook,
  pxVal,
  isEdit
}: {
  formHook: UseFormReturn<DevboxEditType, any>
  pxVal: number
  isEdit: boolean
}) => {
  const theme = useTheme()
  const router = useRouter()
  const t = useTranslations()
  const {
    control,
    register,
    setValue,
    getValues,
    formState: { errors }
  } = formHook
  const {
    fields: networks,
    append: appendNetworks,
    remove: removeNetworks,
    update: updateNetworks
  } = useFieldArray({
    control,
    name: 'networks'
  })

  const [customAccessModalData, setCustomAccessModalData] = useState<CustomAccessModalParams>()
  const navList: { id: string; label: string; icon: string }[] = [
    {
      id: 'baseInfo',
      label: t('basic_configuration'),
      icon: 'formInfo'
    },
    {
      id: 'network',
      label: t('Network Configuration'),
      icon: 'network'
    }
  ]
  const { message: toast } = useMessage()
  const [activeNav, setActiveNav] = useState(navList[0].id)
  const { devboxList } = useDevboxStore()

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
        if (scrollTop + 500 >= offsetTop) {
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
              { id: 'form', label: t('config_form') },
              { id: 'yaml', label: t('yaml_file') }
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
              <Box
                key={item.id}
                onClick={() => {
                  setActiveNav(item.id)
                  window.location.hash = item.id
                }}>
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
                    color={activeNav === item.id ? 'myGray.400' : 'grayModern.600'}
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
                    memory: getValues('memory'),
                    nodeports: devboxList.length
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
              {t('basic_configuration')}
            </Box>
            <Box px={'42px'} py={'24px'}>
              {/* Devbox Name */}
              <FormControl mb={7} isInvalid={!!errors.name} minW={'500px'}>
                <Flex alignItems={'center'}>
                  <Label w={100}>{t('devbox_name')}</Label>
                  <Input
                    disabled={isEdit}
                    autoFocus={true}
                    w={'300px'}
                    placeholder={t('enter_devbox_name')}
                    {...register('name', {
                      required: t('devbox_name_required'),
                      maxLength: {
                        value: 63,
                        message: t('devbox_name_max_length')
                      },
                      validate: {
                        pattern: (value) =>
                          /^[a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*$/.test(
                            value
                          ) || t('devbox_name_invalid')
                      }
                    })}
                    onBlur={(e) => {
                      setValue('name', e.target.value)
                      setValue(
                        'networks',
                        getRuntimeVersionList(getValues('runtimeType'))[0].defaultPorts.map(
                          (port) => ({
                            networkName: `${e.target.value}-${nanoid()}`,
                            portName: nanoid(),
                            port: port,
                            protocol: 'HTTP',
                            openPublicDomain: true,
                            publicDomain: nanoid(),
                            customDomain: ''
                          })
                        )
                      )
                    }}
                  />
                  <FormErrorMessage ml={'50px'}>
                    <Box fontSize={'12px'} h={'25px'} w={'100px'}>
                      {errors.name && errors.name.message}
                    </Box>
                  </FormErrorMessage>
                </Flex>
              </FormControl>
              {/* Runtime Type */}
              <Flex alignItems={'center'} mb={7}>
                <Label w={100} alignSelf={'flex-start'}>
                  {t('runtime_environment')}
                </Label>
                <Flex direction={'column'} gap={'10px'}>
                  {/* Language */}
                  {languageTypeList.length !== 0 && <Box>{t('language')}</Box>}
                  <Flex flexWrap={'wrap'} gap={'12px'}>
                    {languageTypeList &&
                      languageTypeList?.map((item) => {
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
                            opacity={isEdit ? 0.5 : 1}
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
                              if (isEdit) return
                              const devboxName = getValues('name')
                              if (!devboxName) {
                                toast({
                                  title: t('Please enter the devbox name first'),
                                  status: 'warning'
                                })
                                return
                              }
                              setValue('runtimeType', item.id)
                              setValue(
                                'runtimeVersion',
                                languageVersionMap[getValues('runtimeType')][0].id
                              )
                              setValue(
                                'networks',
                                languageVersionMap[getValues('runtimeType')][0].defaultPorts.map(
                                  (port) => ({
                                    networkName: `${devboxName}-${nanoid()}`,
                                    portName: nanoid(),
                                    port: port,
                                    protocol: 'HTTP',
                                    openPublicDomain: true,
                                    publicDomain: nanoid(),
                                    customDomain: ''
                                  })
                                )
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
                  {/* framework */}
                  {frameworkTypeList.length !== 0 && <Box>{t('framework')}</Box>}
                  <Flex flexWrap={'wrap'} gap={'12px'}>
                    {frameworkTypeList &&
                      frameworkTypeList?.map((item) => {
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
                            opacity={isEdit ? 0.5 : 1}
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
                              if (isEdit) return
                              const devboxName = getValues('name')
                              if (!devboxName) {
                                toast({
                                  title: t('Please enter the devbox name first'),
                                  status: 'warning'
                                })
                                return
                              }
                              setValue('runtimeType', item.id)
                              setValue(
                                'runtimeVersion',
                                frameworkVersionMap[getValues('runtimeType')][0].id
                              )
                              setValue(
                                'networks',
                                frameworkVersionMap[getValues('runtimeType')][0].defaultPorts.map(
                                  (port) => ({
                                    networkName: `${devboxName}-${nanoid()}`,
                                    portName: nanoid(),
                                    port: port,
                                    protocol: 'HTTP',
                                    openPublicDomain: true,
                                    publicDomain: nanoid(),
                                    customDomain: ''
                                  })
                                )
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
                  {/* os */}
                  {osTypeList.length !== 0 && <Box>{t('os')}</Box>}
                  <Flex flexWrap={'wrap'} gap={'12px'}>
                    {osTypeList &&
                      osTypeList?.map((item) => {
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
                            opacity={isEdit ? 0.5 : 1}
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
                              if (isEdit) return
                              const devboxName = getValues('name')
                              if (!devboxName) {
                                toast({
                                  title: t('Please enter the devbox name first'),
                                  status: 'warning'
                                })
                                return
                              }
                              setValue('runtimeType', item.id)
                              setValue(
                                'runtimeVersion',
                                osVersionMap[getValues('runtimeType')][0].id
                              )
                              setValue(
                                'networks',
                                osVersionMap[getValues('runtimeType')][0].defaultPorts.map(
                                  (port) => ({
                                    networkName: `${devboxName}-${nanoid()}`,
                                    portName: nanoid(),
                                    port: port,
                                    protocol: 'HTTP',
                                    openPublicDomain: true,
                                    publicDomain: nanoid(),
                                    customDomain: ''
                                  })
                                )
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
              </Flex>
              {/* Runtime Version */}
              <Flex alignItems={'center'} mb={7}>
                <Label w={100}>{t('version')}</Label>
                {isEdit ? (
                  <Box opacity={0.5}>{getValues('runtimeVersion')}</Box>
                ) : (
                  <MySelect
                    {...register('runtimeVersion', {
                      required: t('This runtime field is required')
                    })}
                    width={'200px'}
                    placeholder={`${t('runtime')} ${t('version')}`}
                    defaultValue={
                      getValues('runtimeVersion') || getValueDefault(getValues('runtimeType'))
                    }
                    value={getValues('runtimeVersion')}
                    list={getRuntimeVersionList(getValues('runtimeType'))}
                    onchange={(val: any) => {
                      if (isEdit) return
                      const devboxName = getValues('name')
                      if (!devboxName) {
                        toast({
                          title: t('Please enter the devbox name first'),
                          status: 'warning'
                        })
                        return
                      }
                      setValue('runtimeVersion', val)
                      setValue(
                        'networks',
                        getRuntimeVersionList(getValues('runtimeType'))[0].defaultPorts.map(
                          (port) => ({
                            networkName: `${devboxName}-${nanoid()}`,
                            portName: nanoid(),
                            port: port,
                            protocol: 'HTTP',
                            openPublicDomain: true,
                            publicDomain: nanoid(),
                            customDomain: ''
                          })
                        )
                      )
                    }}
                  />
                )}
              </Flex>
              {/* CPU */}
              <Flex mb={10} pr={3} alignItems={'flex-start'}>
                <Label w={100}>{t('cpu')}</Label>
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
                  {t('core')}
                </Box>
              </Flex>
              {/* Memory */}
              <Flex mb={'50px'} pr={3} alignItems={'center'}>
                <Label w={100}>{t('memory')}</Label>
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
          {/* network */}
          <Box id={'network'} {...boxStyles}>
            <Box {...headerStyles}>
              <MyIcon name={'network'} mr={'12px'} w={'24px'} color={'grayModern.900'} />
              {t('Network Configuration')}
            </Box>
            <Box px={'42px'} py={'24px'} userSelect={'none'}>
              {networks.length === 0 && (
                <Button
                  w={'100px'}
                  variant={'outline'}
                  leftIcon={<MyIcon name="plus" w={'18px'} fill={'#485264'} />}
                  onClick={() =>
                    appendNetworks({
                      networkName: '',
                      portName: nanoid(),
                      port: 8080,
                      protocol: 'HTTP',
                      openPublicDomain: false,
                      publicDomain: '',
                      customDomain: ''
                    })
                  }>
                  {t('Add Port')}
                </Button>
              )}
              {networks.map((network, i) => (
                <Flex
                  alignItems={'flex-start'}
                  key={network.id}
                  _notLast={{ pb: 6, borderBottom: theme.borders.base }}
                  _notFirst={{ pt: 6 }}>
                  <Box>
                    <Box mb={'10px'} h={'20px'} fontSize={'base'} color={'grayModern.900'}>
                      {t('Container Port')}
                    </Box>
                    <Input
                      h={'32px'}
                      type={'number'}
                      w={'110px'}
                      bg={'grayModern.50'}
                      {...register(`networks.${i}.port`, {
                        valueAsNumber: true,
                        min: {
                          value: 1,
                          message: t('The minimum exposed port is 1')
                        },
                        max: {
                          value: 65535,
                          message: t('The maximum number of exposed ports is 65535')
                        }
                      })}
                    />
                    {i === networks.length - 1 && networks.length < 5 && (
                      <Box mt={3}>
                        <Button
                          w={'100px'}
                          variant={'outline'}
                          leftIcon={<MyIcon name="plus" w={'18px'} fill={'#485264'} />}
                          onClick={() =>
                            appendNetworks({
                              networkName: '',
                              portName: nanoid(),
                              port: 8080,
                              protocol: 'HTTP',
                              openPublicDomain: false,
                              publicDomain: '',
                              customDomain: ''
                            })
                          }>
                          {t('Add Port')}
                        </Button>
                      </Box>
                    )}
                  </Box>
                  <Box mx={7}>
                    <Box mb={'8px'} h={'20px'} fontSize={'base'} color={'grayModern.900'}>
                      {t('Open Public Access')}
                    </Box>
                    <Flex alignItems={'center'} h={'35px'}>
                      <Switch
                        className="driver-deploy-network-switch"
                        size={'lg'}
                        isChecked={!!network.openPublicDomain}
                        onChange={(e) => {
                          const devboxName = getValues('name')
                          if (!devboxName) {
                            toast({
                              title: t('Please enter the devbox name first'),
                              status: 'warning'
                            })
                            return
                          }
                          updateNetworks(i, {
                            ...getValues('networks')[i],
                            networkName: network.networkName || `${devboxName}-${nanoid()}`,
                            protocol: network.protocol || 'HTTP',
                            openPublicDomain: e.target.checked,
                            publicDomain: network.publicDomain || nanoid()
                          })
                        }}
                      />
                    </Flex>
                  </Box>
                  {network.openPublicDomain && (
                    <>
                      <Box flex={'1 0 0'}>
                        <Box mb={'8px'} h={'20px'}></Box>
                        <Flex alignItems={'center'} h={'35px'}>
                          <MySelect
                            width={'100px'}
                            height={'32px'}
                            borderTopRightRadius={0}
                            borderBottomRightRadius={0}
                            value={network.protocol}
                            // border={theme.borders.base}
                            list={ProtocolList}
                            onchange={(val: any) => {
                              updateNetworks(i, {
                                ...getValues('networks')[i],
                                protocol: val
                              })
                            }}
                          />
                          <Flex
                            maxW={'350px'}
                            flex={'1 0 0'}
                            alignItems={'center'}
                            h={'32px'}
                            bg={'grayModern.50'}
                            px={2}
                            border={theme.borders.base}
                            borderLeft={0}
                            borderTopRightRadius={'md'}
                            borderBottomRightRadius={'md'}>
                            <Box flex={1} userSelect={'all'} className="textEllipsis">
                              {network.customDomain
                                ? network.customDomain
                                : `${network.publicDomain}.${SEALOS_DOMAIN}`}
                            </Box>
                            <Box
                              fontSize={'11px'}
                              color={'brightBlue.600'}
                              cursor={'pointer'}
                              onClick={() =>
                                setCustomAccessModalData({
                                  publicDomain: network.publicDomain,
                                  customDomain: network.customDomain
                                })
                              }>
                              {t('Custom Domain')}
                            </Box>
                          </Flex>
                        </Flex>
                      </Box>
                    </>
                  )}
                  {networks.length >= 1 && (
                    <Box ml={3}>
                      <Box mb={'8px'} h={'20px'}></Box>
                      <IconButton
                        height={'32px'}
                        width={'32px'}
                        aria-label={'button'}
                        variant={'outline'}
                        bg={'#FFF'}
                        _hover={{
                          color: 'red.600',
                          bg: 'rgba(17, 24, 36, 0.05)'
                        }}
                        icon={<MyIcon name={'delete'} w={'16px'} fill={'#485264'} />}
                        onClick={() => removeNetworks(i)}
                      />
                    </Box>
                  )}
                </Flex>
              ))}
            </Box>
          </Box>
          {!!customAccessModalData && (
            <CustomAccessModal
              {...customAccessModalData}
              onClose={() => setCustomAccessModalData(undefined)}
              onSuccess={(e) => {
                const i = networks.findIndex(
                  (item) => item.publicDomain === customAccessModalData.publicDomain
                )
                if (i === -1) return
                updateNetworks(i, {
                  ...networks[i],
                  customDomain: e
                })

                setCustomAccessModalData(undefined)
              }}
            />
          )}
        </Box>
      </Grid>
    </>
  )
}

export default Form

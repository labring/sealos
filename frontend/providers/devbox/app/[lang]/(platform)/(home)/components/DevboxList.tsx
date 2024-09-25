import {
  Box,
  Button,
  Center,
  Flex,
  Image,
  MenuButton,
  useTheme,
  Text,
  Tooltip,
  Menu,
  MenuList,
  MenuItem,
  IconButton
} from '@chakra-ui/react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'
import { sealosApp } from 'sealos-desktop-sdk/app'
import { SealosMenu, MyTable, useMessage } from '@sealos/ui'

import {
  getSSHConnectionInfo,
  getSSHRuntimeInfo,
  pauseDevbox,
  restartDevbox,
  startDevbox
} from '@/api/devbox'
import { useRouter } from '@/i18n'
import MyIcon from '@/components/Icon'
import { IDEType, useGlobalStore } from '@/stores/global'
import { DevboxListItemType } from '@/types/devbox'
import PodLineChart from '@/components/PodLineChart'
import DevboxStatusTag from '@/components/DevboxStatusTag'
import { NAMESPACE, SEALOS_DOMAIN } from '@/stores/static'
import ReleaseModal from '@/components/modals/releaseModal'

const DelModal = dynamic(() => import('@/components/modals/DelModal'))

const DevboxList = ({
  devboxList = [],
  refetchDevboxList
}: {
  devboxList: DevboxListItemType[]
  refetchDevboxList: () => void
}) => {
  const theme = useTheme()
  const router = useRouter()
  const t = useTranslations()
  const { message: toast } = useMessage()
  const { setLoading, setCurrentIDE, currentIDE } = useGlobalStore()
  const [onOpenRelease, setOnOpenRelease] = useState(false)
  const [delDevbox, setDelDevbox] = useState<DevboxListItemType | null>(null)
  const [currentDevboxListItem, setCurrentDevboxListItem] = useState<DevboxListItemType | null>(
    null
  )

  const handleOpenRelease = (devbox: DevboxListItemType) => {
    setCurrentDevboxListItem(devbox)
    setOnOpenRelease(true)
  }

  const handlePauseDevbox = useCallback(
    async (devbox: DevboxListItemType) => {
      try {
        setLoading(true)
        await pauseDevbox({ devboxName: devbox.name })
        toast({
          title: t('pause_success'),
          status: 'success'
        })
      } catch (error: any) {
        toast({
          title: typeof error === 'string' ? error : error.message || t('pause_error'),
          status: 'error'
        })
        console.error(error)
      }
      setLoading(false)
      refetchDevboxList()
    },
    [refetchDevboxList, setLoading, t, toast]
  )
  const handleRestartDevbox = useCallback(
    async (devbox: DevboxListItemType) => {
      try {
        setLoading(true)
        await restartDevbox({ devboxName: devbox.name })
        toast({
          title: t('restart_success'),
          status: 'success'
        })
      } catch (error: any) {
        toast({
          title: typeof error === 'string' ? error : error.message || t('restart_error'),
          status: 'error'
        })
        console.error(error, '==')
      }
      setLoading(false)
    },
    [setLoading, t, toast]
  )
  const handleStartDevbox = useCallback(
    async (devbox: DevboxListItemType) => {
      try {
        setLoading(true)
        await startDevbox({ devboxName: devbox.name })
        toast({
          title: t('start_success'),
          status: 'success'
        })
      } catch (error: any) {
        toast({
          title: typeof error === 'string' ? error : error.message || t('start_error'),
          status: 'error'
        })
        console.error(error, '==')
      }
      setLoading(false)
    },
    [setLoading, t, toast]
  )

  const getCurrentIDELabelAndIcon = useCallback(
    (
      currentIDE: IDEType
    ): {
      label: string
      icon: IDEType
    } => {
      switch (currentIDE) {
        case 'vscode':
          return {
            label: 'VSCode',
            icon: 'vscode'
          }
        case 'cursor':
          return {
            label: 'Cursor',
            icon: 'cursor'
          }
        case 'vscodeInsider':
          return {
            label: 'VSCode Insider',
            icon: 'vscodeInsider'
          }
        default:
          return {
            label: 'VSCode',
            icon: 'vscode'
          }
      }
    },
    []
  )

  const handleGoToTerminal = useCallback(
    async (devbox: DevboxListItemType) => {
      const defaultCommand = `kubectl exec -it $(kubectl get po -l app.kubernetes.io/name=${devbox.name} -oname) -- sh -c "clear; (bash || ash || sh)"`
      try {
        sealosApp.runEvents('openDesktopApp', {
          appKey: 'system-terminal',
          query: {
            defaultCommand
          },
          messageData: { type: 'new terminal', command: defaultCommand }
        })
      } catch (error: any) {
        toast({
          title: typeof error === 'string' ? error : error.message || t('jump_terminal_error'),
          status: 'error'
        })
        console.error(error)
      }
      refetchDevboxList()
    },
    [refetchDevboxList, t, toast]
  )

  const handleGotoIDE = useCallback(
    async (devbox: DevboxListItemType, currentIDE: string = 'vscode') => {
      try {
        const { base64PrivateKey, userName } = await getSSHConnectionInfo({
          devboxName: devbox.name,
          runtimeName: devbox.runtimeVersion
        })
        const { workingDir } = await getSSHRuntimeInfo(devbox.runtimeVersion)

        let editorUri = ''
        switch (currentIDE) {
          case 'cursor':
            editorUri = `cursor://`
            break
          case 'vscodeInsider':
            editorUri = `vscode-insiders://`
            break
          case 'vscode':
            editorUri = `vscode://`
            break
          default:
            editorUri = `vscode://`
        }

        const fullUri = `${editorUri}mlhiter.devbox-sealos?sshDomain=${encodeURIComponent(
          `${userName}@${SEALOS_DOMAIN}`
        )}&sshPort=${encodeURIComponent(devbox.sshPort)}&base64PrivateKey=${encodeURIComponent(
          base64PrivateKey
        )}&sshHostLabel=${encodeURIComponent(
          `${SEALOS_DOMAIN}/${NAMESPACE}/${devbox.name}`
        )}&workingDir=${encodeURIComponent(workingDir)}`

        window.location.href = fullUri
      } catch (error: any) {
        console.error(error, '==')
      }
    },
    []
  )

  const columns: {
    title: string
    dataIndex?: keyof DevboxListItemType
    key: string
    render?: (item: DevboxListItemType) => JSX.Element
  }[] = [
    {
      title: t('name'),
      key: 'name',
      render: (item: DevboxListItemType) => {
        return (
          <Flex alignItems={'center'} gap={'6px'} ml={4}>
            <Image
              width={'20px'}
              height={'20px'}
              alt={item.id}
              src={`/images/${item.runtimeType}.svg`}
            />
            <Box color={'grayModern.900'} fontSize={'md'}>
              {item.name}
            </Box>
          </Flex>
        )
      }
    },
    {
      title: t('status'),
      key: 'status',
      render: (item: DevboxListItemType) => <DevboxStatusTag status={item.status} h={'27px'} />
    },
    {
      title: t('create_time'),
      dataIndex: 'createTime',
      key: 'createTime',
      render: (item: DevboxListItemType) => {
        return <Text color={'grayModern.600'}>{item.createTime}</Text>
      }
    },
    {
      title: t('cpu'),
      key: 'cpu',
      render: (item: DevboxListItemType) => (
        <Box h={'35px'} w={['120px', '130px', '140px']}>
          <Box h={'35px'} w={['120px', '130px', '140px']} position={'absolute'}>
            <PodLineChart type="blue" data={item.usedCpu} />
            <Text
              color={'#0077A9'}
              fontSize={'sm'}
              fontWeight={'bold'}
              position={'absolute'}
              right={'4px'}
              bottom={'0px'}
              pointerEvents={'none'}
              textShadow="1px 1px 0 #FFF, -1px -1px 0 #FFF, 1px -1px 0 #FFF, -1px 1px 0 #FFF">
              {item?.usedCpu?.yData[item?.usedCpu?.yData?.length - 1]}%
            </Text>
          </Box>
        </Box>
      )
    },
    {
      title: t('memory'),
      key: 'storage',
      render: (item: DevboxListItemType) => (
        <Box h={'35px'} w={['120px', '130px', '140px']}>
          <Box h={'35px'} w={['120px', '130px', '140px']} position={'absolute'}>
            <PodLineChart type="purple" data={item.usedMemory} />
            <Text
              color={'#6F5DD7'}
              fontSize={'sm'}
              fontWeight={'bold'}
              position={'absolute'}
              right={'4px'}
              bottom={'0px'}
              pointerEvents={'none'}
              textShadow="1px 1px 0 #FFF, -1px -1px 0 #FFF, 1px -1px 0 #FFF, -1px 1px 0 #FFF">
              {item?.usedMemory?.yData[item?.usedMemory?.yData?.length - 1]}%
            </Text>
          </Box>
        </Box>
      )
    },
    {
      title: t('control'),
      key: 'control',
      render: (item: DevboxListItemType) => (
        <Flex>
          <Tooltip label={t('ide_tooltip')} hasArrow bg={'#FFFFFF'} color={'grayModern.900'}>
            <Button
              height={'32px'}
              size={'sm'}
              fontSize={'base'}
              bg={'grayModern.150'}
              color={'grayModern.900'}
              _hover={{
                color: 'brightBlue.600'
              }}
              borderRightWidth={0}
              borderRightRadius={0}
              onClick={() => handleGotoIDE(item, currentIDE)}
              leftIcon={<MyIcon name={getCurrentIDELabelAndIcon(currentIDE).icon} w={'16px'} />}
              isDisabled={item.status.value !== 'Running'}>
              {getCurrentIDELabelAndIcon(currentIDE).label}
            </Button>
          </Tooltip>
          <Menu placement="bottom-end" isLazy>
            <MenuButton
              height={'32px'}
              bg={'grayModern.150'}
              color={'grayModern.600'}
              _hover={{
                color: 'brightBlue.600'
              }}
              mr={6}
              p={2}
              borderLeftRadius={0}
              borderLeftWidth={0}
              boxShadow={
                '2px 1px 2px 0px rgba(19, 51, 107, 0.05),0px 0px 1px 0px rgba(19, 51, 107, 0.08)'
              }
              as={IconButton}
              isDisabled={item.status.value !== 'Running'}
              icon={<MyIcon name={'chevronDown'} w={'16px'} h={'16px'} />}
              _before={{
                content: '""',
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                width: '1px',
                height: '20px',
                backgroundColor: 'grayModern.250'
              }}
            />
            <MenuList
              color={'grayModern.600'}
              fontWeight={500}
              fontSize={'12px'}
              defaultValue={currentIDE}
              px={1}>
              {[
                { value: 'vscode' as IDEType, label: 'VSCode' },
                { value: 'cursor' as IDEType, label: 'Cursor' },
                { value: 'vscodeInsider' as IDEType, label: 'VSCode Insider' }
              ].map((item) => (
                <MenuItem
                  key={item.value}
                  value={item.value}
                  onClick={() => setCurrentIDE(item.value)}
                  icon={<MyIcon name={item.value} w={'16px'} />}
                  _hover={{
                    bg: '#1118240D',
                    borderRadius: 4
                  }}
                  _focus={{
                    bg: '#1118240D',
                    borderRadius: 4
                  }}>
                  <Flex justifyContent="space-between" alignItems="center" width="100%">
                    {item.label}
                    {currentIDE === item.value && <MyIcon name="check" w={'16px'} />}
                  </Flex>
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
          <Button
            mr={5}
            height={'32px'}
            size={'sm'}
            fontSize={'base'}
            bg={'grayModern.150'}
            color={'grayModern.900'}
            _hover={{
              color: 'brightBlue.600'
            }}
            leftIcon={<MyIcon name={'detail'} w={'16px'} />}
            onClick={() => {
              router.push(`/devbox/detail/${item.name}`)
            }}>
            {t('detail')}
          </Button>
          <SealosMenu
            width={100}
            Button={
              <MenuButton as={Button} variant={'square'} w={'30px'} h={'30px'}>
                <MyIcon name={'more'} />
              </MenuButton>
            }
            menuList={[
              {
                child: (
                  <>
                    <MyIcon name={'version'} w={'16px'} />
                    <Box ml={2}>{t('publish')}</Box>
                  </>
                ),
                onClick: () => handleOpenRelease(item)
              },
              {
                child: (
                  <>
                    <MyIcon name={'terminal'} w={'16px'} />
                    <Box ml={2}>{t('terminal')}</Box>
                  </>
                ),
                onClick: () => handleGoToTerminal(item),
                menuItemStyle: {
                  borderBottomLeftRadius: '0px',
                  borderBottomRightRadius: '0px',
                  borderBottom: '1px solid #F0F1F6'
                }
              },
              {
                child: (
                  <>
                    <MyIcon name={'change'} w={'16px'} />
                    <Box ml={2}>{t('update')}</Box>
                  </>
                ),
                onClick: () => router.push(`/devbox/create?name=${item.name}`)
              },
              ...(item.status.value === 'Stopped'
                ? [
                    {
                      child: (
                        <>
                          <MyIcon name={'start'} w={'16px'} />
                          <Box ml={2}>{t('boot')}</Box>
                        </>
                      ),
                      onClick: () => handleStartDevbox(item)
                    }
                  ]
                : []),
              // maybe Error or other status,all can restart
              ...(item.status.value !== 'Stopped'
                ? [
                    {
                      child: (
                        <>
                          <MyIcon name={'restart'} w={'16px'} />
                          <Box ml={2}>{t('restart')}</Box>
                        </>
                      ),
                      onClick: () => handleRestartDevbox(item)
                    }
                  ]
                : []),
              ...(item.status.value === 'Running'
                ? [
                    {
                      child: (
                        <>
                          <MyIcon name={'shutdown'} w={'16px'} />
                          <Box ml={2}>{t('shutdown')}</Box>
                        </>
                      ),
                      onClick: () => handlePauseDevbox(item)
                    }
                  ]
                : []),
              {
                child: (
                  <>
                    <MyIcon name={'delete'} w={'16px'} />
                    <Box ml={2}>{t('delete')}</Box>
                  </>
                ),
                menuItemStyle: {
                  _hover: {
                    color: 'red.600',
                    bg: 'rgba(17, 24, 36, 0.05)'
                  }
                },
                onClick: () => setDelDevbox(item)
              }
            ]}
          />
        </Flex>
      )
    }
  ]

  return (
    <Box backgroundColor={'grayModern.100'} px={'32px'} minH="100vh">
      <Flex h={'90px'} alignItems={'center'}>
        <Center
          mr={'16px'}
          width={'46px'}
          bg={'#FFF'}
          height={'46px'}
          border={theme.borders.base}
          borderRadius={'md'}>
          <MyIcon name="logo" w={'30px'} h={'30px'} />
        </Center>
        <Box fontSize={'xl'} color={'grayModern.900'} fontWeight={'bold'}>
          {t('devbox_list')}
        </Box>
        <Box ml={'8px'} fontSize={'md'} fontWeight={'bold'} color={'grayModern.500'}>
          ( {devboxList.length} )
        </Box>
        <Box flex={1}></Box>
        <Button
          minW={'156px'}
          h={'40px'}
          variant={'solid'}
          leftIcon={<MyIcon name={'plus'} w={'20px'} fill={'#ffffff'} />}
          onClick={() => router.push('/devbox/create')}>
          {t('create_devbox')}
        </Button>
      </Flex>
      <MyTable columns={columns} data={devboxList} />
      {!!delDevbox && (
        <DelModal
          devbox={delDevbox}
          onClose={() => setDelDevbox(null)}
          onSuccess={refetchDevboxList}
        />
      )}
      {!!onOpenRelease && !!currentDevboxListItem && (
        <ReleaseModal
          onSuccess={() => {
            router.push(`/devbox/detail/${currentDevboxListItem?.name}`)
          }}
          onClose={() => {
            setOnOpenRelease(false)
            setCurrentDevboxListItem(null)
          }}
          devbox={currentDevboxListItem}
        />
      )}
    </Box>
  )
}

export default DevboxList

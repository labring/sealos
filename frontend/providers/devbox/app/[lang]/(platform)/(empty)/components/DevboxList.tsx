import {
  Box,
  Button,
  Center,
  Flex,
  Image,
  MenuButton,
  useTheme,
  Text,
  useDisclosure
} from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { SealosMenu, MyTable, useMessage } from '@sealos/ui'

import Version from './Version'
import dynamic from 'next/dynamic'
import MyIcon from '@/components/Icon'
import { useGlobalStore } from '@/stores/global'
import { DevboxListItemType } from '@/types/devbox'
import PodLineChart from '@/components/PodLineChart'
import DevboxStatusTag from '@/components/DevboxStatusTag'
import { restartDevbox } from '@/api/devbox'

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
  const { setLoading } = useGlobalStore()
  const [delDevbox, setDelDevbox] = useState<DevboxListItemType | null>(null)
  const [currentDevboxListItem, setCurrentDevboxListItem] = useState<DevboxListItemType | null>(
    null
  )
  const { isOpen: isOpenVersion, onOpen: onOpenVersion, onClose: onCloseVersion } = useDisclosure()

  const handleOpenVersion = (item: DevboxListItemType) => {
    setCurrentDevboxListItem(item)
    onOpenVersion()
  }

  const handlePauseDevbox = (item: DevboxListItemType) => {
    console.log('pause devbox', item)
  }
  const handleRestartDevbox = useCallback(
    async (devbox: DevboxListItemType) => {
      try {
        setLoading(true)
        await restartDevbox({ devboxId: devbox.id })
        toast({
          title: t('restart_success'),
          status: 'success'
        })
      } catch (error: any) {
        toast({
          title: typeof error === 'string' ? error : error.message || t('restart_success'),
          status: 'error'
        })
        console.error(error, '==')
      }
      setLoading(false)
    },
    [setLoading, t, toast]
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
          <Flex alignItems={'center'} gap={'6px'}>
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
      render: (item: DevboxListItemType) => <DevboxStatusTag status={item.status} />
    },
    {
      title: t('create_time'),
      dataIndex: 'createTime',
      key: 'createTime'
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
            // TODO: 这里要加上跳转vscode逻辑
            onClick={() => {}}>
            {t('open_vscode')}
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
                    <MyIcon name={'codeServer'} w={'16px'} />
                    <Box ml={2}>{t('code_server')}</Box>
                  </>
                ),
                onClick: () => {} // TODO： 添加跳转code server逻辑
              },
              {
                child: (
                  <>
                    <MyIcon name={'version'} w={'16px'} />
                    <Box ml={2}>{t('version')}</Box>
                  </>
                ),
                onClick: () => handleOpenVersion(item)
              },
              {
                child: (
                  <>
                    <MyIcon name={'terminal'} w={'16px'} />
                    <Box ml={2}>{t('terminal')}</Box>
                  </>
                ),
                onClick: () => {} // TODO: 添加跳转终端逻辑
              },
              {
                child: (
                  <>
                    <MyIcon name={'pause'} w={'16px'} />
                    <Box ml={2}>{t('pause')}</Box>
                  </>
                ),
                // TODO：启停禁用逻辑
                onClick: () => handlePauseDevbox(item)
              },
              {
                child: (
                  <>
                    <MyIcon name={'restart'} w={'16px'} />
                    <Box ml={2}>{t('restart')}</Box>
                  </>
                ),
                onClick: () => handleRestartDevbox(item)
              },
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
          leftIcon={<MyIcon name={'plus'} w={'20px'} />}
          onClick={() => router.push('/devbox/create')}>
          {t('create_devbox')}
        </Button>
      </Flex>
      <MyTable columns={columns} data={devboxList} />
      {!!currentDevboxListItem && (
        <Version
          onClose={onCloseVersion}
          isOpen={isOpenVersion}
          devboxId={currentDevboxListItem.id}
        />
      )}
      {!!delDevbox && (
        <DelModal
          devbox={delDevbox}
          onClose={() => setDelDevbox(null)}
          onSuccess={refetchDevboxList}
        />
      )}
    </Box>
  )
}

export default DevboxList

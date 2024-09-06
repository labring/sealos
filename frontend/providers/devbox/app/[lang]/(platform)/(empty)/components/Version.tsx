import {
  Box,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Flex,
  Center,
  Button,
  MenuButton,
  useDisclosure
} from '@chakra-ui/react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { sealosApp } from 'sealos-desktop-sdk/app'
import { SealosMenu, useMessage } from '@sealos/ui'

import MyIcon from '@/components/Icon'
import MyTable from '@/components/MyTable'
import { useLoading } from '@/hooks/useLoading'
import { useDevboxStore } from '@/stores/devbox'
import { delDevboxVersionByName } from '@/api/devbox'
import { NAMESPACE, REGISTRY_ADDR } from '@/stores/static'
import { DevboxListItemType, DevboxVersionListItemType } from '@/types/devbox'

const ReleaseModal = dynamic(() => import('@/components/modals/releaseModal'))
const EditVersionDesModal = dynamic(() => import('@/components/modals/EditVersionDesModal'))

const Version = ({
  isOpen,
  onClose,
  devbox
}: {
  isOpen: boolean
  onClose: () => void
  devbox: DevboxListItemType
}) => {
  const t = useTranslations()
  const { Loading, setIsLoading } = useLoading()
  const { message: toast } = useMessage()
  const [initialized, setInitialized] = useState(false)
  const [onOpenRelease, setOnOpenRelease] = useState(false)
  const [currentVersion, setCurrentVersion] = useState<DevboxVersionListItemType | null>(null)
  const { devboxVersionList, setDevboxVersionList } = useDevboxStore()
  const { isOpen: isOpenEdit, onOpen: onOpenEdit, onClose: onCloseEdit } = useDisclosure()

  const { refetch } = useQuery(['initDevboxVersionList'], () => setDevboxVersionList(devbox.name), {
    refetchInterval: 3000,
    onSettled() {
      setInitialized(true)
    }
  })

  const handleDelDevboxVersion = useCallback(
    async (versionName: string) => {
      try {
        setIsLoading(true)
        await delDevboxVersionByName(versionName)
        toast({
          title: t('delete_successful'),
          status: 'success'
        })
      } catch (error: any) {
        toast({
          title: typeof error === 'string' ? error : error.message || t('delete_failed'),
          status: 'error'
        })
        console.error(error)
      }
      setIsLoading(false)
    },
    [setIsLoading, toast, t]
  )

  const handleOnline = useCallback(
    (version: DevboxVersionListItemType) => {
      sealosApp.runEvents('openDesktopApp', {
        appKey: 'system-applaunchpad',
        pathname: '/app/edit',
        query: { imageName: `sealos.hub/${NAMESPACE}/${devbox.name}:${version.tag}` },
        messageData: {
          type: 'InternalAppCall',
          formData: { imageName: `sealos.hub/${NAMESPACE}/${devbox.name}:${version.tag}` }
        }
      })
    },
    [devbox.name]
  )

  const columns: {
    title: string
    dataIndex?: keyof DevboxVersionListItemType
    key: string
    render?: (item: DevboxVersionListItemType) => JSX.Element
    minWidth?: string
  }[] = [
    {
      title: t('version_number'),
      key: 'tag',
      render: (item: DevboxVersionListItemType) => (
        <Box color={'grayModern.900'} pl={'12px'}>
          {item.tag}
        </Box>
      )
    },
    {
      title: t('create_time'),
      dataIndex: 'createTime',
      key: 'createTime'
    },
    {
      title: t('version_description'),
      key: 'description',
      render: (item: DevboxVersionListItemType) => (
        <Flex alignItems="center" className="hover-container">
          <Box
            color={'grayModern.900'}
            overflow={'hidden'}
            textOverflow={'ellipsis'}
            whiteSpace={'nowrap'}
            w={'250px'}>
            {item.description}
          </Box>
          <Box ml={'1px'} className="hover-button" display={'none'}>
            <MyIcon
              name="edit"
              w={'16px'}
              color={'grayModern.600'}
              onClick={() => {
                setCurrentVersion(item)
                onOpenEdit()
              }}
            />
          </Box>
        </Flex>
      ),
      minWidth: '300px'
    },
    {
      title: t('control'),
      key: 'control',
      render: (item: DevboxVersionListItemType) => (
        <Flex>
          <Button
            mr={5}
            height={'32px'}
            w={'50px'}
            size={'sm'}
            fontSize={'base'}
            bg={'grayModern.150'}
            color={'grayModern.900'}
            _hover={{
              color: 'brightBlue.600'
            }}
            onClick={() => handleOnline(item)}>
            {t('online')}
          </Button>
          <SealosMenu
            width={100}
            Button={
              <MenuButton as={Button} variant={'square'} w={'30px'} h={'30px'}>
                <MyIcon name={'more'} color={'grayModern.600'} />
              </MenuButton>
            }
            menuList={[
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
                onClick: () => handleDelDevboxVersion(item.name)
              }
            ]}
          />
        </Flex>
      )
    }
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} lockFocusAcrossFrames={false}>
      <ModalOverlay />
      <ModalContent minW={'900px'}>
        <ModalHeader display={'flex'} alignItems={'center'}>
          <Box flex={1}>{t('version_history')}</Box>
          <ModalCloseButton top={'10px'} right={'10px'} />
        </ModalHeader>
        <ModalBody>
          <Box px={'32px'} minH={'500px'}>
            <Flex h={'90px'} alignItems={'center'}>
              <Center mr={'10px'} height={'46px'}>
                <MyIcon name="pods" w={'20px'} h={'20px'} />
              </Center>
              <Box fontSize={'md'} color={'grayModern.900'} fontWeight={'bold'}>
                {t('version_list')}
              </Box>
              <Box
                w={'2px'}
                h={'24px'}
                bg={'grayModern.200'}
                mx={'16px'}
                my={'8px'}
                borderRadius={'base'}
              />
              <Box>{`${t('image_name')}:`}</Box>
              <Box ml={'8px'} fontSize={'md'} fontWeight={'bold'} color={'grayModern.500'}>
                {`${REGISTRY_ADDR}/${NAMESPACE}/${devbox.name}`}
              </Box>
              <Box flex={1}></Box>
              <Button
                minW={'100px'}
                h={'35px'}
                variant={'solid'}
                onClick={() => setOnOpenRelease(true)}>
                {t('release_version')}
              </Button>
            </Flex>
            <Loading loading={!initialized} />
            {/* TODO: 这里美化一下 */}
            {devboxVersionList.length === 0 && initialized ? (
              <Box>{t('no_versions')}</Box>
            ) : (
              <>
                <MyTable columns={columns} data={devboxVersionList} />
              </>
            )}
          </Box>
          {!!currentVersion && (
            <EditVersionDesModal
              version={currentVersion}
              onSuccess={refetch}
              isOpen={isOpenEdit}
              onClose={onCloseEdit}
            />
          )}
          {!!onOpenRelease && (
            <ReleaseModal
              onSuccess={refetch}
              onClose={() => {
                setOnOpenRelease(false)
              }}
              devbox={devbox}
            />
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default Version

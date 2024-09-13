import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { sealosApp } from 'sealos-desktop-sdk/app'
import { SealosMenu, useMessage } from '@sealos/ui'
import { Box, Button, Flex, MenuButton, Text, useDisclosure } from '@chakra-ui/react'

import MyIcon from '@/components/Icon'
import MyTable from '@/components/MyTable'
import { useLoading } from '@/hooks/useLoading'
import { useDevboxStore } from '@/stores/devbox'
import { delDevboxVersionByName } from '@/api/devbox'
import DevboxStatusTag from '@/components/DevboxStatusTag'
import { NAMESPACE, REGISTRY_ADDR } from '@/stores/static'
import { DevboxVersionListItemType } from '@/types/devbox'
import ReleaseModal from '@/components/modals/releaseModal'
import EditVersionDesModal from '@/components/modals/EditVersionDesModal'

const Version = () => {
  const t = useTranslations()
  const { devboxDetail: devbox } = useDevboxStore()
  const { message: toast } = useMessage()
  const { Loading, setIsLoading } = useLoading()
  const [initialized, setInitialized] = useState(false)
  const [onOpenRelease, setOnOpenRelease] = useState(false)
  const { devboxVersionList, setDevboxVersionList } = useDevboxStore()
  const { isOpen: isOpenEdit, onOpen: onOpenEdit, onClose: onCloseEdit } = useDisclosure()
  const [currentVersion, setCurrentVersion] = useState<DevboxVersionListItemType | null>(null)

  const { refetch } = useQuery(['initDevboxVersionList'], () => setDevboxVersionList(devbox.name), {
    refetchInterval: 3000,
    onSettled() {
      setInitialized(true)
    }
  })
  const handleDeploy = useCallback(
    (version: DevboxVersionListItemType) => {
      sealosApp.runEvents('openDesktopApp', {
        appKey: 'system-applaunchpad',
        pathname: '/app/edit',
        query: { imageName: `${REGISTRY_ADDR}/${NAMESPACE}/${devbox.name}:${version.tag}` },
        messageData: {
          type: 'InternalAppCall',
          formData: { imageName: `${REGISTRY_ADDR}/${NAMESPACE}/${devbox.name}:${version.tag}` }
        }
      })
    },
    [devbox.name]
  )
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
      title: t('status'),
      key: 'status',
      render: (item: DevboxVersionListItemType) => <DevboxStatusTag status={item.status} />
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
        <Flex alignItems="center" className="hover-container" minH={'20px'}>
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
              cursor={'pointer'}
              _hover={{
                color: 'brightBlue.600'
              }}
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
            onClick={() => handleDeploy(item)}>
            {t('deploy')}
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
    <Box borderWidth={1} borderRadius="lg" p={4} bg={'white'} h={'full'}>
      <Flex alignItems="center" justifyContent={'space-between'} mb={2}>
        <Flex alignItems={'center'}>
          <MyIcon name="list" w={'20px'} />
          <Text fontSize="lg" fontWeight="bold" color={'grayModern.600'}>
            {t('version_history')}
          </Text>
        </Flex>
        <Button
          onClick={() => setOnOpenRelease(true)}
          bg={'white'}
          color={'grayModern.600'}
          borderWidth={1}
          mr={3}
          leftIcon={<MyIcon name="version" />}
          _hover={{
            bg: 'grayModern.50',
            color: 'grayModern.600'
          }}>
          {t('release_version')}
        </Button>
      </Flex>
      <Loading loading={!initialized} />
      {devboxVersionList.length === 0 && initialized ? (
        <Flex justifyContent={'center'} alignItems={'center'} mt={10}>
          <Box textAlign={'center'} color={'grayModern.600'}>
            {t('no_versions')}
          </Box>
        </Flex>
      ) : (
        <MyTable columns={columns} data={devboxVersionList} />
      )}
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
    </Box>
  )
}

export default Version

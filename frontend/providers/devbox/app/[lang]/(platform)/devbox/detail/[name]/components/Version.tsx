import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { sealosApp } from 'sealos-desktop-sdk/app'
import { SealosMenu, useMessage } from '@sealos/ui'
import { Box, Button, Flex, MenuButton, Text, useDisclosure } from '@chakra-ui/react'

import MyIcon from '@/components/Icon'
import MyTable from '@/components/MyTable'
import DevboxStatusTag from '@/components/DevboxStatusTag'
import ReleaseModal from '@/components/modals/releaseModal'
import EditVersionDesModal from '@/components/modals/EditVersionDesModal'

import { DevboxVersionListItemType } from '@/types/devbox'
import { DevboxReleaseStatusEnum } from '@/constants/devbox'
import { delDevboxVersionByName, getSSHRuntimeInfo } from '@/api/devbox'

import { useConfirm } from '@/hooks/useConfirm'
import { useLoading } from '@/hooks/useLoading'

import { useEnvStore } from '@/stores/env'
import { useDevboxStore } from '@/stores/devbox'

const Version = () => {
  const t = useTranslations()
  const { message: toast } = useMessage()
  const { Loading, setIsLoading } = useLoading()
  const { isOpen: isOpenEdit, onOpen: onOpenEdit, onClose: onCloseEdit } = useDisclosure()

  const { env } = useEnvStore()
  const { devboxDetail: devbox, devboxVersionList, setDevboxVersionList } = useDevboxStore()

  const [initialized, setInitialized] = useState(false)
  const [onOpenRelease, setOnOpenRelease] = useState(false)
  const [currentVersion, setCurrentVersion] = useState<DevboxVersionListItemType | null>(null)

  const { openConfirm, ConfirmChild } = useConfirm({
    content: 'delete_version_confirm_info'
  })

  const { refetch } = useQuery(
    ['initDevboxVersionList'],
    () => setDevboxVersionList(devbox.name, devbox.id),
    {
      refetchInterval:
        devboxVersionList.length > 0 &&
        devboxVersionList[0].status.value !== DevboxReleaseStatusEnum.Success
          ? 3000
          : false,
      onSettled() {
        setInitialized(true)
      }
    }
  )

  const handleDeploy = useCallback(
    async (version: DevboxVersionListItemType) => {
      const { releaseCommand, releaseArgs } = await getSSHRuntimeInfo(devbox.runtimeVersion)
      const { cpu, memory, networks, name } = devbox
      const newNetworks = networks.map((network) => {
        return {
          port: network.port,
          protocol: network.protocol,
          openPublicDomain: network.openPublicDomain,
          domain: env.ingressDomain
        }
      })

      const transformData = {
        appName: `${name}-release`,
        cpu: cpu,
        memory: memory,
        imageName: `${env.registryAddr}/${env.namespace}/${devbox.name}:${version.tag}`,
        networks:
          newNetworks.length > 0
            ? newNetworks
            : [
                {
                  port: 80,
                  protocol: 'http',
                  openPublicDomain: false,
                  domain: env.ingressDomain
                }
              ],
        runCMD: releaseCommand,
        cmdParam: releaseArgs
      }

      const formData = encodeURIComponent(JSON.stringify(transformData))

      sealosApp.runEvents('openDesktopApp', {
        appKey: 'system-applaunchpad',
        pathname: '/app/edit',
        query: { formData },
        messageData: {
          type: 'InternalAppCall',
          formData: formData
        }
      })
    },
    [devbox, env.ingressDomain, env.namespace, env.registryAddr]
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
      render: (item: DevboxVersionListItemType) => (
        <DevboxStatusTag status={item.status} h={'27px'} thinMode />
      )
    },
    {
      title: t('create_time'),
      dataIndex: 'createTime',
      key: 'createTime',
      render: (item: DevboxVersionListItemType) => {
        return <Text color={'grayModern.600'}>{item.createTime}</Text>
      }
    },
    {
      title: t('version_description'),
      key: 'description',
      render: (item: DevboxVersionListItemType) => (
        <Flex alignItems="center" minH={'20px'}>
          <Box
            color={'grayModern.600'}
            overflow={'hidden'}
            textOverflow={'ellipsis'}
            whiteSpace={'nowrap'}
            w={'250px'}>
            {item.description}
          </Box>
        </Flex>
      )
    },
    {
      title: t('control'),
      key: 'control',
      render: (item: DevboxVersionListItemType) => (
        <Flex>
          <Button
            mr={5}
            height={'27px'}
            w={'60px'}
            size={'sm'}
            fontSize={'base'}
            bg={'grayModern.150'}
            color={'grayModern.900'}
            _hover={{
              color: 'brightBlue.600'
            }}
            isDisabled={item.status.value !== DevboxReleaseStatusEnum.Success}
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
                    <MyIcon name={'edit'} w={'16px'} />
                    <Box ml={2}>{t('edit')}</Box>
                  </>
                ),
                onClick: () => {
                  setCurrentVersion(item)
                  onOpenEdit()
                }
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
                onClick: () => openConfirm(() => handleDelDevboxVersion(item.name))()
              }
            ]}
          />
        </Flex>
      )
    }
  ]
  return (
    <Box
      borderWidth={1}
      borderRadius="lg"
      pl={6}
      pt={4}
      pr={6}
      bg={'white'}
      h={'full'}
      position={'relative'}>
      <Flex alignItems="center" justifyContent={'space-between'} mb={5}>
        <Flex alignItems={'center'}>
          <MyIcon name="list" w={'15px'} h={'15px'} mr={'5px'} color={'grayModern.600'} />
          <Text fontSize="base" fontWeight={'bold'} color={'grayModern.600'}>
            {t('version_history')}
          </Text>
        </Flex>
        <Button
          onClick={() => setOnOpenRelease(true)}
          bg={'white'}
          color={'grayModern.600'}
          borderWidth={1}
          mr={1}
          leftIcon={<MyIcon name="version" />}
          _hover={{
            color: 'brightBlue.600'
          }}>
          {t('release_version')}
        </Button>
      </Flex>
      <Loading loading={!initialized} fixed={false} />
      {devboxVersionList.length === 0 && initialized ? (
        <Flex
          justifyContent={'center'}
          alignItems={'center'}
          mt={10}
          flexDirection={'column'}
          gap={4}>
          <MyIcon name="empty" w={'40px'} h={'40px'} color={'white'} />
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
          devbox={{ ...devbox, sshPort: devbox.sshPort || 0 }}
        />
      )}
      <ConfirmChild />
    </Box>
  )
}

export default Version

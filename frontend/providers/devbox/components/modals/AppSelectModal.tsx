import {
  Box,
  Flex,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Button,
  ModalHeader,
  Text
} from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useCallback } from 'react'
import { customAlphabet } from 'nanoid'
import { sealosApp } from 'sealos-desktop-sdk/app'

import { AppListItemType } from '@/types/app'

import MyIcon from '../Icon'
import MyTable from '../MyTable'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 6)

interface NetworkConfig {
  port: number
  protocol: string
  openPublicDomain: boolean
  domain: string
}

interface DeployData {
  appName: string
  cpu: number
  memory: number
  imageName: string
  networks: NetworkConfig[]
  runCMD: string
  cmdParam: string[]
  labels: {
    [key: string]: string
  }
}

const AppSelectModal = ({
  apps,
  deployData,
  onSuccess,
  onClose
}: {
  apps: AppListItemType[]
  deployData: DeployData
  onSuccess: () => void
  onClose: () => void
}) => {
  const t = useTranslations()

  const handleCreate = useCallback(() => {
    const tempFormData = { ...deployData, appName: `${deployData.appName}-${nanoid()}` }
    const tempFormDataStr = encodeURIComponent(JSON.stringify(tempFormData))
    sealosApp.runEvents('openDesktopApp', {
      appKey: 'system-applaunchpad',
      pathname: '/redirect',
      query: { formData: tempFormDataStr },
      messageData: {
        type: 'InternalAppCall',
        formData: tempFormDataStr
      }
    })
  }, [deployData])

  const handleUpdate = useCallback(
    (item: AppListItemType) => {
      const tempFormData = { appName: item.name, imageName: deployData.imageName }
      const tempFormDataStr = encodeURIComponent(JSON.stringify(tempFormData))
      sealosApp.runEvents('openDesktopApp', {
        appKey: 'system-applaunchpad',
        pathname: '/redirect',
        query: { formData: tempFormDataStr },
        messageData: {
          type: 'InternalAppCall',
          formData: tempFormDataStr
        }
      })
      onSuccess()
    },
    [deployData, onSuccess]
  )

  const columns: {
    title: string
    dataIndex?: keyof AppListItemType
    key: string
    render?: (item: AppListItemType) => JSX.Element
  }[] = [
    {
      title: t('app_name'),
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: t('create_time'),
      dataIndex: 'createTime',
      key: 'createTime',
      render: (item: AppListItemType) => {
        return <Text color={'grayModern.600'}>{item.createTime}</Text>
      }
    },
    {
      title: t('control'),
      key: 'control',
      render: (item: AppListItemType) => (
        <Flex>
          <Button
            height={'27px'}
            w={'60px'}
            size={'sm'}
            fontSize={'base'}
            bg={'grayModern.150'}
            borderWidth={1}
            color={'grayModern.900'}
            _hover={{
              color: 'brightBlue.600'
            }}
            onClick={() => handleUpdate(item)}>
            {t('to_update')}
          </Button>
        </Flex>
      )
    }
  ]

  return (
    <Box>
      <Modal isOpen onClose={onClose} lockFocusAcrossFrames={false}>
        <ModalOverlay />
        <ModalContent top={'30%'} maxWidth={'800px'} w={'600px'}>
          <ModalHeader pl={10}>{t('deploy')}</ModalHeader>
          <ModalBody pb={4}>
            <Flex
              alignItems={'center'}
              mb={6}
              borderRadius={'4px'}
              justifyContent={'space-between'}>
              <Text>{t('create_directly')}</Text>
              <Button
                onClick={handleCreate}
                height={'27px'}
                size={'sm'}
                p={4}
                borderWidth={1}
                fontSize={'base'}
                bg={'grayModern.150'}
                color={'grayModern.900'}
                _hover={{
                  color: 'brightBlue.600'
                }}>
                {t('deploy_a_new_app')}
              </Button>
            </Flex>
            <Box>
              <Flex alignItems={'center'} mb={4}>
                <MyIcon name="list" w={'15px'} h={'15px'} mr={'5px'} color={'grayModern.600'} />
                <Text fontSize="base" fontWeight={'bold'} color={'grayModern.600'}>
                  {t('matched_apps')}
                </Text>
              </Flex>
              <MyTable columns={columns} data={apps} />
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  )
}

export default AppSelectModal

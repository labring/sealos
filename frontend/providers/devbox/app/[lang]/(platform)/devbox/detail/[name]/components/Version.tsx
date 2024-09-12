import MyIcon from '@/components/Icon'
import { Box, Button, Flex, MenuButton, Text, VStack, useDisclosure } from '@chakra-ui/react'
import { css } from '@emotion/react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useLoading } from '@/hooks/useLoading'
import { useDevboxStore } from '@/stores/devbox'
import { useCallback, useState } from 'react'
import DevboxStatusTag from '@/components/DevboxStatusTag'
import { SealosMenu, useMessage } from '@sealos/ui'
import { DevboxDetailType, DevboxVersionListItemType } from '@/types/devbox'
import EditVersionDesModal from '@/components/modals/EditVersionDesModal'
import ReleaseModal from '@/components/modals/releaseModal'
import { delDevboxVersionByName } from '@/api/devbox'
import { sealosApp } from 'sealos-desktop-sdk/app'
import { NAMESPACE } from '@/stores/static'

const Version = ({ devbox }: { devbox: DevboxDetailType }) => {
  const t = useTranslations()
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
        query: { imageName: `sealos.hub/${NAMESPACE}/${devbox.name}:${version.tag}` },
        messageData: {
          type: 'InternalAppCall',
          formData: { imageName: `sealos.hub/${NAMESPACE}/${devbox.name}:${version.tag}` }
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
  const scrollbarStyles = css`
    &::-webkit-scrollbar {
      width: 8px;
    }
    &::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }
    &::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 4px;
    }
    &::-webkit-scrollbar-thumb:hover {
      background: #555;
    }
  `
  return (
    <Box borderWidth={1} borderRadius="lg" p={4} bg={'white'} h={'full'} minW={'300px'}>
      <Flex alignItems="center" justifyContent={'space-between'}>
        <Flex alignItems={'center'}>
          <MyIcon name="response" w={'20px'} />
          <Text fontSize="lg" fontWeight="bold" color={'grayModern.600'}>
            {t('version_info')}
          </Text>
        </Flex>
        <Button
          onClick={() => setOnOpenRelease(true)}
          bg={'white'}
          color={'grayModern.600'}
          borderWidth={1}
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
        <Box maxHeight="350px" overflowY="auto" css={scrollbarStyles}>
          <VStack spacing={3} align="start" mr={1}>
            {devboxVersionList.map((version) => (
              <Box
                key={version.id}
                position="relative"
                w="100%"
                bg={'grayModern.50'}
                borderRadius={'lg'}
                p={4}
                _hover={{
                  '& .hover-actions': { visibility: 'visible' }
                }}>
                <Flex justifyContent="space-between" alignItems="center">
                  <Box>
                    <Flex alignItems="center" gap={2} mb={2}>
                      <Text fontWeight="bold" w="40px">
                        {version.tag}
                      </Text>
                      <Text color={'grayModern.500'} w="80px">
                        {version.createTime}
                      </Text>
                      <DevboxStatusTag status={version.status} />
                    </Flex>
                    <Text color={'grayModern.600'}>{version.description}</Text>
                  </Box>
                  {/* hover button */}
                  <Flex className="hover-actions" visibility="hidden" transition="opacity 0.2s">
                    <Button
                      size="sm"
                      mr={1}
                      bg={'white'}
                      color={'grayModern.600'}
                      borderWidth={1}
                      _hover={{
                        bg: 'grayModern.50',
                        color: 'grayModern.600'
                      }}
                      onClick={() => handleDeploy(version)}>
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
                            setCurrentVersion(version)
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
                          onClick: () => handleDelDevboxVersion(version.name)
                        }
                      ]}
                    />
                  </Flex>
                </Flex>
              </Box>
            ))}
          </VStack>
        </Box>
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

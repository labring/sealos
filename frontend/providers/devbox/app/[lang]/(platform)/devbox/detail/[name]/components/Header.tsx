import { useMessage } from '@sealos/ui'
import { useTranslations } from 'next-intl'
import { Dispatch, useCallback, useState } from 'react'
import {
  Flex,
  Button,
  Box,
  Menu,
  MenuButton,
  IconButton,
  MenuList,
  MenuItem
} from '@chakra-ui/react'

import { useRouter } from '@/i18n'
import MyIcon from '@/components/Icon'
import { useDevboxStore } from '@/stores/devbox'
import { IDEType, useGlobalStore } from '@/stores/global'
import { DevboxDetailType } from '@/types/devbox'
import DelModal from '@/components/modals/DelModal'
import DevboxStatusTag from '@/components/DevboxStatusTag'
import { NAMESPACE, SEALOS_DOMAIN } from '@/stores/static'
import {
  getSSHConnectionInfo,
  getSSHRuntimeInfo,
  pauseDevbox,
  restartDevbox,
  startDevbox
} from '@/api/devbox'

const Header = ({
  refetchDevboxDetail,
  setShowSlider,
  isLargeScreen = true
}: {
  refetchDevboxDetail: () => void
  setShowSlider: Dispatch<boolean>
  isLargeScreen: boolean
}) => {
  const router = useRouter()
  const t = useTranslations()
  const { message: toast } = useMessage()
  const { setLoading, setCurrentIDE, currentIDE } = useGlobalStore()
  const { devboxDetail } = useDevboxStore()
  const [delDevbox, setDelDevbox] = useState<DevboxDetailType | null>(null)

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
  const handleGotoIDE = useCallback(
    async (devbox: DevboxDetailType, currentIDE: string = 'vscode') => {
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
        )}&sshPort=${encodeURIComponent(
          devbox.sshPort as number
        )}&base64PrivateKey=${encodeURIComponent(
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

  const handlePauseDevbox = useCallback(
    async (devbox: DevboxDetailType) => {
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
      refetchDevboxDetail()
      setLoading(false)
    },
    [refetchDevboxDetail, setLoading, t, toast]
  )
  const handleRestartDevbox = useCallback(
    async (devbox: DevboxDetailType) => {
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
      refetchDevboxDetail()
      setLoading(false)
    },
    [setLoading, t, toast, refetchDevboxDetail]
  )
  const handleStartDevbox = useCallback(
    async (devbox: DevboxDetailType) => {
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
      refetchDevboxDetail()
      setLoading(false)
    },
    [setLoading, t, toast, refetchDevboxDetail]
  )
  return (
    <Flex justify="space-between" align="center" pl={4}>
      <Flex alignItems={'center'} gap={2}>
        <MyIcon
          name="arrowLeft"
          w={'24px'}
          onClick={() => router.push('/')}
          cursor={'pointer'}
          mt={1}
          ml={1}
        />
        <Box fontSize="2xl" fontWeight="bold">
          {devboxDetail.name}
        </Box>
        <Flex alignItems={'center'}>
          <DevboxStatusTag status={devboxDetail.status} h={'27px'} />
          {!isLargeScreen && (
            <Box mx={4}>
              <Button
                width={'96px'}
                height={'40px'}
                bg={'white'}
                borderWidth={1}
                color={'grayModern.600'}
                leftIcon={<MyIcon name="detail" w="16px" h="16px" />}
                _hover={{
                  color: 'brightBlue.600'
                }}
                onClick={() => setShowSlider(true)}>
                {t('detail')}
              </Button>
            </Box>
          )}
        </Flex>
      </Flex>
      <Flex>
        <Button
          height={'40px'}
          size={'sm'}
          fontSize={'14px'}
          bg={'white'}
          color={'grayModern.600'}
          _hover={{
            color: 'brightBlue.600'
          }}
          borderWidth={1}
          borderRightWidth={0}
          borderRightRadius={0}
          onClick={() => handleGotoIDE(devboxDetail, currentIDE)}
          leftIcon={<MyIcon name={getCurrentIDELabelAndIcon(currentIDE).icon} w={'16px'} />}
          isDisabled={devboxDetail.status.value !== 'Running'}>
          {getCurrentIDELabelAndIcon(currentIDE).label}
        </Button>
        <Menu placement="bottom-end">
          <MenuButton
            height={'40px'}
            bg={'white'}
            color={'grayModern.600'}
            mr={6}
            p={2}
            borderWidth={1}
            borderLeftRadius={0}
            borderLeftWidth={0}
            boxShadow={
              '2px 1px 2px 0px rgba(19, 51, 107, 0.05),0px 0px 1px 0px rgba(19, 51, 107, 0.08)'
            }
            as={IconButton}
            _hover={{
              color: 'brightBlue.600'
            }}
            isDisabled={devboxDetail.status.value !== 'Running'}
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
        {devboxDetail.status.value === 'Running' && (
          <Button
            mr={5}
            h={'40px'}
            fontSize={'14px'}
            bg={'white'}
            color={'grayModern.600'}
            _hover={{
              color: 'brightBlue.600'
            }}
            borderWidth={1}
            leftIcon={<MyIcon name={'shutdown'} w={'16px'} />}
            onClick={() => handlePauseDevbox(devboxDetail)}>
            {t('pause')}
          </Button>
        )}
        {devboxDetail.status.value === 'Stopped' && (
          <Button
            mr={5}
            h={'40px'}
            fontSize={'14px'}
            bg={'white'}
            color={'grayModern.600'}
            _hover={{
              color: 'brightBlue.600'
            }}
            borderWidth={1}
            leftIcon={<MyIcon name={'start'} w={'16px'} />}
            onClick={() => handleStartDevbox(devboxDetail)}>
            {t('boot')}
          </Button>
        )}
        <Button
          mr={5}
          w={'96px'}
          h={'40px'}
          fontSize={'14px'}
          bg={'white'}
          color={'grayModern.600'}
          _hover={{
            color: 'brightBlue.600'
          }}
          borderWidth={1}
          leftIcon={<MyIcon name={'change'} w={'16px'} />}
          onClick={() => router.push(`/devbox/create?name=${devboxDetail.name}`)}>
          {t('update')}
        </Button>
        <Button
          mr={5}
          w={'96px'}
          h={'40px'}
          fontSize={'14px'}
          bg={'white'}
          color={'grayModern.600'}
          _hover={{
            color: 'brightBlue.600'
          }}
          borderWidth={1}
          leftIcon={<MyIcon name={'restart'} w={'16px'} />}
          onClick={() => handleRestartDevbox(devboxDetail)}>
          {t('restart')}
        </Button>
        <Button
          mr={5}
          w={'96px'}
          h={'40px'}
          fontSize={'14px'}
          bg={'white'}
          color={'grayModern.600'}
          _hover={{
            color: 'red.600'
          }}
          borderWidth={1}
          leftIcon={<MyIcon name={'delete'} w={'16px'} />}
          onClick={() => setDelDevbox(devboxDetail)}>
          {t('delete')}
        </Button>
      </Flex>
      {delDevbox && (
        <DelModal
          devbox={delDevbox}
          onClose={() => setDelDevbox(null)}
          onSuccess={() => {
            setDelDevbox(null)
            refetchDevboxDetail()
            router.push('/')
          }}
        />
      )}
    </Flex>
  )
}

export default Header

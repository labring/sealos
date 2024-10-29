import { useMessage } from '@sealos/ui'
import { useTranslations } from 'next-intl'
import { Dispatch, useCallback, useMemo, useState } from 'react'
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

import {
  getSSHConnectionInfo,
  getSSHRuntimeInfo,
  pauseDevbox,
  restartDevbox,
  startDevbox
} from '@/api/devbox'
import { useRouter } from '@/i18n'
import { useEnvStore } from '@/stores/env'
import { useDevboxStore } from '@/stores/devbox'
import { IDEType, useGlobalStore } from '@/stores/global'

import { DevboxDetailType } from '@/types/devbox'

import MyIcon from '@/components/Icon'
import DelModal from '@/components/modals/DelModal'
import DevboxStatusTag from '@/components/DevboxStatusTag'

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

  const { env } = useEnvStore()
  const { screenWidth } = useGlobalStore()
  const { devboxDetail } = useDevboxStore()
  const { setLoading, setCurrentIDE, currentIDE } = useGlobalStore()

  const [delDevbox, setDelDevbox] = useState<DevboxDetailType | null>(null)
  const isButtonOnlyIcon = useMemo(() => screenWidth > 1000, [screenWidth])

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

        const fullUri = `${editorUri}labring.devbox-aio?sshDomain=${encodeURIComponent(
          `${userName}@${env.sealosDomain}`
        )}&sshPort=${encodeURIComponent(
          devbox.sshPort as number
        )}&base64PrivateKey=${encodeURIComponent(
          base64PrivateKey
        )}&sshHostLabel=${encodeURIComponent(
          `${env.sealosDomain}/${env.namespace}/${devbox.name}`
        )}&workingDir=${encodeURIComponent(workingDir)}`

        window.location.href = fullUri
      } catch (error: any) {
        console.error(error, '==')
      }
    },
    [env.namespace, env.sealosDomain]
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
    <Flex justify="space-between" align="center" pl={4} pt={2} flexWrap={'wrap'} gap={5}>
      {/* left back button and title */}
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
        {/* detail button */}
        <Flex alignItems={'center'}>
          <DevboxStatusTag status={devboxDetail.status} h={'27px'} />
          {!isLargeScreen && (
            <Box ml={4}>
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
      {/* right main button group */}
      <Flex gap={5}>
        <Box>
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
            leftIcon={
              isButtonOnlyIcon ? (
                <MyIcon name={getCurrentIDELabelAndIcon(currentIDE).icon} w={'16px'} />
              ) : undefined
            }
            isDisabled={devboxDetail.status.value !== 'Running'}>
            {!isButtonOnlyIcon ? (
              <MyIcon name={getCurrentIDELabelAndIcon(currentIDE).icon} w={'16px'} />
            ) : (
              getCurrentIDELabelAndIcon(currentIDE).label
            )}
          </Button>
          <Menu placement="bottom-end">
            <MenuButton
              height={'40px'}
              bg={'white'}
              color={'grayModern.600'}
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
        </Box>
        {devboxDetail.status.value === 'Running' && (
          <Button
            h={'40px'}
            fontSize={'14px'}
            bg={'white'}
            color={'grayModern.600'}
            _hover={{
              color: 'brightBlue.600'
            }}
            borderWidth={1}
            leftIcon={isButtonOnlyIcon ? <MyIcon name={'shutdown'} w={'16px'} /> : undefined}
            onClick={() => handlePauseDevbox(devboxDetail)}>
            {!isButtonOnlyIcon ? <MyIcon name={'shutdown'} w={'16px'} /> : t('pause')}
          </Button>
        )}
        {devboxDetail.status.value === 'Stopped' && (
          <Button
            h={'40px'}
            fontSize={'14px'}
            bg={'white'}
            color={'grayModern.600'}
            _hover={{
              color: 'brightBlue.600'
            }}
            borderWidth={1}
            leftIcon={isButtonOnlyIcon ? <MyIcon name={'start'} w={'16px'} /> : undefined}
            onClick={() => handleStartDevbox(devboxDetail)}>
            {!isButtonOnlyIcon ? <MyIcon name={'start'} w={'16px'} /> : t('start')}
          </Button>
        )}
        <Button
          h={'40px'}
          fontSize={'14px'}
          bg={'white'}
          color={'grayModern.600'}
          _hover={{
            color: 'brightBlue.600'
          }}
          borderWidth={1}
          leftIcon={isButtonOnlyIcon ? <MyIcon name={'change'} w={'16px'} /> : undefined}
          onClick={() => router.push(`/devbox/create?name=${devboxDetail.name}`)}>
          {!isButtonOnlyIcon ? <MyIcon name={'change'} w={'16px'} /> : t('update')}
        </Button>
        <Button
          h={'40px'}
          fontSize={'14px'}
          bg={'white'}
          color={'grayModern.600'}
          _hover={{
            color: 'brightBlue.600'
          }}
          borderWidth={1}
          leftIcon={isButtonOnlyIcon ? <MyIcon name={'restart'} w={'16px'} /> : undefined}
          onClick={() => handleRestartDevbox(devboxDetail)}>
          {!isButtonOnlyIcon ? <MyIcon name={'restart'} w={'16px'} /> : t('restart')}
        </Button>
        <Button
          h={'40px'}
          fontSize={'14px'}
          bg={'white'}
          color={'grayModern.600'}
          _hover={{
            color: 'red.600'
          }}
          borderWidth={1}
          leftIcon={isButtonOnlyIcon ? <MyIcon name={'delete'} w={'16px'} /> : undefined}
          onClick={() => setDelDevbox(devboxDetail)}>
          {!isButtonOnlyIcon ? <MyIcon name={'delete'} w={'16px'} /> : t('delete')}
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

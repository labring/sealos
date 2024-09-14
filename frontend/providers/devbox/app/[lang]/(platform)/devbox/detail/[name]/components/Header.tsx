import { getSSHConnectionInfo, getSSHRuntimeInfo, pauseDevbox, restartDevbox } from '@/api/devbox'
import DevboxStatusTag from '@/components/DevboxStatusTag'
import MyIcon from '@/components/Icon'
import DelModal from '@/components/modals/DelModal'
import { useRouter } from '@/i18n'
import { useDevboxStore } from '@/stores/devbox'
import { useGlobalStore } from '@/stores/global'
import { NAMESPACE, SEALOS_DOMAIN } from '@/stores/static'
import { DevboxDetailType } from '@/types/devbox'
import { Flex, Button, Box } from '@chakra-ui/react'
import { useMessage } from '@sealos/ui'
import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'
import { sealosApp } from 'sealos-desktop-sdk/app'

const Header = ({ refetchDevboxDetail }: { refetchDevboxDetail: () => void }) => {
  const router = useRouter()
  const t = useTranslations()
  const { message: toast } = useMessage()
  const { setLoading } = useGlobalStore()
  const { devboxDetail } = useDevboxStore()
  const [delDevbox, setDelDevbox] = useState<DevboxDetailType | null>(null)

  const handleGotoVSCode = useCallback(async (devbox: DevboxDetailType) => {
    try {
      const { base64PrivateKey, userName } = await getSSHConnectionInfo({
        devboxName: devbox.name,
        runtimeName: devbox.runtimeVersion
      })
      const { workingDir } = await getSSHRuntimeInfo(devbox.runtimeVersion)

      const vscodeUri = `vscode://mlhiter.devbox-sealos?sshDomain=${encodeURIComponent(
        `${userName}@${SEALOS_DOMAIN}`
      )}&sshPort=${encodeURIComponent(
        devbox.sshPort as number
      )}&base64PrivateKey=${encodeURIComponent(base64PrivateKey)}&sshHostLabel=${encodeURIComponent(
        `${SEALOS_DOMAIN}/${NAMESPACE}/${devbox.name}`
      )}&workingDir=${encodeURIComponent(workingDir)}`

      window.location.href = vscodeUri
    } catch (error: any) {
      console.error(error, '==')
    }
  }, [])
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
      setLoading(false)
    },
    [setLoading, t, toast]
  )
  const handleGoToTerminal = useCallback(
    async (devbox: DevboxDetailType) => {
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
      refetchDevboxDetail()
    },
    [refetchDevboxDetail, t, toast]
  )

  return (
    <Flex justify="space-between" align="center">
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
        <Box mt={1}>
          <DevboxStatusTag status={devboxDetail.status} />
        </Box>
      </Flex>
      <Flex>
        <Button
          mr={5}
          height={'32px'}
          size={'sm'}
          fontSize={'base'}
          bg={'white'}
          color={'grayModern.900'}
          _hover={{
            color: 'brightBlue.600'
          }}
          leftIcon={<MyIcon name={'vscode'} w={'16px'} />}
          onClick={() => handleGotoVSCode(devboxDetail)}>
          {t('open_vscode')}
        </Button>
        <Button
          mr={5}
          height={'32px'}
          size={'sm'}
          fontSize={'base'}
          bg={'white'}
          color={'grayModern.900'}
          _hover={{
            color: 'brightBlue.600'
          }}
          leftIcon={<MyIcon name={'terminal'} w={'16px'} />}
          onClick={() => handleGoToTerminal(devboxDetail)}>
          {t('terminal')}
        </Button>
        <Button
          mr={5}
          height={'32px'}
          size={'sm'}
          fontSize={'base'}
          bg={'white'}
          color={'grayModern.900'}
          _hover={{
            color: 'brightBlue.600'
          }}
          onClick={() => handlePauseDevbox(devboxDetail)}>
          <MyIcon name={'pause'} w={'16px'} />
        </Button>
        <Button
          mr={5}
          height={'32px'}
          size={'sm'}
          fontSize={'base'}
          bg={'white'}
          color={'grayModern.900'}
          _hover={{
            color: 'brightBlue.600'
          }}
          onClick={() => router.push(`/devbox/create?name=${devboxDetail.name}`)}>
          <MyIcon name={'change'} w={'16px'} />
        </Button>
        <Button
          mr={5}
          height={'32px'}
          size={'sm'}
          fontSize={'base'}
          bg={'white'}
          color={'grayModern.900'}
          _hover={{
            color: 'brightBlue.600'
          }}
          onClick={() => handleRestartDevbox(devboxDetail)}>
          <MyIcon name={'restart'} w={'16px'} />
        </Button>
        <Button
          mr={5}
          height={'32px'}
          size={'sm'}
          fontSize={'base'}
          bg={'white'}
          color={'grayModern.900'}
          _hover={{
            color: 'red.600'
          }}
          onClick={() => setDelDevbox(devboxDetail)}>
          <MyIcon name={'delete'} w={'16px'} />
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

import {
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuList,
  Tooltip,
  IconButton,
  MenuItem,
  ButtonProps,
  Box
} from '@chakra-ui/react'
import { useMessage } from '@sealos/ui'
import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'

import MyIcon from './Icon'
import { useEnvStore } from '@/stores/env'
import { useIDEStore, IDEType } from '@/stores/ide'
import { DevboxStatusMapType } from '@/types/devbox'
import { getSSHConnectionInfo, getSSHRuntimeInfo } from '@/api/devbox'
import JetBrainsGuideModal from './modals/jetbrainsGuideModal'

interface Props {
  devboxName: string
  runtimeVersion: string
  runtimeType: string
  sshPort: number
  status: DevboxStatusMapType
  isBigButton?: boolean
  leftButtonProps?: ButtonProps
  rightButtonProps?: ButtonProps
}

const IDEButton = ({
  devboxName,
  runtimeVersion,
  runtimeType,
  sshPort,
  status,
  isBigButton = true,
  leftButtonProps = {},
  rightButtonProps = {}
}: Props) => {
  const t = useTranslations()

  const { env } = useEnvStore()
  const { message: toast } = useMessage()
  const { getDevboxIDEByDevboxName, updateDevboxIDE } = useIDEStore()

  const [loading, setLoading] = useState(false)
  const [jetbrainsGuideData, setJetBrainsGuideData] = useState<any>(null)
  const [onOpenJetbrainsModal, setOnOpenJetbrainsModal] = useState(false)
  const currentIDE = getDevboxIDEByDevboxName(devboxName) as IDEType

  const handleGotoIDE = useCallback(
    async (currentIDE: IDEType = 'cursor') => {
      setLoading(true)

      if (currentIDE !== 'jetbrains') {
        toast({
          title: t('opening_ide'),
          status: 'info'
        })
      }

      try {
        const { base64PrivateKey, userName, token } = await getSSHConnectionInfo({
          devboxName,
          runtimeName: runtimeVersion
        })
        const { workingDir } = await getSSHRuntimeInfo(runtimeVersion)
        const sshPrivateKey = Buffer.from(base64PrivateKey, 'base64').toString('utf-8')

        setJetBrainsGuideData({
          devboxName,
          runtimeType,
          privateKey: sshPrivateKey,
          userName,
          token,
          workingDir,
          host: env.sealosDomain,
          port: sshPort.toString()
        })

        if (currentIDE === 'jetbrains') {
          setOnOpenJetbrainsModal(true)
          return
        }

        const idePrefix = ideObj[currentIDE].prefix
        const fullUri = `${idePrefix}labring.devbox-aio?sshDomain=${encodeURIComponent(
          `${userName}@${env.sealosDomain}`
        )}&sshPort=${encodeURIComponent(sshPort)}&base64PrivateKey=${encodeURIComponent(
          base64PrivateKey
        )}&sshHostLabel=${encodeURIComponent(
          `${env.sealosDomain}_${env.namespace}_${devboxName}`
        )}&workingDir=${encodeURIComponent(workingDir)}&token=${encodeURIComponent(token)}`

        window.location.href = fullUri
      } catch (error: any) {
        console.error(error, '==')
      } finally {
        setLoading(false)
      }
    },
    [devboxName, env.namespace, env.sealosDomain, runtimeVersion, setLoading, sshPort, toast, t]
  )

  return (
    <Flex>
      <Tooltip label={t('ide_tooltip')} hasArrow bg={'#FFFFFF'} color={'grayModern.900'}>
        <Button
          height={'32px'}
          fontSize={'base'}
          bg={'grayModern.150'}
          color={'grayModern.900'}
          _hover={{
            color: 'brightBlue.600'
          }}
          borderRightWidth={0}
          borderRightRadius={0}
          onClick={() => handleGotoIDE(currentIDE)}
          isDisabled={status.value !== 'Running' || loading}
          {...leftButtonProps}>
          {isBigButton ? (
            <Flex alignItems={'center'} w={'100%'} justifyContent={'center'}>
              <MyIcon name={currentIDE} w={'25%'} />
              <Box w={'75%'} textAlign={'center'} pl={2}>
                {ideObj[currentIDE]?.label}
              </Box>
            </Flex>
          ) : (
            <MyIcon name={currentIDE} w={'16px'} />
          )}
        </Button>
      </Tooltip>
      <Menu placement="bottom-end" isLazy>
        <MenuButton
          height={'32px'}
          bg={'grayModern.150'}
          color={'grayModern.900'}
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
          isDisabled={status.value !== 'Running' || loading}
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
          {...rightButtonProps}
        />
        <MenuList
          color={'grayModern.600'}
          fontWeight={500}
          fontSize={'12px'}
          defaultValue={currentIDE}
          px={1}>
          {menuItems.map((item) => (
            <MenuItem
              key={item.value}
              value={item.value}
              onClick={() => {
                updateDevboxIDE(item.value as IDEType, devboxName)
                handleGotoIDE(item.value as IDEType)
              }}
              icon={<MyIcon name={item.value as IDEType} w={'16px'} />}
              _hover={{
                bg: '#1118240D',
                borderRadius: 4
              }}
              _focus={{
                bg: '#1118240D',
                borderRadius: 4
              }}>
              <Flex justifyContent="space-between" alignItems="center" width="100%">
                {item?.menuLabel}
                {currentIDE === item.value && <MyIcon name="check" w={'16px'} />}
              </Flex>
            </MenuItem>
          ))}
        </MenuList>
      </Menu>
      {!!onOpenJetbrainsModal && (
        <JetBrainsGuideModal
          onSuccess={() => {}}
          onClose={() => setOnOpenJetbrainsModal(false)}
          jetbrainsGuideData={jetbrainsGuideData}
        />
      )}
    </Flex>
  )
}

export const ideObj = {
  vscode: {
    label: 'VSCode',
    menuLabel: 'VSCode',
    icon: 'vscode',
    prefix: 'vscode://',
    value: 'vscode'
  },
  vscodeInsiders: {
    label: 'Insiders',
    menuLabel: 'VSCode Insiders',
    icon: 'vscodeInsiders',
    prefix: 'vscode-insiders://',
    value: 'vscodeInsiders'
  },
  cursor: {
    label: 'Cursor',
    menuLabel: 'Cursor',
    icon: 'cursor',
    prefix: 'cursor://',
    value: 'cursor'
  },
  windsurf: {
    label: 'Windsurf',
    menuLabel: 'Windsurf',
    icon: 'windsurf',
    prefix: 'windsurf://',
    value: 'windsurf'
  },
  jetbrains: {
    label: 'JetBrains',
    icon: 'jetbrains',
    prefix: '-',
    value: 'jetbrains'
  }
}

const menuItems = Object.values(ideObj).map(({ value, menuLabel }) => ({ value, menuLabel }))

export default IDEButton

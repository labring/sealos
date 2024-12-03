import {
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuList,
  Tooltip,
  IconButton,
  MenuItem,
  ButtonProps
} from '@chakra-ui/react'
import { useMessage } from '@sealos/ui'
import { useTranslations } from 'next-intl'
import { useCallback, useState } from 'react'

import MyIcon from './Icon'
import { useEnvStore } from '@/stores/env'
import { DevboxStatusMapType } from '@/types/devbox'
import { IDEType, useGlobalStore } from '@/stores/global'
import { getSSHConnectionInfo, getSSHRuntimeInfo } from '@/api/devbox'

interface Props {
  devboxName: string
  runtimeVersion: string
  sshPort: number
  status: DevboxStatusMapType
  isBigButton?: boolean
  leftButtonProps?: ButtonProps
  rightButtonProps?: ButtonProps
}

const IDEButton = ({
  devboxName,
  runtimeVersion,
  sshPort,
  status,
  isBigButton = true,
  leftButtonProps = {},
  rightButtonProps = {}
}: Props) => {
  const t = useTranslations()

  const { env } = useEnvStore()
  const { message: toast } = useMessage()
  const [loading, setLoading] = useState(false)
  const { setCurrentIDE, currentIDE } = useGlobalStore()

  const handleGotoIDE = useCallback(
    async (currentIDE: IDEType = 'vscode') => {
      setLoading(true)

      toast({
        title: t('opening_ide'),
        status: 'info'
      })

      try {
        const { base64PrivateKey, userName, token } = await getSSHConnectionInfo({
          devboxName,
          runtimeName: runtimeVersion
        })
        const { workingDir } = await getSSHRuntimeInfo(runtimeVersion)

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
          size={'sm'}
          fontSize={'base'}
          bg={'grayModern.150'}
          color={'grayModern.900'}
          _hover={{
            color: 'brightBlue.600'
          }}
          borderRightWidth={0}
          borderRightRadius={0}
          onClick={() => handleGotoIDE(currentIDE)}
          leftIcon={isBigButton ? <MyIcon name={currentIDE} w={'16px'} /> : undefined}
          isDisabled={status.value !== 'Running' || loading}
          {...leftButtonProps}>
          {!isBigButton ? <MyIcon name={currentIDE} w={'16px'} /> : ideObj[currentIDE]?.label}
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
              onClick={() => setCurrentIDE(item.value as IDEType)}
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
                {item?.label}
                {currentIDE === item.value && <MyIcon name="check" w={'16px'} />}
              </Flex>
            </MenuItem>
          ))}
        </MenuList>
      </Menu>
    </Flex>
  )
}

export const ideObj = {
  vscode: {
    label: 'VSCode',
    icon: 'vscode',
    prefix: 'vscode://',
    value: 'vscode'
  },
  vscodeInsiders: {
    label: 'VSCode Insiders',
    icon: 'vscodeInsiders',
    prefix: 'vscode-insiders://',
    value: 'vscodeInsiders'
  },
  cursor: {
    label: 'Cursor',
    icon: 'cursor',
    prefix: 'cursor://',
    value: 'cursor'
  },
  windsurf: {
    label: 'Windsurf',
    icon: 'windsurf',
    prefix: 'windsurf://',
    value: 'windsurf'
  }
}

const menuItems = Object.values(ideObj).map(({ value, label }) => ({ value, label }))

export default IDEButton

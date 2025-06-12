import {
  Box,
  Button,
  ButtonProps,
  Flex,
  FlexProps,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Tooltip,
  Text,
  Center,
  Portal
} from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { useTranslations } from 'next-intl';
import { useCallback, useState, useEffect } from 'react';

import MyIcon from './Icon';
import { useEnvStore } from '@/stores/env';
import { IDEType, useIDEStore } from '@/stores/ide';
import { DevboxStatusMapType } from '@/types/devbox';
import { getSSHConnectionInfo } from '@/api/devbox';

import ToolboxModal from './modals/ToolboxModal';
import JetBrainsGuideModal from './modals/JetbrainsGuideModal';
import { useGuideStore } from '@/stores/guide';
import { quitGuideDriverObj, startDriver, startManageAndDeploy } from '@/hooks/driver';
import { X } from 'lucide-react';

interface Props {
  devboxName: string;
  runtimeType: string;
  sshPort: number;
  status: DevboxStatusMapType;
  isBigButton?: boolean;
  leftButtonProps?: ButtonProps;
  rightButtonProps?: ButtonProps;
  isGuide?: boolean;
}

export interface JetBrainsGuideData {
  devboxName: string;
  runtimeType: string;
  privateKey: string;
  userName: string;
  token: string;
  workingDir: string;
  host: string;
  port: string;
  configHost: string;
}

interface MenuItem {
  value: string;
  menuLabel: string;
  group?: string;
  options?: { value: string; menuLabel: string }[];
}

const IDEButton = ({
  devboxName,
  runtimeType,
  sshPort,
  status,
  isBigButton = true,
  leftButtonProps = {},
  rightButtonProps = {},
  isGuide = false,
  ...props
}: Props & FlexProps) => {
  const t = useTranslations();

  const { env } = useEnvStore();
  const { message: toast } = useMessage();
  const { getDevboxIDEByDevboxName, updateDevboxIDE } = useIDEStore();

  const [loading, setLoading] = useState(false);
  const [onOpenToolboxModal, setOnOpenToolboxModal] = useState(false);
  const [onOpenJetbrainsModal, setOnOpenJetbrainsModal] = useState(false);
  const [jetbrainsGuideData, setJetBrainsGuideData] = useState<JetBrainsGuideData>();

  const currentIDE = getDevboxIDEByDevboxName(devboxName) as IDEType;

  const handleGotoIDE = useCallback(
    async (currentIDE: IDEType = 'cursor') => {
      setLoading(true);

      if (currentIDE !== 'gateway' && currentIDE !== 'toolbox') {
        toast({
          title: t('opening_ide'),
          status: 'info'
        });
      }

      try {
        const { base64PrivateKey, userName, workingDir, token } = await getSSHConnectionInfo({
          devboxName
        });
        const sshPrivateKey = Buffer.from(base64PrivateKey, 'base64').toString('utf-8');

        setJetBrainsGuideData({
          devboxName,
          runtimeType,
          privateKey: sshPrivateKey,
          userName,
          token,
          workingDir,
          host: env.sealosDomain,
          port: sshPort.toString(),
          configHost: `${env.sealosDomain}_${env.namespace}_${devboxName}`
        });

        if (currentIDE === 'gateway') {
          setOnOpenJetbrainsModal(true);
          return;
        } else if (currentIDE === 'toolbox') {
          setOnOpenToolboxModal(true);
          return;
        }

        const idePrefix = ideObj[currentIDE].prefix;
        const fullUri = `${idePrefix}labring.devbox-aio?sshDomain=${encodeURIComponent(
          `${userName}@${env.sealosDomain}`
        )}&sshPort=${encodeURIComponent(sshPort)}&base64PrivateKey=${encodeURIComponent(
          base64PrivateKey
        )}&sshHostLabel=${encodeURIComponent(
          `${env.sealosDomain}_${env.namespace}_${devboxName}`
        )}&workingDir=${encodeURIComponent(workingDir)}&token=${encodeURIComponent(token)}`;
        window.location.href = fullUri;
      } catch (error: any) {
        console.error(error, '==');
      } finally {
        setLoading(false);
      }
    },
    [toast, t, devboxName, runtimeType, env.sealosDomain, env.namespace, sshPort]
  );

  const { guideIDE, setguideIDE } = useGuideStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!guideIDE && isGuide) {
      setIsMenuOpen(true);
    }
  }, [guideIDE, isGuide, t]);

  return (
    <Flex {...props} position={isGuide ? 'relative' : 'static'}>
      <Tooltip label={t('ide_tooltip')} hasArrow bg={'#FFFFFF'} color={'grayModern.900'}>
        <Button
          height={'32px'}
          width={'100px'}
          fontSize={'base'}
          bg={'grayModern.150'}
          color={'grayModern.900'}
          _hover={{
            color: 'brightBlue.600',
            bg: '#1118240D'
          }}
          borderRightWidth={0}
          borderRightRadius={0}
          onClick={() => handleGotoIDE(currentIDE)}
          isDisabled={status.value !== 'Running' || loading}
          {...leftButtonProps}
        >
          {isBigButton ? (
            <Flex alignItems={'center'} w={'100%'} justifyContent={'center'}>
              <MyIcon name={getIconName(currentIDE)} w={'25%'} />
              <Box w={'75%'} textAlign={'center'} px={'7px'} whiteSpace="nowrap">
                {ideObj[currentIDE]?.label}
              </Box>
            </Flex>
          ) : (
            <MyIcon name={getIconName(currentIDE)} w={'16px'} />
          )}
        </Button>
      </Tooltip>
      <Menu
        placement="bottom-end"
        isLazy
        isOpen={isGuide || isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
      >
        <MenuButton
          height={'32px'}
          bg={'grayModern.150'}
          color={'grayModern.900'}
          _hover={{
            color: 'brightBlue.600'
          }}
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
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        />
        <MenuList
          color={'grayModern.600'}
          fontWeight={500}
          fontSize={'12px'}
          defaultValue={currentIDE}
          p={'6px'}
          px={'4px'}
          w={'230px'}
          display={'flex'}
          flexDirection={'column'}
          gap={'2px'}
        >
          {menuItems.map((item) => {
            if (item.group) {
              return (
                <Flex key={item.value} gap={'4px'}>
                  {item.options?.map((option, index) => (
                    <Flex key={option.value} alignItems={'center'}>
                      <MenuItem
                        h={'32px'}
                        {...(index === 0 && {
                          pl: '8px',
                          pr: '4px',
                          w: '100px'
                        })}
                        {...(index === 1 && {
                          pr: '8px',
                          w: '110px'
                        })}
                        borderRadius={'4px'}
                        value={option.value}
                        onClick={() => {
                          updateDevboxIDE(option.value as IDEType, devboxName);
                          handleGotoIDE(option.value as IDEType);
                        }}
                        _hover={{
                          bg: 'grayModern.100',
                          borderRadius: 4
                        }}
                        _focus={{
                          bg: '#1118240D',
                          borderRadius: 4
                        }}
                        {...(currentIDE === option.value && {
                          color: 'brightBlue.600'
                        })}
                      >
                        <Flex alignItems="center" w={'100%'}>
                          <MyIcon
                            name={getIconName(option.value as IDEType)}
                            w={'16px'}
                            mr={'6px'}
                          />
                          <Text whiteSpace="nowrap" mr={'2px'} fontWeight={500}>
                            {option.menuLabel}
                          </Text>
                          {currentIDE === option.value && (
                            <MyIcon name="check" w={'12px'} ml={'6px'} />
                          )}
                        </Flex>
                      </MenuItem>
                      {index === 0 && (
                        <Box h={'12px'} w={'2px'} bg={'grayModern.200'} ml={'4px'}></Box>
                      )}
                    </Flex>
                  ))}
                </Flex>
              );
            } else {
              return (
                <MenuItem
                  h={'32px'}
                  w={'100%'}
                  p={'6px'}
                  borderRadius={'4px'}
                  key={item.value}
                  value={item.value}
                  onClick={() => {
                    updateDevboxIDE(item.value as IDEType, devboxName);
                    handleGotoIDE(item.value as IDEType);
                  }}
                  _hover={{
                    bg: 'grayModern.100',
                    borderRadius: 4
                  }}
                  _focus={{
                    bg: '#1118240D',
                    borderRadius: 4
                  }}
                  {...(currentIDE === item.value && {
                    color: 'brightBlue.600'
                  })}
                >
                  <Flex
                    alignItems="center"
                    w={'100%'}
                    p={'7px 2px'}
                    justifyContent={'space-between'}
                  >
                    <Flex alignItems={'center'}>
                      <MyIcon name={getIconName(item.value as IDEType)} w={'16px'} mr={'6px'} />
                      <Text
                        whiteSpace="nowrap"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        mr={'4px'}
                        fontWeight={500}
                      >
                        {item?.menuLabel}
                      </Text>
                    </Flex>
                    {currentIDE === item.value && <MyIcon name="check" w={'12px'} />}
                  </Flex>
                </MenuItem>
              );
            }
          })}
        </MenuList>
      </Menu>

      {!guideIDE && isGuide && (
        <Center
          borderRadius={'12px'}
          zIndex={99}
          border={'2px solid #2563EB'}
          position={'absolute'}
          top={'-6px'}
          left={'-104px'}
          w={'240px'}
          h={'280px'}
        >
          <Box
            position={'absolute'}
            top={'50%'}
            left={'105%'}
            width={'250px'}
            bg={'#2563EB'}
            p={'12px'}
            borderRadius={'12px'}
            color={'#fff'}
          >
            <Flex alignItems={'center'} justifyContent={'space-between'}>
              <Text color={'#fff'} fontSize={'14px'} fontWeight={600}>
                {t('driver.code_in_ide')}
              </Text>
              <Box
                cursor={'pointer'}
                ml={'auto'}
                onClick={() => {
                  startDriver(quitGuideDriverObj(t));
                }}
              >
                <X width={'16px'} height={'16px'} />
              </Box>
            </Flex>
            <Text mt={'8px'} color={'#FFFFFFCC'} fontSize={'14px'} fontWeight={400}>
              {t('driver.choose_ide')}
            </Text>
            <Flex justifyContent={'space-between'} alignItems={'center'} mt={'16px'}>
              <Text fontSize={'13px'} fontWeight={500}>
                4/5
              </Text>
              <Center
                color={'#fff'}
                fontSize={'14px'}
                fontWeight={500}
                cursor={'pointer'}
                borderRadius={'8px'}
                background={'rgba(255, 255, 255, 0.20)'}
                w={'fit-content'}
                h={'32px'}
                p={'8px'}
                onClick={() => {
                  setguideIDE(true);
                  startDriver(startManageAndDeploy(t));
                }}
              >
                {t('driver.next')}
              </Center>
            </Flex>
            <Box
              position={'absolute'}
              top={'20px'}
              left={'-18px'}
              width={0}
              height={0}
              borderTop={'8px solid transparent'}
              borderLeft={'8px solid transparent'}
              borderBottom={'8px solid transparent'}
              borderRight={'10px solid #2563EB'}
            />
          </Box>
        </Center>
      )}

      {!guideIDE && isGuide && (
        <Portal>
          <Box
            position="fixed"
            top={0}
            left={0}
            right={0}
            bottom={0}
            zIndex={98}
            onClick={() => {
              setguideIDE(true);
              startDriver(startManageAndDeploy(t));
            }}
            cursor="pointer"
          />
        </Portal>
      )}

      {!!onOpenJetbrainsModal && !!jetbrainsGuideData && (
        <JetBrainsGuideModal
          onSuccess={() => {}}
          onClose={() => setOnOpenJetbrainsModal(false)}
          jetbrainsGuideData={jetbrainsGuideData}
        />
      )}
      {!!onOpenToolboxModal && !!jetbrainsGuideData && (
        <ToolboxModal
          onSuccess={() => {}}
          onClose={() => setOnOpenToolboxModal(false)}
          jetbrainsGuideData={jetbrainsGuideData}
        />
      )}
    </Flex>
  );
};

export const ideObj = {
  vscode: {
    label: 'VSCode',
    menuLabel: 'VSCode',
    icon: 'vscode',
    prefix: 'vscode://',
    value: 'vscode',
    sortId: 0,
    group: ''
  },
  vscodeInsiders: {
    label: 'Insiders',
    menuLabel: 'VSCode Insiders',
    icon: 'vscodeInsiders',
    prefix: 'vscode-insiders://',
    value: 'vscodeInsiders',
    sortId: 1,
    group: ''
  },
  cursor: {
    label: 'Cursor',
    menuLabel: 'Cursor',
    icon: 'cursor',
    prefix: 'cursor://',
    value: 'cursor',
    sortId: 2,
    group: ''
  },
  windsurf: {
    label: 'Windsurf',
    menuLabel: 'Windsurf',
    icon: 'windsurf',
    prefix: 'windsurf://',
    value: 'windsurf',
    sortId: 3,
    group: ''
  },
  trae: {
    label: 'Trae',
    menuLabel: 'Trae',
    icon: 'trae',
    prefix: 'trae://',
    value: 'trae',
    sortId: 4,
    group: 'trae'
  },
  traeCN: {
    label: 'Trae CN',
    menuLabel: 'Trae CN',
    icon: 'trae',
    prefix: 'trae-cn://',
    value: 'traeCN',
    sortId: 4,
    group: 'trae'
  },
  toolbox: {
    label: 'Toolbox',
    icon: 'toolbox',
    menuLabel: 'Toolbox',
    prefix: '-',
    value: 'toolbox',
    sortId: 5,
    group: 'jetbrains'
  },
  gateway: {
    label: 'Gateway',
    icon: 'gateway',
    menuLabel: 'Gateway',
    prefix: '-',
    value: 'gateway',
    sortId: 5,
    group: 'jetbrains'
  }
} as const;

const getIconName = (
  ide: IDEType
):
  | 'link'
  | 'search'
  | 'template'
  | 'ellipse'
  | 'cursor'
  | 'vscode'
  | 'vscodeInsiders'
  | 'windsurf'
  | 'trae'
  | 'gateway'
  | 'toolbox' => {
  if (ide === 'traeCN') return 'trae';
  return ide;
};

const menuItems = Object.values(ideObj)
  .sort((a, b) => a.sortId - b.sortId)
  .reduce((acc, item) => {
    if (item.group === 'trae' && !acc.some((i) => i.group === 'trae')) {
      acc.push({
        value: 'trae-group',
        menuLabel: 'Trae',
        group: 'trae',
        options: [
          { value: 'trae', menuLabel: 'Trae' },
          { value: 'traeCN', menuLabel: 'Trae CN' }
        ]
      });
    } else if (item.group === 'jetbrains' && !acc.some((i) => i.group === 'jetbrains')) {
      acc.push({
        value: 'jetbrains-group',
        menuLabel: 'JetBrains',
        group: 'jetbrains',
        options: [
          { value: 'toolbox', menuLabel: 'Toolbox' },
          { value: 'gateway', menuLabel: 'Gateway' }
        ]
      });
    } else if (item.group === '') {
      acc.push({ value: item.value, menuLabel: item.menuLabel });
    }
    return acc;
  }, [] as MenuItem[]);

export default IDEButton;

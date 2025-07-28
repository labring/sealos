import Notification from '@/components/notification';
import { useCopyData } from '@/hooks/useCopyData';
import { useConfigStore } from '@/stores/config';
import useSessionStore from '@/stores/session';
import download from '@/utils/downloadFIle';
import {
  Box,
  Center,
  Divider,
  Flex,
  Image,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useBreakpointValue,
  useColorMode,
  useDisclosure
} from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import RegionToggle from '../region/RegionToggle';
import WorkspaceToggle from '../team/WorkspaceToggle';
import useAppStore from '@/stores/app';
import {
  ArrowLeftRight,
  Bell,
  Copy,
  CreditCard,
  FileCode,
  Gift,
  Globe,
  LogOut,
  User
} from 'lucide-react';
import AccountCenter from './AccountCenter';
import { useLanguageSwitcher } from '@/hooks/useLanguageSwitcher';
import { CopyIcon } from '@sealos/ui';
import { useGuideModalStore } from '@/stores/guideModal';
import SecondaryLinks from '../SecondaryLinks';

const baseItemStyle = {
  minW: '36px',
  h: '40px',
  fontSize: '14px',
  fontWeight: '500',
  color: 'primary',
  _hover: {
    background: 'secondary'
  }
};

export default function Account() {
  const { layoutConfig } = useConfigStore();
  const router = useRouter();
  const { copyData } = useCopyData();
  const { t, i18n } = useTranslation();
  const { delSession, session, setToken } = useSessionStore();
  const user = session?.user;
  const queryclient = useQueryClient();
  const kubeconfig = session?.kubeconfig || '';
  const showDisclosure = useDisclosure();
  const [notificationAmount, setNotificationAmount] = useState(0);
  const { installedApps, openApp, openDesktopApp } = useAppStore();
  const { colorMode, toggleColorMode } = useColorMode();
  const { openGuideModal, setInitGuide, initGuide } = useGuideModalStore();
  const { toggleLanguage, currentLanguage } = useLanguageSwitcher();
  const onAmount = useCallback((amount: number) => setNotificationAmount(amount), []);
  const [showNsId, setShowNsId] = useState(false);

  const logout = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    delSession();
    queryclient.clear();
    router.replace('/signin');
    setToken('');
  };

  const openReferralApp = () => {
    openDesktopApp({
      appKey: 'system-invite',
      pathname: '/'
    });
  };

  useEffect(() => {
    if (initGuide) {
      openGuideModal();
    }
  }, [initGuide, openGuideModal]);

  return (
    <Box position={'relative'} flex={1} w={'full'}>
      <Flex alignItems={'center'} height={'100%'} zIndex={3} w={'full'}>
        <Flex alignItems={'center'} flex={'1 1 auto'} minW={0}>
          <Center
            display={{
              base: 'none',
              sm: 'flex'
            }}
            draggable={false}
            mr={'12px'}
            boxSize={'36px'}
            borderRadius={'10px'}
            border={'1px solid rgba(0, 0, 0, 0.05)'}
            background={'linear-gradient(180deg, #FFF 0%, #FAFCFF 100%)'}
            boxShadow={
              '0px -1px 3px 0px rgba(191, 202, 219, 0.05), 0px 4.5px 4px 0px rgba(191, 202, 219, 0.35)'
            }
          >
            <Image draggable={false} src={'/logo.svg'} alt="Logo" width="28px" height="28px" />
          </Center>
          <RegionToggle />
          <Center mx={'3px'}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="8"
              height="24"
              viewBox="0 0 8 24"
              fill="none"
            >
              <path
                d="M1 22.625L6.69402 1.37463"
                stroke="black"
                strokeOpacity="0.15"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </Center>
          <WorkspaceToggle />
        </Flex>

        <Flex
          ml={'20px'}
          gap={'12px'}
          position={'relative'}
          zIndex={3}
          height={'100%'}
          alignItems={'center'}
        >
          {/* <LangSelectSimple /> */}
          {/* <CustomTooltip placement={'bottom'} label={t('common:language')}>
            <Center>
            </Center>
          </CustomTooltip> */}

          {/* {layoutConfig?.common.githubStarEnabled && (
            <CustomTooltip placement="bottom" label={t('common:github')}>
              <Center>
                <GithubComponent {...baseItemStyle} />
              </Center>
            </CustomTooltip>
          )} */}

          {/* <ThemeToggle /> */}

          <SecondaryLinks />

          <Notification key={'notification'} disclosure={showDisclosure} onAmount={onAmount}>
            <Center
              {...baseItemStyle}
              tabIndex={0}
              boxSize={'36px'}
              cursor={'pointer'}
              borderRadius={'full'}
              border={'1px solid rgba(0, 0, 0, 0.05)'}
              onClick={() => showDisclosure.onToggle()}
            >
              <Bell size={16} color={'#262626'} />
            </Center>
          </Notification>

          <Menu>
            <MenuButton height={'36px'} width={'36px'}>
              <Center boxSize={'36px'} bg={'#9FC0FF'} borderRadius="full" mr={'8px'}>
                <Image
                  width={user?.avatar && user.avatar.trim() !== '' ? 'full' : '36px'}
                  height={user?.avatar && user.avatar.trim() !== '' ? 'full' : '36px'}
                  objectFit={'cover'}
                  borderRadius="full"
                  src={user?.avatar}
                  fallbackSrc={'/images/default-user.svg'}
                  alt="user avator"
                  draggable={'false'}
                />
              </Center>
            </MenuButton>
            <MenuList p="0" borderRadius="12px" overflow="hidden" boxShadow="lg" minW="246px">
              <Box p="16px">
                <Text color={'primary'} fontSize="16px" fontWeight="500" mb="4px">
                  {user?.name}
                </Text>
                <Flex alignItems={'center'} gap={'4px'}>
                  <Text
                    color={'muted-foreground'}
                    fontSize="14px"
                    lineHeight={'14px'}
                    cursor="pointer"
                    onClick={() => setShowNsId((s) => !s)}
                  >
                    {showNsId ? `NS: ${user?.nsid}` : `ID: ${user?.userId}`}
                  </Text>
                  <Copy
                    cursor={'pointer'}
                    onClick={() => {
                      if (user?.userId && user.nsid) copyData(showNsId ? user?.nsid : user?.userId);
                    }}
                    size={12}
                    color={'#71717A'}
                  />
                </Flex>
              </Box>
              <Divider bg={'#E4E4E7'} />
              <Box p={'8px'}>
                {layoutConfig?.common.accountSettingEnabled && (
                  <AccountCenter>
                    <MenuItem
                      _focus={{ bg: 'transparent' }}
                      mt="0px"
                      py="6px"
                      px="8px"
                      borderRadius="8px"
                      _hover={{ bg: '#F4F4F5' }}
                    >
                      <Flex alignItems="center" gap="8px">
                        <Center w="20px" h="20px">
                          <User size={16} color="#737373" />
                        </Center>
                        <Text fontSize="14px" fontWeight="400">
                          {t('common:account_settings')}
                        </Text>
                      </Flex>
                    </MenuItem>
                  </AccountCenter>
                )}

                {/* <MenuItem
                  py="6px"
                  px="8px"
                  borderRadius="8px"
                  _hover={{ bg: '#F4F4F5' }}
                  onClick={() => {
                    openAccountCenterApp('plan');
                  }}
                >
                  <Flex alignItems="center" gap="8px">
                    <Center w="20px" h="20px">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M12.3697 13.984C12.7518 13.9626 13.0197 13.9127 13.2475 13.7967C13.5987 13.6177 13.8843 13.3322 14.0632 12.9809C14.2667 12.5816 14.2667 12.0589 14.2667 11.0135V4.98683C14.2667 3.9414 14.2667 3.41868 14.0632 3.01938C13.8843 2.66814 13.5987 2.38258 13.2475 2.20362C13.0197 2.08758 12.7518 2.03772 12.3697 2.0163C12.3718 2.17726 12.3718 2.35722 12.3718 2.56016V3.2188C12.3841 3.2197 12.3963 3.22063 12.4083 3.22161C12.6412 3.24064 12.6984 3.27059 12.7025 3.27274C12.8279 3.33665 12.9301 3.43873 12.994 3.56417C12.9962 3.56826 13.0262 3.62559 13.0452 3.85852C13.0657 4.1096 13.0667 4.44431 13.0667 4.98683V11.0135C13.0667 11.556 13.0657 11.8907 13.0452 12.1418C13.0262 12.3747 12.9962 12.4319 12.9941 12.436C12.9302 12.5614 12.8281 12.6636 12.7027 12.7275C12.6986 12.7297 12.6412 12.7597 12.4083 12.7787C12.3963 12.7797 12.3841 12.7806 12.3718 12.7815V13.4402C12.3718 13.6431 12.3718 13.8231 12.3697 13.984Z"
                          fill="#71717A"
                        />
                        <path
                          d="M3.62824 13.9839C3.24722 13.9624 2.97989 13.9125 2.75256 13.7967C2.40132 13.6177 2.11576 13.3322 1.93679 12.9809C1.73334 12.5816 1.73334 12.0589 1.73334 11.0135V4.98683C1.73334 3.9414 1.73334 3.41868 1.93679 3.01938C2.11576 2.66814 2.40132 2.38258 2.75256 2.20362C2.97989 2.08779 3.24722 2.0379 3.62824 2.01641V3.2188C3.61586 3.21969 3.60368 3.22063 3.5917 3.22161C3.35877 3.24064 3.30161 3.27059 3.29751 3.27274C3.17207 3.33665 3.06992 3.43873 3.006 3.56417C3.00386 3.56826 2.97381 3.62559 2.95478 3.85852C2.93427 4.10959 2.93334 4.44431 2.93334 4.98683V11.0135C2.93334 11.556 2.93427 11.8907 2.95478 12.1418C2.97381 12.3747 3.00377 12.4319 3.00591 12.436C3.06983 12.5614 3.1719 12.6636 3.29734 12.7275C3.30145 12.7296 3.35879 12.7597 3.5917 12.7787C3.60368 12.7797 3.61586 12.7806 3.62824 12.7815V13.9839Z"
                          fill="#71717A"
                        />
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M9.16618 2.66683H6.83383C6.36378 2.66683 6.09144 2.66787 5.89152 2.6842C5.80344 2.6914 5.75686 2.69999 5.73748 2.70432C5.69929 2.72704 5.66737 2.75896 5.64465 2.79715C5.64032 2.81653 5.63172 2.86312 5.62453 2.9512C5.6082 3.15111 5.60716 3.42345 5.60716 3.8935V12.1068C5.60716 12.5769 5.6082 12.8492 5.62453 13.0491C5.63173 13.1372 5.64032 13.1838 5.64465 13.2032C5.66737 13.2414 5.69929 13.2733 5.73748 13.296C5.75686 13.3003 5.80345 13.3089 5.89152 13.3161C6.09144 13.3325 6.36378 13.3335 6.83383 13.3335H9.16618C9.63622 13.3335 9.90856 13.3325 10.1085 13.3161C10.1966 13.3089 10.2431 13.3003 10.2625 13.296C10.3007 13.2733 10.3326 13.2414 10.3554 13.2032C10.3597 13.1838 10.3683 13.1372 10.3755 13.0491C10.3918 12.8492 10.3928 12.5769 10.3928 12.1068V3.8935C10.3928 3.42345 10.3918 3.15111 10.3755 2.9512C10.3683 2.86311 10.3597 2.81653 10.3554 2.79715C10.3326 2.75896 10.3007 2.72704 10.2625 2.70432C10.2431 2.69999 10.1966 2.6914 10.1085 2.6842C9.90856 2.66787 9.63622 2.66683 9.16618 2.66683ZM10.2736 2.70712L10.2726 2.70681L10.2736 2.70712ZM10.3526 13.2143L10.3529 13.2133L10.3526 13.2143ZM5.72636 13.2932L5.72738 13.2935L5.72636 13.2932ZM4.44821 2.20711C4.27382 2.54937 4.27382 2.99741 4.27382 3.8935V12.1068C4.27382 13.0029 4.27382 13.451 4.44821 13.7932C4.60161 14.0943 4.84638 14.339 5.14744 14.4924C5.4897 14.6668 5.93774 14.6668 6.83383 14.6668H9.16618C10.0623 14.6668 10.5103 14.6668 10.8526 14.4924C11.1536 14.339 11.3984 14.0943 11.5518 13.7932C11.7262 13.451 11.7262 13.0029 11.7262 12.1068V3.8935C11.7262 2.99741 11.7262 2.54937 11.5518 2.20711C11.3984 1.90605 11.1536 1.66128 10.8526 1.50789C10.5103 1.3335 10.0623 1.3335 9.16618 1.3335H6.83383C5.93774 1.3335 5.4897 1.3335 5.14744 1.50789C4.84638 1.66128 4.60161 1.90605 4.44821 2.20711Z"
                          fill="#71717A"
                        />
                      </svg>
                    </Center>
                    <Text fontSize="14px" fontWeight="400">
                      {t('common:plan')}
                    </Text>
                  </Flex>
                </MenuItem> */}

                {layoutConfig?.version === 'cn' && (
                  <MenuItem
                    mt="0px"
                    py="6px"
                    px="8px"
                    borderRadius="8px"
                    _hover={{ bg: '#F4F4F5' }}
                    onClick={openReferralApp}
                  >
                    <Flex alignItems="center" gap="8px">
                      <Center w="20px" h="20px">
                        <Gift size={16} color="#737373" />
                      </Center>
                      <Text fontSize="14px" fontWeight="400">
                        {t('common:referral')}
                      </Text>
                    </Flex>
                  </MenuItem>
                )}
              </Box>
              <Divider bg={'#E4E4E7'} />
              <Box p={'8px'}>
                {/* <MenuItem
                  py="6px"
                  px="8px"
                  borderRadius="8px"
                  _hover={{ bg: '#F4F4F5' }}
                  onClick={() => kubeconfig && download('kubeconfig.yaml', kubeconfig)}
                >
                  <Flex alignItems="center" gap="8px" justifyContent="space-between" width="100%">
                    <Flex alignItems="center" gap="8px">
                      <Center w="20px" h="20px">
                        <Palette size={16} color="#737373" />
                      </Center>
                      <Text fontSize="14px" fontWeight="400">
                        {t('common:theme')}
                      </Text>
                    </Flex>
                  </Flex>
                </MenuItem> */}
                <MenuItem
                  py="6px"
                  px="8px"
                  borderRadius="8px"
                  _hover={{ bg: '#F4F4F5' }}
                  onClick={() => kubeconfig && download('kubeconfig.yaml', kubeconfig)}
                >
                  <Flex alignItems="center" gap="8px" justifyContent="space-between" width="100%">
                    <Flex alignItems="center" gap="8px">
                      <Center w="20px" h="20px">
                        <FileCode size={16} color="#737373" />
                      </Center>
                      <Text fontSize="14px" fontWeight="400">
                        Kubeconfig
                      </Text>
                    </Flex>
                    <Box
                      p="2px"
                      cursor="pointer"
                      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                        e.stopPropagation();
                        kubeconfig && copyData(kubeconfig);
                      }}
                    >
                      <Copy size={16} color="#737373" />
                    </Box>
                  </Flex>
                </MenuItem>

                {layoutConfig?.version === 'cn' && (
                  <MenuItem
                    py="6px"
                    px="8px"
                    borderRadius="8px"
                    _hover={{ bg: '#F4F4F5' }}
                    onClick={toggleLanguage}
                  >
                    <Flex alignItems="center" gap="8px" justifyContent="space-between" width="100%">
                      <Flex alignItems="center" gap="8px">
                        <Center w="20px" h="20px">
                          <Globe size={16} color="#737373" />
                        </Center>
                        <Text fontSize="14px" fontWeight="400">
                          {currentLanguage === 'zh' ? '中文' : 'English'}
                        </Text>
                      </Flex>
                      <Box p="2px" cursor="pointer">
                        <ArrowLeftRight size={16} color="#737373" />
                      </Box>
                    </Flex>
                  </MenuItem>
                )}
              </Box>

              <Divider bg={'#E4E4E7'} />
              <Box p="8px">
                <MenuItem
                  py="6px"
                  px="8px"
                  borderRadius="8px"
                  _hover={{ bg: '#F4F4F5' }}
                  onClick={logout}
                >
                  <Flex alignItems="center" gap="8px" justifyContent="space-between" width="100%">
                    <Flex alignItems="center" gap="8px">
                      <Center w="20px" h="20px">
                        <LogOut size={16} color="#737373" />
                      </Center>
                      <Text fontSize="14px" fontWeight="400">
                        {t('common:log_out')}
                      </Text>
                    </Flex>
                  </Flex>
                </MenuItem>
              </Box>
            </MenuList>
          </Menu>
        </Flex>

        {/*
        {layoutConfig?.common.workorderEnabled && (
          <Flex
            borderBottom={'1px solid rgba(255, 255, 255, 0.05)'}
            color={'white'}
            fontSize={'base'}
            fontWeight={'bold'}
            justifyContent={'space-between'}
            alignItems={'center'}
            py={'12px'}
            px={'16px'}
          >
            <Text>{t('common:work_order')}</Text>
            <IconButton
              variant={'white-bg-icon'}
              p="4px"
              onClick={openWorkOrderApp}
              icon={<ArrowIcon fill={'rgba(255, 255, 255, 0.7)'} />}
              aria-label={'setting'}
            />
          </Flex>
        )}
        <Flex
          color={'white'}
          fontSize={'base'}
          fontWeight={'bold'}
          justifyContent={'space-between'}
          alignItems={'center'}
          py={'12px'}
          px={'16px'}
        >
          <Text>Kubeconfig</Text>
          <Flex alignItems={'center'}>
            <IconButton
              variant={'white-bg-icon'}
              p="4px"
              ml="auto"
              mr="4px"
              onClick={() => kubeconfig && download('kubeconfig.yaml', kubeconfig)}
              icon={
                <DownloadIcon
                  boxSize={'16px'}
                  color={'rgba(255, 255, 255, 0.7)'}
                  fill={'rgba(255, 255, 255, 0.7)'}
                />
              }
              aria-label={'Download kc'}
            />
            <IconButton
              variant={'white-bg-icon'}
              p="4px"
              onClick={() => kubeconfig && copyData(kubeconfig)}
              icon={<CopyIcon boxSize={'16px'} fill={'rgba(255, 255, 255, 0.7)'} />}
              aria-label={'copy kc'}
            />
          </Flex>
        </Flex> */}
      </Flex>
    </Box>
  );
}

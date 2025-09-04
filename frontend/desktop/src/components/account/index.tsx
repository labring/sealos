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
  Dock,
  FileCode,
  Gift,
  Globe,
  LogOut,
  ReceiptText,
  User
} from 'lucide-react';
import AccountCenter from './AccountCenter';
import { useLanguageSwitcher } from '@/hooks/useLanguageSwitcher';
import { useGuideModalStore } from '@/stores/guideModal';
import SecondaryLinks from '../SecondaryLinks';
import { useSubscriptionStore } from '@/stores/subscription';
import { getPlanBackground } from './BalancePopover';

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
  const { t } = useTranslation();
  const { delSession, session, setToken } = useSessionStore();
  const user = session?.user;
  const queryclient = useQueryClient();
  const kubeconfig = session?.kubeconfig || '';
  const showDisclosure = useDisclosure();
  const [, setNotificationAmount] = useState(0);
  const { openDesktopApp, autolaunch } = useAppStore();
  const { openGuideModal, initGuide, autoOpenBlocked, blockAutoOpen } = useGuideModalStore();
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

  const openCostcenterApp = ({ page = 'plan', mode = '' }: { page?: string; mode?: string }) => {
    openDesktopApp({
      appKey: 'system-costcenter',
      pathname: '/',
      query: {
        page: page,
        mode: mode
      }
    });
  };

  const openReferralApp = () => {
    openDesktopApp({
      appKey: 'system-invite',
      pathname: '/'
    });
  };

  const isNarrowScreen =
    useBreakpointValue({
      base: true,
      md: false
    }) ?? true;

  useEffect(() => {
    // [TODO] Guide is currently not compatible with narrow screen.
    // Do not show guide above auto opened windows.
    if (Object.hasOwn(router.query, 'openapp') || autolaunch) {
      blockAutoOpen();
      return;
    }

    if (initGuide && !isNarrowScreen && !autoOpenBlocked) {
      openGuideModal();
    }
  }, [initGuide, openGuideModal, isNarrowScreen, autoOpenBlocked]);
  const { subscriptionInfo, fetchSubscriptionInfo } = useSubscriptionStore();

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
                <MenuItem
                  mt="0px"
                  py="6px"
                  px="8px"
                  borderRadius="8px"
                  _hover={{ bg: '#F4F4F5' }}
                  onClick={() => openCostcenterApp({ page: 'plan', mode: '' })}
                >
                  <Flex alignItems="center" gap="8px">
                    <Center w="20px" h="20px">
                      <Dock size={16} color="#737373" />
                    </Center>
                    <Text fontSize="14px" fontWeight="400">
                      {t('common:plan')}
                    </Text>
                    <div
                      style={{
                        background: getPlanBackground(subscriptionInfo?.subscription)
                      }}
                      className="text-blue-600 rounded px-1 flex items-center justify-center uppercase text-xs font-medium"
                    >
                      {subscriptionInfo?.subscription?.PlanName || 'payg'}
                    </div>
                  </Flex>
                </MenuItem>

                <MenuItem
                  mt="0px"
                  py="6px"
                  px="8px"
                  borderRadius="8px"
                  _hover={{ bg: '#F4F4F5' }}
                  onClick={() => openCostcenterApp({ page: 'billing', mode: '' })}
                >
                  <Flex alignItems="center" gap="8px">
                    <Center w="20px" h="20px">
                      <ReceiptText size={16} color="#737373" />
                    </Center>
                    <Text fontSize="14px" fontWeight="400">
                      {t('common:billing')}
                    </Text>
                  </Flex>
                </MenuItem>

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

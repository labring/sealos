import Notification from '@/components/notification';
import { useCopyData } from '@/hooks/useCopyData';
import { useConfigStore } from '@/stores/config';
import useSessionStore from '@/stores/session';
import download from '@/utils/downloadFIle';
import { clearSharedAuthCookie } from '@/utils/cookieUtils';
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
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Text,
  useBreakpointValue,
  useDisclosure,
  useToast
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
  ArrowRight,
  Bell,
  ChevronRight,
  Copy,
  Dock,
  FileCode,
  Globe,
  LogOut,
  ReceiptText,
  RefreshCw,
  User
} from 'lucide-react';
import AccountCenter from './AccountCenter';
import { useLanguageSwitcher } from '@/hooks/useLanguageSwitcher';
import { useGuideModalStore } from '@/stores/guideModal';
import SecondaryLinks from '../SecondaryLinks';
import { useSubscriptionStore } from '@/stores/subscription';
import { Badge } from '@sealos/shadcn-ui/badge';
import { Button } from '@sealos/shadcn-ui/button';
import { cn } from '@sealos/shadcn-ui';
import { getPlanBackgroundClass } from '@/utils/styling';
import { AlertSettings } from './AlertSettings';
import { rotateKubeconfig } from '@/api/auth';

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
  const { layoutConfig, authConfig, isLoaded: configLoaded } = useConfigStore();
  const router = useRouter();
  const { copyData } = useCopyData();
  const { t } = useTranslation();
  const { delSession, session, setToken, setSessionProp } = useSessionStore();
  const user = session?.user;
  const queryclient = useQueryClient();
  const kubeconfig = session?.kubeconfig || '';
  const toast = useToast();
  const showDisclosure = useDisclosure();
  const communityDisclosure = useDisclosure();
  const [, setNotificationAmount] = useState(0);
  const { openDesktopApp, autolaunch } = useAppStore();
  const { openGuideModal, initGuide, autoOpenBlocked, blockAutoOpen } = useGuideModalStore();
  const { toggleLanguage, currentLanguage } = useLanguageSwitcher();
  const onAmount = useCallback((amount: number) => setNotificationAmount(amount), []);
  const [showNsId, setShowNsId] = useState(false);
  const [alertSettingsOpen, setAlertSettingsOpen] = useState(false);
  const [isRotatingKubeconfig, setIsRotatingKubeconfig] = useState(false);

  const emailAlertEnabled = layoutConfig?.common.emailAlertEnabled && authConfig?.idp.email.enabled;
  const phoneAlertEnabled = layoutConfig?.common.phoneAlertEnabled && authConfig?.idp.sms.enabled;
  const alertSettingsEnabled = emailAlertEnabled || phoneAlertEnabled;
  const communityEnabled = layoutConfig?.common.communityEnabled !== false;
  const communityQRCodeImage = layoutConfig?.common.communityQRCodeImage;
  const communityLink = layoutConfig?.common.communityLink;

  const logout = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    clearSharedAuthCookie(); // Clear shared cookie for cross-domain logout
    delSession();
    queryclient.clear();
    router.replace('/signin');
    setToken('');
  };

  const handleRotateKubeconfig = async (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (isRotatingKubeconfig) return;

    try {
      setIsRotatingKubeconfig(true);
      toast({
        title: t('kubeconfig_rotating'),
        status: 'info',
        duration: 3000,
        isClosable: true,
        position: 'top'
      });

      const res = await rotateKubeconfig();

      if (res.code === 200 && res.data?.kubeconfig) {
        // Update session with new kubeconfig
        setSessionProp('kubeconfig', res.data.kubeconfig);

        toast({
          title: t('kubeconfig_rotated_successfully'),
          status: 'success',
          duration: 3000,
          isClosable: true,
          position: 'top'
        });
      } else {
        throw new Error(res.message || 'Failed to rotate kubeconfig');
      }
    } catch (error: any) {
      console.error('Failed to rotate kubeconfig:', error);
      toast({
        title: t('kubeconfig_rotation_failed'),
        description: error?.message || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top'
      });
    } finally {
      setIsRotatingKubeconfig(false);
    }
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
  const { subscriptionInfo } = useSubscriptionStore();

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
            <Image
              draggable={false}
              src={layoutConfig?.logo}
              fallbackSrc={'/logo.svg'}
              alt="Logo"
              width="28px"
              height="28px"
              opacity={configLoaded ? '1' : '0'}
              transitionProperty={'opacity'}
              transitionDuration={'0.3s'}
              transitionTimingFunction={'cubic-bezier(0.4, 0, 0.2, 1)'}
            />
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
                  onClick={() => setAlertSettingsOpen(true)}
                  display={alertSettingsEnabled ? 'block' : 'none'}
                >
                  <Flex alignItems="center" gap="8px">
                    <Center w="20px" h="20px">
                      <Bell size={16} color="#737373" />
                    </Center>
                    <Text fontSize="14px" fontWeight="400">
                      {t('common:alert_settings.menu_item')}
                    </Text>
                  </Flex>
                </MenuItem>
                {layoutConfig?.common.subscriptionEnabled && (
                  <MenuItem
                    mt="0px"
                    py="6px"
                    px="8px"
                    borderRadius="8px"
                    _hover={{ bg: '#F4F4F5' }}
                    onClick={() => openCostcenterApp({ page: 'plan' })}
                  >
                    <Flex alignItems="center" gap="8px">
                      <Center w="20px" h="20px">
                        <Dock size={16} color="#737373" />
                      </Center>
                      <Text fontSize="14px" fontWeight="400">
                        {t('common:plan')}
                      </Text>
                      <Badge
                        variant="subscription"
                        className={cn(
                          'px-1 text-xs',
                          getPlanBackgroundClass(
                            subscriptionInfo?.subscription?.PlanName ?? '',
                            !!subscriptionInfo?.subscription,
                            subscriptionInfo?.subscription?.Status?.toLowerCase() === 'debt'
                          )
                        )}
                      >
                        {subscriptionInfo?.subscription?.PlanName || 'payg'}
                      </Badge>
                    </Flex>
                  </MenuItem>
                )}

                <MenuItem
                  mt="0px"
                  py="6px"
                  px="8px"
                  borderRadius="8px"
                  _hover={{ bg: '#F4F4F5' }}
                  onClick={() => openCostcenterApp({ page: 'billing' })}
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
              </Box>
              {communityEnabled && (
                <>
                  <Divider bg={'#E4E4E7'} />

                  <Box p={'8px'}>
                    <MenuItem
                      mt="0px"
                      py="6px"
                      px="8px"
                      borderRadius="8px"
                      bg={'rgba(59, 130, 246, 0.15)'}
                      border={'1px solid rgba(59, 130, 246, 0.15)'}
                      position="relative"
                      overflow="hidden"
                      _before={{
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        bgGradient:
                          'linear(to bottom right, var(--color-background) 13.69%, var(--color-blue-300) 91.5%)',
                        maskImage: "url('/images/hexgrid.svg')",
                        WebkitMaskImage: "url('/images/hexgrid.svg')",
                        maskPosition: 'right center',
                        WebkitMaskPosition: 'right center',
                        maskRepeat: 'no-repeat',
                        WebkitMaskRepeat: 'no-repeat',
                        maskSize: '197px 55px',
                        WebkitMaskSize: '197px 55px',
                        pointerEvents: 'none'
                      }}
                      _hover={{
                        cursor: 'pointer',

                        _before: {
                          bgGradient:
                            'linear(to bottom right, var(--color-background) 13.69%, var(--color-blue-500) 91.5%)'
                        }
                      }}
                      _active={{
                        _before: {
                          bgGradient:
                            'linear(to bottom right, var(--color-background) 13.69%, var(--color-blue-500) 91.5%)'
                        }
                      }}
                      className="group"
                      onClick={communityDisclosure.onOpen}
                    >
                      <Flex
                        alignItems="center"
                        gap="8px"
                        w="full"
                        justifyContent="space-between"
                        position="relative"
                      >
                        <div>
                          <div className="flex gap-2 items-center">
                            <span className="font-medium text-sm">
                              {t('common:community.menu.title')}
                            </span>
                            <span className="font-semibold text-xs text-blue-600 py-0.5 px-2.5 rounded-full border-t-[0.5px] border-l-[0.5px] border-t-blue-500 border-l-blue-500 bg-gradient-to-br from-blue-400/40 to-pink-300/40 inset-shadow-[-1px_-1px_2px_0] inset-shadow-white/50">
                              {t('common:community.menu.badge')}
                            </span>
                          </div>

                          <div>
                            <span className="text-xs">
                              {t('common:community.menu.description')}
                            </span>
                          </div>
                        </div>
                        <div>
                          <ChevronRight className="size-4 text-muted-foreground group-hover:text-blue-600" />
                        </div>
                      </Flex>
                    </MenuItem>
                  </Box>
                </>
              )}

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
                    <Flex alignItems="center" gap="4px">
                      {layoutConfig?.common?.kcRotationEnabled && (
                        <Box
                          p="2px"
                          cursor={isRotatingKubeconfig ? 'not-allowed' : 'pointer'}
                          onClick={handleRotateKubeconfig}
                          opacity={isRotatingKubeconfig ? 0.5 : 1}
                          transition="opacity 0.2s"
                          title={t('refresh_kubeconfig')}
                          _hover={{
                            color: 'blue.600'
                          }}
                          color="#737373"
                          sx={
                            isRotatingKubeconfig
                              ? {
                                  '& svg': {
                                    animation: 'spin 1s linear infinite'
                                  },
                                  '@keyframes spin': {
                                    from: { transform: 'rotate(0deg)' },
                                    to: { transform: 'rotate(360deg)' }
                                  }
                                }
                              : {}
                          }
                        >
                          <RefreshCw size={16} />
                        </Box>
                      )}
                      <Box
                        p="2px"
                        cursor="pointer"
                        onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                          e.stopPropagation();
                          kubeconfig && copyData(kubeconfig);
                        }}
                        _hover={{
                          color: 'blue.600'
                        }}
                        color="#737373"
                      >
                        <Copy size={16} />
                      </Box>
                    </Flex>
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

        <AlertSettings
          open={alertSettingsOpen}
          onOpenChange={setAlertSettingsOpen}
          emailEnabled={emailAlertEnabled}
          phoneEnabled={phoneAlertEnabled}
        />

        <Modal isOpen={communityDisclosure.isOpen} onClose={communityDisclosure.onClose} isCentered>
          <ModalOverlay />
          <ModalContent
            className="relative items-center gap-7 overflow-hidden bg-white p-8"
            width="24rem"
          >
            <div className="pointer-events-none absolute inset-x-0 -top-[20%] h-48 bg-[url('/images/sealos-box.svg')] bg-[length:80%_auto] bg-top bg-no-repeat [mask-image:linear-gradient(to_bottom,black_20%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_20%,transparent_100%)]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-[url('/images/boxgrid.svg')] bg-no-repeat bg-cover bg-top" />
            <ModalCloseButton className="z-20" />
            <h1 className="relative z-10 bg-gradient-to-r from-foreground to-blue-800 bg-clip-text text-2xl font-semibold tracking-tight text-transparent">
              {t('common:community.modal.title')}
            </h1>
            <div className="relative z-10 size-40 rounded-xl border border-blue-500 p-2">
              {communityQRCodeImage && (
                <Image
                  src={communityQRCodeImage}
                  alt={t('common:community.modal.qr_alt')}
                  className="size-full rounded-lg object-cover"
                />
              )}
            </div>
            <span className="relative z-10 text-sm font-medium">
              {t('common:community.modal.description')}
            </span>
            <Button
              className="relative z-10 h-10 w-full"
              disabled={!communityLink}
              onClick={() =>
                communityLink && window.open(communityLink, '_blank', 'noopener,noreferrer')
              }
            >
              {t('common:community.modal.button')}
              <ArrowRight className="size-4" />
            </Button>
          </ModalContent>
        </Modal>

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

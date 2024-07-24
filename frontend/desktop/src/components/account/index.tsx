import Notification from '@/components/notification';
import { useCopyData } from '@/hooks/useCopyData';
import { useConfigStore } from '@/stores/config';
import useSessionStore from '@/stores/session';
import download from '@/utils/downloadFIle';
import { Box, Center, Flex, IconButton, Image, Text, useDisclosure } from '@chakra-ui/react';
import { CopyIcon, DocsIcon, DownloadIcon, LogoutIcon, NotificationIcon } from '@sealos/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useCallback, useState } from 'react';
import LangSelectSimple from '../LangSelect/simple';
import { blurBackgroundStyles } from '../desktop_content';
import RegionToggle from '../region/RegionToggle';
import WorkspaceToggle from '../team/WorkspaceToggle';
import GithubComponent from './github';
import { ArrowIcon } from '../icons';
import useAppStore from '@/stores/app';
import AccountCenter from './AccountCenter';

const baseItemStyle = {
  w: '52px',
  h: '40px',
  background: 'rgba(255, 255, 255, 0.07)',
  color: 'white',
  borderRadius: '100px',
  _hover: {
    background: 'rgba(255, 255, 255, 0.15)'
  }
};

export default function Account() {
  const { layoutConfig } = useConfigStore();
  const [showId, setShowId] = useState(true);
  const router = useRouter();
  const { copyData } = useCopyData();
  const { t } = useTranslation();
  const { delSession, session, setToken } = useSessionStore();
  const user = session?.user;
  const queryclient = useQueryClient();
  const kubeconfig = session?.kubeconfig || '';
  const showDisclosure = useDisclosure();
  const [notificationAmount, setNotificationAmount] = useState(0);
  const { installedApps, openApp } = useAppStore();

  const onAmount = useCallback((amount: number) => setNotificationAmount(amount), []);

  const logout = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    delSession();
    queryclient.clear();
    router.replace('/signin');
    setToken('');
  };

  const openWorkOrderApp = () => {
    const workorder = installedApps.find((t) => t.key === 'system-workorder');
    if (!workorder) return;
    openApp(workorder);
  };

  return (
    <Box position={'relative'} flex={1}>
      <Flex position={'relative'} zIndex={3} px={'16px'} pt={'20px'} flexDirection={'column'}>
        <Flex alignItems={'center'}>
          <Center width={'36px'} height={'36px'} bg={'white'} borderRadius="full" mr={'8px'}>
            <Image
              width={user?.avatar && 'full'}
              height={user?.avatar && 'full'}
              objectFit={'cover'}
              borderRadius="full"
              src={user?.avatar || ''}
              fallbackSrc={'/images/default-user.svg'}
              alt="user avator"
              draggable={'false'}
            />
          </Center>
          <Box>
            <Text lineHeight={'20px'} color={'white'} fontSize={'14px'} fontWeight={500}>
              {user?.name}
            </Text>
            <Flex
              cursor={'pointer'}
              gap="2px"
              fontSize={'11px'}
              lineHeight={'16px'}
              fontWeight={'500'}
              color={'rgba(255, 255, 255, 0.70)'}
              alignItems={'center'}
            >
              <Text onClick={() => setShowId((s) => !s)}>
                {showId ? `ID:${user?.userId}` : `NS:${user?.nsid}`}
              </Text>
              <CopyIcon
                onClick={() => {
                  if (user?.userId && user.nsid) copyData(showId ? user?.userId : user?.nsid);
                }}
                boxSize={'12px'}
                fill={'rgba(255, 255, 255, 0.70)'}
              />
            </Flex>
          </Box>
          <Center
            p={'4px'}
            h={'fit-content'}
            borderRadius={'4px'}
            ml={'auto'}
            cursor={'pointer'}
            _hover={{
              background: 'rgba(255, 255, 255, 0.15)'
            }}
          >
            <LogoutIcon boxSize={'14px'} fill={'white'} />
            <Text ml="4px" color={'white'} fontSize={'12px'} fontWeight={500} onClick={logout}>
              {t('common:log_out')}
            </Text>
          </Center>
        </Flex>
        <Flex mt={'16px'} justifyContent={'space-between'} position={'relative'}>
          {layoutConfig?.common.docsUrl && (
            <Center
              cursor={'pointer'}
              {...baseItemStyle}
              onClick={() => window.open(layoutConfig?.common?.docsUrl)}
            >
              <DocsIcon />
            </Center>
          )}
          <LangSelectSimple {...baseItemStyle} />
          {layoutConfig?.common.githubStarEnabled && <GithubComponent {...baseItemStyle} />}
          <Center cursor={'pointer'} {...baseItemStyle} onClick={() => showDisclosure.onOpen()}>
            <NotificationIcon />
          </Center>
          <Notification key={'notification'} disclosure={showDisclosure} onAmount={onAmount} />
        </Flex>

        <RegionToggle />

        <WorkspaceToggle />

        {layoutConfig?.common.accountSettingEnabled && (
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
            <Text>{t('common:account_settings')}</Text>
            <AccountCenter variant={'white-bg-icon'} p="4px" />
          </Flex>
        )}
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
          <Text>kubeconfig</Text>
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
        </Flex>
      </Flex>
      <Box
        id="blur-background"
        zIndex={0}
        position={'absolute'}
        top={0}
        left={0}
        w={'full'}
        h={'full'}
        overflow={'hidden'}
        {...blurBackgroundStyles}
      ></Box>
    </Box>
  );
}

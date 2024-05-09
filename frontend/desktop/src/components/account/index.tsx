import { useCopyData } from '@/hooks/useCopyData';
import request from '@/services/request';
import useSessionStore from '@/stores/session';
import download from '@/utils/downloadFIle';
import {
  Box,
  Flex,
  Image,
  Stack,
  Text,
  type UseDisclosureReturn,
  IconButton,
  HStack,
  VStack
} from '@chakra-ui/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useMemo, useState } from 'react';
import useAppStore from '@/stores/app';
import { ApiResp } from '@/types';
import { formatMoney } from '@/utils/format';
import PasswordModify from './PasswordModify';
import { CopyIcon, DownloadIcon, LogoutIcon } from '@sealos/ui';
import { useConfigStore } from '@/stores/config';

export default function Account({ disclosure }: { disclosure: UseDisclosureReturn }) {
  const [showId, setShowId] = useState(true);
  const passwordEnabled = useConfigStore().authConfig?.idp?.password?.enabled;
  const rechargeEnabled = useConfigStore().commonConfig?.rechargeEnabled;
  const logo = useConfigStore().layoutConfig?.logo;
  const router = useRouter();
  const { copyData } = useCopyData();
  const openApp = useAppStore((s) => s.openApp);
  const installApp = useAppStore((s) => s.installedApps);
  const { t } = useTranslation();
  const { delSession, session, setToken } = useSessionStore();
  const user = session?.user;
  const { data } = useQuery({
    queryKey: ['getAmount', { userId: user?.userCrUid }],
    queryFn: () =>
      request<any, ApiResp<{ balance: number; deductionBalance: number }>>(
        '/api/account/getAmount'
      ),
    enabled: !!user
  });
  const balance = useMemo(() => {
    let real_balance = data?.data?.balance || 0;
    if (data?.data?.deductionBalance) {
      real_balance -= data?.data.deductionBalance;
    }
    return real_balance;
  }, [data]);
  const queryclient = useQueryClient();
  const kubeconfig = session?.kubeconfig || '';
  const logout = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    delSession();
    queryclient.clear();
    router.replace('/signin');
    setToken('');
  };

  return disclosure.isOpen ? (
    <>
      <Box
        position={'fixed'}
        inset={0}
        zIndex={'998'}
        cursor={'initial'}
        onClick={disclosure.onClose}
      ></Box>
      <Box
        w="297px"
        bg="rgba(255, 255, 255, 0.6)"
        boxShadow={'0px 1px 2px rgba(0, 0, 0, 0.2)'}
        position={'absolute'}
        top="48px"
        right={0}
        cursor={'initial'}
        zIndex={'999'}
        borderRadius={'8px'}
        p="20px"
        backdropFilter={'blur(150px)'}
      >
        <Flex justifyContent={'end'} alignItems={'center'} overflow={'hidden'} cursor={'pointer'}>
          <LogoutIcon boxSize={'14px'} color={'#24282C'} />
          <Text ml="6px" color={'#24282C'} fontSize={'12px'} fontWeight={500} onClick={logout}>
            {t('Log Out')}
          </Text>
        </Flex>
        <Flex mt="8px" justifyContent={'center'} alignItems={'center'} flexDirection={'column'}>
          <Image
            width={'80px'}
            height={'80px'}
            borderRadius="full"
            src={user?.avatar}
            fallbackSrc={logo}
            alt="user avator"
          />
          <Text color={'#24282C'} fontSize={'20px'} fontWeight={600}>
            {user?.name}
          </Text>
          <HStack mb="10px" gap="2px">
            <Text
              color={'grayModern.500'}
              fontSize={'12px'}
              cursor={'pointer'}
              onClick={() => setShowId((s) => !s)}
            >
              {showId ? `ID: ${user?.userId}` : `NS: ${user?.nsid}`}
            </Text>
            <IconButton
              variant={'white-bg-icon'}
              p="4px"
              onClick={() => {
                if (user?.userId && user.nsid) copyData(showId ? user?.userId : user?.nsid);
              }}
              icon={<CopyIcon boxSize={'12px'} color={'grayModern.500'} fill={'grayModern.500'} />}
              aria-label={'copy nsid'}
            />
          </HStack>
          <VStack w={'full'} gap={'12px'}>
            <Stack
              direction={'column'}
              width={'100%'}
              bg="rgba(255, 255, 255, 0.6)"
              borderRadius={'8px'}
              fontSize={'13px'}
              gap={'0px'}
            >
              {passwordEnabled && (
                <Flex
                  justify={'space-between'}
                  alignItems={'center'}
                  borderBottom={'1px solid #0000001A'}
                  px="16px"
                  py="11px"
                >
                  <Text>{t('changePassword')}</Text>
                  <PasswordModify mr="0" />
                </Flex>
              )}
              <Flex px="16px" py="11px" alignItems={'center'} borderBottom={'1px solid #0000001A'}>
                <Text>
                  {t('Balance')}: {formatMoney(balance).toFixed(2)}
                </Text>
                {rechargeEnabled && (
                  <Box
                    ml="auto"
                    onClick={() => {
                      const costcenter = installApp.find((t) => t.key === 'system-costcenter');
                      if (!costcenter) return;
                      openApp(costcenter, {
                        query: {
                          openRecharge: 'true'
                        }
                      });
                      disclosure.onClose();
                    }}
                    _hover={{
                      bgColor: 'rgba(0, 0, 0, 0.03)'
                    }}
                    transition={'0.3s'}
                    p="4px"
                    color={'#219BF4'}
                    fontWeight="500"
                    fontSize="12px"
                    cursor={'pointer'}
                  >
                    {t('Charge')}
                  </Box>
                )}
              </Flex>
              {
                <Flex alignItems={'center'} px="16px" py="11px">
                  <Text>kubeconfig</Text>

                  <IconButton
                    variant={'white-bg-icon'}
                    p="4px"
                    ml="auto"
                    mr="4px"
                    onClick={() => kubeconfig && download('kubeconfig.yaml', kubeconfig)}
                    icon={<DownloadIcon boxSize={'16px'} color={'#219BF4'} fill={'#219BF4'} />}
                    aria-label={'Download kc'}
                  />
                  <IconButton
                    variant={'white-bg-icon'}
                    p="4px"
                    onClick={() => kubeconfig && copyData(kubeconfig)}
                    icon={<CopyIcon boxSize={'16px'} color={'#219BF4'} fill={'#219BF4'} />}
                    aria-label={'copy kc'}
                  />
                </Flex>
              }
            </Stack>
          </VStack>
        </Flex>
      </Box>
    </>
  ) : (
    <></>
  );
}

import { useCopyData } from '@/hooks/useCopyData';
import request from '@/services/request';
import useSessionStore from '@/stores/session';
import download from '@/utils/downloadFIle';
import { Box, Flex, Image, Stack, Text, UseDisclosureReturn } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import JsYaml from 'js-yaml';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useContext, useMemo } from 'react';
import Iconfont from '../iconfont';
import { ApiResp } from '@/types';
import { formatMoney } from '@/utils/format';
import { RechargeEnabledContext } from '@/pages';
import useAppStore from '@/stores/app';

export default function Index({ disclosure }: { disclosure: UseDisclosureReturn }) {
  const router = useRouter();
  const rechargeEnabled = useContext(RechargeEnabledContext);
  const { t } = useTranslation();
  const { delSession, getSession } = useSessionStore();
  const { user, kubeconfig } = getSession();
  const { copyData } = useCopyData();
  const userKubeConfigId = useMemo(() => {
    try {
      let temp = JsYaml.load(kubeconfig);
      // @ts-ignore
      return 'ns-' + temp?.users[0]?.name;
    } catch (error) {
      return '';
    }
  }, [kubeconfig]);

  const { data, refetch } = useQuery(['getAccount'], () =>
    request<any, ApiResp<{ balance: number; deductionBalance: number; status: string }>>(
      '/api/account/getAmount'
    )
  );
  const openApp = useAppStore((s) => s.openApp);
  const installApp = useAppStore((s) => s.installedApps);
  const balance = useMemo(() => {
    let real_balance = data?.data?.balance || 0;
    if (data?.data?.deductionBalance) {
      real_balance -= data?.data.deductionBalance;
    }
    return real_balance;
  }, [data]);
  const logout = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    delSession();
    router.reload();
  };
  return disclosure.isOpen ? (
    <>
      <Box position={'fixed'} inset={0} zIndex={'998'} onClick={disclosure.onClose}></Box>
      <Box
        w="297px"
        bg="rgba(255, 255, 255, 0.6)"
        boxShadow={'0px 1px 2px rgba(0, 0, 0, 0.2)'}
        position={'absolute'}
        top="48px"
        right={0}
        zIndex={'999'}
        borderRadius={'8px'}
        p="20px"
        backdropFilter={'blur(150px)'}
      >
        <Flex justifyContent={'end'} alignItems={'center'} overflow={'hidden'}>
          <Iconfont iconName="icon-logout" width={14} height={14} color="#24282C"></Iconfont>
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
            fallbackSrc="/images/sealos.svg"
            alt="user avator"
          />
          <Text color={'#24282C'} fontSize={'20px'} fontWeight={600}>
            {user?.name}
          </Text>
          <Flex alignItems={'center'} mt="4px" color={'#7B838B'}>
            <Text>ID: {userKubeConfigId}</Text>
            <Box ml="4px" onClick={() => copyData(userKubeConfigId)}>
              <Iconfont iconName="icon-copy2" width={16} height={16} color="#7B838B"></Iconfont>
            </Box>
          </Flex>
          <Stack
            direction={'column'}
            width={'100%'}
            mt="24px"
            bg="rgba(255, 255, 255, 0.6)"
            borderRadius={'4px'}
          >
            <Flex h="54px" alignItems={'center'} borderBottom={'1px solid #0000001A'} p="16px">
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
                  color={'#219BF4'}
                  fontWeight="500"
                  fontSize="12px"
                >
                  {t('Charge')}
                </Box>
              )}
            </Flex>
            <Flex h="54px" alignItems={'center'}>
              <Text ml="16px">kubeconfig</Text>

              <Box ml="auto" onClick={() => download('kubeconfig.yaml', kubeconfig)}>
                <Iconfont
                  iconName="icon-download"
                  width={16}
                  height={16}
                  color="#219BF4"
                ></Iconfont>
              </Box>
              <Box ml="8px" mr="20px" onClick={() => copyData(kubeconfig)}>
                <Iconfont iconName="icon-copy2" width={16} height={16} color="#219BF4"></Iconfont>
              </Box>
            </Flex>
          </Stack>
        </Flex>
      </Box>
    </>
  ) : (
    <></>
  );
}

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
  PopoverTrigger,
  Popover,
  PopoverContent,
  PopoverBody,
  PopoverHeader
} from '@chakra-ui/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useContext, useMemo } from 'react';
import Iconfont from '../iconfont';
import useAppStore from '@/stores/app';

import { ApiResp, Session } from '@/types';
import { formatMoney } from '@/utils/format';
import { RechargeEnabledContext } from '@/pages';
import TeamCenter from '@/components/team/TeamCenter';
import NsList from '@/components/team/NsList';
import CreateTeam from '../team/CreateTeam';
import { NamespaceDto } from '@/types/team';
import { switchRequest } from '@/api/namespace';

const NsMenu = () => {
  const { t } = useTranslation();
  const session = useSessionStore((s) => s.session);
  const setSession = useSessionStore((s) => s.setSession);
  const { ns_uid } = session.user;
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: switchRequest,
    onSuccess(data) {
      if (data.code === 200 && !!data.data) {
        setSession(data.data);
        router.reload();
      }
    }
  });
  const switchTeam = async ({ uid }: NamespaceDto) => {
    if (ns_uid !== uid) mutation.mutate(uid);
  };
  return (
    <Popover placement="left">
      <PopoverTrigger>
        {
          // !todo  颜色可以改变
          <Box pl="12px" cursor={'pointer'}>
            <Image
              pr="4px"
              borderRight={'1px'}
              borderColor={'#BDC1C5'}
              color={'#fff'}
              mr="10px"
              src="/images/allVector.svg"
              w="16px"
              h="16px"
            />
          </Box>
        }
      </PopoverTrigger>
      <PopoverContent
        shadow={'0px 1.1666667461395264px 2.3333334922790527px 0px rgba(0, 0, 0, 0.2) !important'}
        borderRadius={'8px'}
        p="6px"
        w="250px"
        background="linear-gradient(270deg, #F1F1F1 0%, #EEE 43.75%, #ECECEC 100%)"
      >
        <PopoverHeader p="0">
          <Flex w="100%" align={'center'}>
            <Text fontSize="16px" fontWeight={'600'} py="8px" pl="4px" color={'#363C42'}>
              {t('Team')}
            </Text>
            <TeamCenter />
            <CreateTeam />
          </Flex>
        </PopoverHeader>
        <PopoverBody px="0" pb="0" pt="4px">
          <NsList
            displayPoint={true}
            selected_ns_uid={ns_uid}
            click={switchTeam}
            nullNs={switchTeam}
          />
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};
export default function Index({ disclosure }: { disclosure: UseDisclosureReturn }) {
  const router = useRouter();
  const rechargeEnabled = useContext(RechargeEnabledContext);
  const { t } = useTranslation();
  const { delSession, getSession } = useSessionStore();
  const { user, kubeconfig } = getSession();
  const { copyData } = useCopyData();

  const openApp = useAppStore((s) => s.openApp);
  const installApp = useAppStore((s) => s.installedApps);
  const { ns_uid, nsid, userId, k8s_username } = user;
  const { data } = useQuery({
    queryKey: ['getAccount', { ns_uid, userId, k8s_username }],
    queryFn: () =>
      request<any, ApiResp<{ balance: number; deductionBalance: number; status: string }>>(
        '/api/account/getAmount'
      )
  });

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
    router.replace('/signin');
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
          <Flex
            alignItems={'center'}
            mt="8px"
            bg={'rgba(255, 255, 255, 0.50)'}
            py="6px"
            color="#5A646E"
            borderRadius={'50px'}
            border="1.5px solid rgba(0,0,0,0)"
            _hover={{
              borderColor: '#36ADEF'
            }}
          >
            <NsMenu />
            <Text fontSize={'12px'}>{nsid}</Text>
            <Box mr="12px" onClick={() => copyData(nsid)} ml="8px" cursor={'pointer'}>
              <Iconfont iconName="icon-copy2" width={14} height={14} color="#7B838B"></Iconfont>
            </Box>
          </Flex>
          <Stack
            direction={'column'}
            width={'100%'}
            mt="12px"
            bg="rgba(255, 255, 255, 0.6)"
            borderRadius={'8px'}
            gap={'0px'}
          >
            <Flex alignItems={'center'} borderBottom={'1px solid #0000001A'} p="16px">
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
            {
              <Flex alignItems={'center'} py="16px">
                <Text ml="16px">kubeconfig</Text>
                <Box ml="auto" onClick={() => download('kubeconfig.yaml', kubeconfig)}>
                  <Iconfont
                    iconName="icon-download"
                    width={16}
                    height={16}
                    color="#219BF4"
                  ></Iconfont>
                </Box>
                <Box ml="8px" mr="20px" onClick={() => copyData(kubeconfig)} cursor={'pointer'}>
                  <Iconfont iconName="icon-copy2" width={16} height={16} color="#219BF4"></Iconfont>
                </Box>
              </Flex>
            }
          </Stack>
        </Flex>
      </Box>
    </>
  ) : (
    <></>
  );
}

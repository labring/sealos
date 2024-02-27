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
  IconButton,
  HStack
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import Iconfont from '../iconfont';
import useAppStore from '@/stores/app';
import { ApiResp } from '@/types';
import { formatMoney } from '@/utils/format';
import TeamCenter from '@/components/team/TeamCenter';
import NsList from '@/components/team/NsList';
import { nsListRequest, switchRequest } from '@/api/namespace';
import { NSType } from '@/types/team';
import PasswordModify from './PasswordModify';
import { useGlobalStore } from '@/stores/global';
import { CopyIcon, DownloadIcon, LogoutIcon, RightArrowIcon } from '@sealos/ui';
import { ImageFallBackUrl } from '@/stores/config';

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
  const switchTeam = async ({ uid }: { uid: string }) => {
    if (ns_uid !== uid) mutation.mutate(uid);
  };
  const { data } = useQuery({
    queryKey: ['teamList', 'teamGroup'],
    queryFn: nsListRequest
  });
  const namespaces = data?.data?.namespaces || [];
  const namespace = namespaces.find((x) => x.uid === ns_uid);
  const defaultNamespace = namespaces.find((x) => x.nstype === NSType.Private);
  if (!namespace && defaultNamespace && namespaces.length > 0) {
    // 被删了
    switchTeam({ uid: defaultNamespace.uid });
  }
  return (
    <Popover placement="left">
      <PopoverTrigger>
        {
          <Box
            px="16px"
            cursor={'pointer'}
            py="10px"
            bgColor={'rgba(255, 255, 255, 0.6)'}
            borderRadius={'8px'}
            width={'full'}
          >
            <Text color="#7B838B" fontSize={'11px'} p="4px">
              {t('Team')}
            </Text>
            <Flex
              justify={'space-between'}
              align={'center'}
              _hover={{
                bgColor: 'rgba(0, 0, 0, 0.03)'
              }}
              transition={'0.3s'}
              p="4px"
            >
              <Text fontSize="13px" fontWeight={'500'} color={'#363C42'}>
                {namespace?.nstype === NSType.Private ? t('Default Team') : namespace?.teamName}
              </Text>
              <RightArrowIcon w="16px" h="16px" />
            </Flex>
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
        <PopoverBody px="0" pb="0" pt="4px" maxH={'320px'} overflowY={'auto'}>
          <NsList
            displayPoint={true}
            selected_ns_uid={ns_uid}
            click={switchTeam}
            namespaces={namespaces}
          />
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};
export default function Account({ disclosure }: { disclosure: UseDisclosureReturn }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { delSession, getSession } = useSessionStore();
  const { user, kubeconfig } = getSession();
  const { copyData } = useCopyData();

  const openApp = useAppStore((s) => s.openApp);
  const installApp = useAppStore((s) => s.installedApps);
  const { ns_uid, nsid, userId, k8s_username } = user || {
    ns_uid: '',
    nsid: '',
    userId: '',
    k8s_username: ''
  };
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
  const queryclient = useQueryClient();
  const logout = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    delSession();
    queryclient.clear();
    router.replace('/signin');
  };
  const needPassword = useGlobalStore((s) => s.needPassword);
  const rechargeEnabled = useGlobalStore((s) => s.rechargeEnabled);
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
            fallbackSrc={ImageFallBackUrl}
            alt="user avator"
          />
          <Text color={'#24282C'} fontSize={'20px'} fontWeight={600}>
            {user?.name}
          </Text>
          <HStack mb="10px" gap="2px">
            <Text color={'grayModern.500'} fontSize={'12px'}>
              ID: {nsid}
            </Text>
            <IconButton
              variant={'white-bg-icon'}
              p="4px"
              onClick={() => copyData(nsid)}
              icon={<CopyIcon boxSize={'12px'} color={'grayModern.500'} fill={'grayModern.500'} />}
              aria-label={'copy nsid'}
            />
          </HStack>
          <NsMenu />
          <Stack
            direction={'column'}
            width={'100%'}
            mt="12px"
            bg="rgba(255, 255, 255, 0.6)"
            borderRadius={'8px'}
            fontSize={'13px'}
            gap={'0px'}
          >
            <Flex alignItems={'center'} borderBottom={'1px solid #0000001A'} px="16px" py="11px">
              <Text>{t('Manage Team')}</Text>
              <TeamCenter mr="0" />
            </Flex>
            {needPassword && (
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
                  onClick={() => download('kubeconfig.yaml', kubeconfig)}
                  icon={<DownloadIcon boxSize={'16px'} color={'#219BF4'} fill={'#219BF4'} />}
                  aria-label={'Download kc'}
                />
                <IconButton
                  variant={'white-bg-icon'}
                  p="4px"
                  onClick={() => copyData(kubeconfig)}
                  icon={<CopyIcon boxSize={'16px'} color={'#219BF4'} fill={'#219BF4'} />}
                  aria-label={'copy kc'}
                />
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

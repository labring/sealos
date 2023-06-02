import LangSelect from '@/components/LangSelect';
import { useCopyData } from '@/hooks/useCopyData';
import request from '@/services/request';
import useSessionStore from '@/stores/session';
import download from '@/utils/downloadFIle';
import { Box, Flex, Image, Text, UseDisclosureProps } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import JsYaml from 'js-yaml';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import Iconfont from '../iconfont';

export default function Index({ accountDisclosure }: { accountDisclosure: UseDisclosureProps }) {
  const router = useRouter();
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

  const { data } = useQuery(['getAccount'], () => request('/api/account/getAmount'));

  let real_balance = data?.data?.balance ?? 0;
  if (data?.data?.deductionBalance) {
    real_balance = real_balance - data.data.deductionBalance;
  }

  const logout = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    delSession();
    router.push('/', '/', { locale: 'en' });
  };

  return (
    <>
      <Box
        position={'fixed'}
        top={0}
        left={0}
        bottom={0}
        right={0}
        zIndex={'998'}
        onClick={accountDisclosure.onClose}
      ></Box>
      <Box
        w="297px"
        h="347px"
        bg="rgba(255, 255, 255, 0.75)"
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
          <LangSelect mr="auto" />
          <Iconfont iconName="icon-logout" width={14} height={14} color="#24282C"></Iconfont>
          <Text ml="6px" color={'#24282C'} fontSize={'12px'} fontWeight={500} onClick={logout}>
            {t('log out')}
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
          <Box w="100%" mt="24px" bg="rgba(255, 255, 255, 0.6)" borderRadius={'4px'}>
            <Flex h="60px" alignItems={'center'}>
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
          </Box>
        </Flex>
      </Box>
    </>
  );
}

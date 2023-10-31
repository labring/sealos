import { Box, Flex, Image, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { ReactNode, useState } from 'react';
import LangSelectSimple from '../LangSelect';
import dynamic from 'next/dynamic';

const Account = dynamic(() => import('@/components/Account'), {
  ssr: false
});

export default function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const router = useRouter();
  const goHome = () => router.replace('/pricing');
  const [active, setActive] = useState(router.pathname);

  const tabs = [
    {
      url: '/pricing',
      label: t('price')
    },
    {
      url: '/cluster',
      label: t('My Cluster')
    },
    {
      url: '/license',
      label: t('License Buy')
    }
  ];

  return (
    <Flex w="100vw" h="100vh" flexDirection={'column'}>
      <Flex flexShrink={0} w="100%" alignItems={'center'} background={'#24282C'} h="56px" px="48px">
        <Image
          cursor={'pointer'}
          onClick={goHome}
          p="2px"
          width="36px"
          height="36px"
          src={'/images/sealos.svg'}
          fallbackSrc="/images/sealos.svg"
          alt="logo"
        />
        <Text
          ml="6px"
          mr="12px"
          fontSize={20}
          fontWeight={700}
          color={'#fff'}
          cursor={'pointer'}
          onClick={goHome}
        >
          Sealos
        </Text>
        <Text px="16px" color={'#fff'} fontSize={20}>
          |
        </Text>
        <Flex alignItems={'center'} gap={'16px'}>
          {tabs.map((i) => {
            return (
              <Box
                cursor={'pointer'}
                key={i.url}
                p="6px 12px"
                borderRadius={'4px'}
                bg={active === i.url ? 'rgba(255, 255, 255, 0.10)' : ''}
                onClick={() => {
                  router.push(i.url);
                }}
              >
                <Text fontSize={'14px'} fontWeight={600} color={'#fff'}>
                  {i.label}
                </Text>
              </Box>
            );
          })}
        </Flex>
        {/* <LangSelectSimple /> */}
        <Box ml="auto"></Box>
        <Account />
      </Flex>
      {children}
    </Flex>
  );
}

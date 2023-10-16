import LangSelectSimple from '@/components/LangSelect';
import { Flex, Image, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import RechargeComponent from './components/Recharge';
import LicenseRecord from './components/Record';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { ApiResp, SystemEnv } from '@/types';

export default function LicensePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const goHome = () => router.replace('/');

  return (
    <Flex w="100%" h="100%" flexDirection={'column'}>
      <Flex w="100%" alignItems={'center'} background={'#24282C'} h="56px" px="48px">
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
        <Text fontSize={16} fontWeight={600} color={'#fff'}>
          ｜ {t('License Buy')}
        </Text>
        <LangSelectSimple />
      </Flex>
      <Flex flex={1} h={0} bg="#fefefe" overflowX={'auto'}>
        <LicenseRecord />
        <RechargeComponent />
      </Flex>
    </Flex>
  );
}

export async function getServerSideProps({ req, res, locales }: any) {
  const local = req?.cookies?.NEXT_LOCALE || 'en';

  return {
    props: {
      ...(await serverSideTranslations(local, undefined, null, locales || []))
    }
  };
}

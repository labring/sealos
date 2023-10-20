import LangSelectSimple from '@/components/LangSelect';
import Account from '@/components/account';
import { Flex, Image, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import RechargeComponent from './components/Recharge';
import LicenseRecord from './components/Record';

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
        <Account />
      </Flex>
      <Flex flex={1} h={0} bg="#fefefe" overflowX={'auto'}>
        <LicenseRecord />
        <RechargeComponent />
      </Flex>
    </Flex>
  );
}

export async function getServerSideProps({ req, res, locales }: any) {
  const lang: string = req?.headers?.['accept-language'] || 'zh';
  const local = lang.indexOf('zh') !== -1 ? 'zh' : 'en';
  res.setHeader('Set-Cookie', `NEXT_LOCALE=${local}; Max-Age=2592000; Secure; SameSite=None`);

  return {
    props: {
      ...(await serverSideTranslations(local, undefined, null, locales || []))
    }
  };
}

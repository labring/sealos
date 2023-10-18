import LangSelectSimple from '@/components/LangSelect';
import { Flex, Image, Text, useToast } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import RechargeComponent from './components/Recharge';
import LicenseRecord from './components/Record';
import { useRouter } from 'next/router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiResp, LicensePayload, SystemEnv } from '@/types';
import Account from '@/components/account';
import { useEffect } from 'react';
import { createLicenseRecord } from '@/api/license';
import { setCookie } from '@/utils/cookieUtils';

export default function LicensePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const goHome = () => router.replace('/');
  const totast = useToast();
  // const queryClient = useQueryClient();

  // const licenseRecordMutation = useMutation(
  //   (payload: LicensePayload) => createLicenseRecord(payload),
  //   {
  //     onSuccess(data) {
  //       console.log(data);
  //       queryClient.invalidateQueries(['getLicenseActive']);
  //     },
  //     onError(err: any) {
  //       console.log(err);
  //     }
  //   }
  // );

  // useEffect(() => {
  //   const { stripeState } = router.query;
  //   if (stripeState === 'success') {
  //     totast({
  //       status: 'success',
  //       duration: 3000,
  //       title: t('Stripe Success'),
  //       isClosable: true,
  //       position: 'top'
  //     });
  //     licenseRecordMutation.mutate();
  //   } else if (stripeState === 'error') {
  //     totast({
  //       status: 'error',
  //       duration: 3000,
  //       title: t('Stripe Cancel'),
  //       isClosable: true,
  //       position: 'top'
  //     });
  //   }
  //   !!stripeState && router.replace(router.pathname);
  // }, []);

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
  console.log(local);
  // setCookie()

  return {
    props: {
      ...(await serverSideTranslations(local, undefined, null, locales || []))
    }
  };
}

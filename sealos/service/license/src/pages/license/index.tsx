import { getLicenseRecord } from '@/api/license';
import Layout from '@/components/Layout';
import { compareFirstLanguages } from '@/utils/tools';
import { Flex, Spinner } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import LicenseRecord from './components/Record';

export default function LicensePage() {
  const { isLoading } = useQuery(['getLicenseActive'], () =>
    getLicenseRecord({
      page: 1,
      pageSize: 10
    })
  );

  if (isLoading) {
    return (
      <Layout>
        <Flex flex={1} alignItems={'center'} justifyContent={'center'} overflow={'hidden'}>
          <Spinner size="xl" />
        </Flex>
      </Layout>
    );
  }

  return (
    <Layout>
      <Flex flex={1} h={0} bg="#fefefe" overflowX={'auto'}>
        <LicenseRecord />
      </Flex>
    </Layout>
  );
}

export async function getServerSideProps({ req, res, locales }: any) {
  const local =
    req?.cookies?.NEXT_LOCALE || compareFirstLanguages(req?.headers?.['accept-language'] || 'zh');
  res.setHeader('Set-Cookie', `NEXT_LOCALE=zh; Max-Age=2592000; Secure; SameSite=None`);

  return {
    props: {
      ...(await serverSideTranslations(local, undefined, null, locales || []))
    }
  };
}

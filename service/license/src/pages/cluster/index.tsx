import { getClusterRecord } from '@/api/cluster';
import { EmptyIcon } from '@/components/Icon';
import Layout from '@/components/Layout';
import { compareFirstLanguages } from '@/utils/tools';
import { Flex, Spinner, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useEffect, useState } from 'react';
import ClusterRecord from './components/Record';
import Tutorial from './components/Tutorial';

export default function MyCluster() {
  const [clusterId, setClusterId] = useState('');
  const { t } = useTranslation();

  const changeClusterId = (id: string) => {
    setClusterId(id);
  };

  const { data, isLoading, isSuccess } = useQuery(
    ['getClusterRecord'],
    () =>
      getClusterRecord({
        page: 1,
        pageSize: 10
      }),
    {
      enabled: !clusterId,
      onSuccess(data) {
        changeClusterId(data?.records?.[0]?.clusterId);
      }
    }
  );

  // if (isLoading) {
  //   return (
  //     <Layout>
  //       <Flex flex={1} alignItems={'center'} justifyContent={'center'} overflow={'hidden'}>
  //         <Spinner size="xl" />
  //       </Flex>
  //     </Layout>
  //   );
  // }

  if (isSuccess && data?.total === 0) {
    return (
      <Layout>
        <Flex
          flex={1}
          overflow={'hidden'}
          justifyContent={'center'}
          alignItems={'center'}
          flexDirection={'column'}
        >
          <EmptyIcon />
          <Text mt="20px" color={'#5A646E'} fontWeight={500} fontSize={'14px'}>
            {t('You have not purchased the Cluster')}
          </Text>
        </Flex>
      </Layout>
    );
  }

  return (
    <Layout>
      <Flex flex={1} h={0} bg="#fefefe">
        <ClusterRecord changeClusterId={changeClusterId} clusterId={clusterId} />
        <Tutorial clusterId={clusterId} />
      </Flex>
    </Layout>
  );
}

export async function getServerSideProps({ req, res, locales }: any) {
  const local =
    req?.cookies?.NEXT_LOCALE || compareFirstLanguages(req?.headers?.['accept-language'] || 'zh');
  res.setHeader('Set-Cookie', `NEXT_LOCALE=${local}; Max-Age=2592000; Secure; SameSite=None`);

  return {
    props: {
      ...(await serverSideTranslations(local, undefined, null, locales || []))
    }
  };
}

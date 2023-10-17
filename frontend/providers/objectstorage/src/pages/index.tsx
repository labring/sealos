import { Flex } from '@chakra-ui/react';
import Layout from '@/layout';
import SideBar from '@/components/SideBar';
import DefaultContainer from '@/components/DefaultContainer';
import BucketContainer from '@/components/BucketContainer';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from '@/consts';
import { initUser, listBucket } from '@/api/bucket';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
// import BucketContainer from '@/components/BucketContainer'
export default function Home() {
  const _bucketList = useQuery([QueryKey.bucketList], listBucket);
  const bucketList = _bucketList.data?.list || [];
  return (
    <Layout>
      <SideBar />
      <Flex
        flex={1}
        align={'center'}
        justifyContent={'center'}
        bg={'whiteAlpha.700'}
        overflowY={'auto'}
      >
        {bucketList.length === 0 ? <DefaultContainer /> : <BucketContainer />}
      </Flex>
    </Layout>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'file', 'tools', 'bucket'], null, [
        'zh',
        'en'
      ]))
      // Will be passed to the page component as props
    }
  };
}

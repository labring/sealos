import { getImageHubs } from '@/api/app';
import SwitchPage from '@/components/ImageHub/SwitchPage';
import List from '@/components/ImageHub/list';
import { useLoading } from '@/hooks/useLoading';
import { serviceSideProps } from '@/utils/i18n';
import { Flex } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useState } from 'react';

const formatImageData = (items: any) => {
  const result: any[] = [];
  Object.entries(items).forEach(([imageName, versions]: [string, any]) => {
    versions.forEach((version: any) => {
      result.push({
        image: imageName,
        tag: version.name,
        created: version.created,
        size: version.size
      });
    });
  });
  result.sort((a, b) => a.image.localeCompare(b.image)); // 按image字母排序
  return result;
};

const Home = ({ namespace }: { namespace: string }) => {
  const router = useRouter();
  const { Loading } = useLoading();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { isLoading, data, refetch } = useQuery(
    ['getImageHubs', page, pageSize],
    () => getImageHubs({ page, pageSize }),
    {
      retry: 3
    }
  );

  return (
    <Flex backgroundColor={'grayModern.100'} px={'32px'} h={'100vh'} flexDirection={'column'}>
      <List
        namespaces={[]}
        apps={formatImageData(data?.items || {})}
        refetchApps={() => {
          refetch();
        }}
      />

      <SwitchPage
        flexShrink={0}
        my={'8px'}
        justifyContent={'end'}
        currentPage={page}
        totalPage={data?.totalPages || 0}
        totalItem={data?.total || 0}
        pageSize={pageSize}
        setCurrentPage={(idx: number) => setPage(idx)}
      />
      <Loading loading={isLoading} />
    </Flex>
  );
};

export async function getServerSideProps(content: any) {
  const namespace = content?.query?.namespace || 'default';
  return {
    props: {
      namespace,
      ...(await serviceSideProps(content))
    }
  };
}

export default Home;

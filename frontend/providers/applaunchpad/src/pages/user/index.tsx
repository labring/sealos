import { useLoading } from '@/hooks/useLoading';
import { serviceSideProps } from '@/utils/i18n';
import { Flex } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { useState, useMemo } from 'react';
import List from './components/list';
import SwitchPage from './components/switchpage';
import { getResourceQuotas } from '@/api/app';

const UserResourceQuota = ({ namespace }: { namespace: string }) => {
  const router = useRouter();
  const { Loading } = useLoading();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  const { isLoading, data, refetch } = useQuery(
    ['getUserResourceQuotas'],
    getResourceQuotas,
    {
      retry: 3
    }
  );

  console.log(data);

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter((item: any) =>
      item.name.includes(searchTerm) || item.namespace.includes(searchTerm)
    );
  }, [data, searchTerm]);

  
  console.log('filteredData', filteredData);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, page, pageSize]);

  return (
    <Flex backgroundColor={'grayModern.100'} px={'32px'} h={'100vh'} flexDirection={'column'}>
      <List
        quotas={data?.items || []}
        refetchQuotas={refetch}
        onSearch={setSearchTerm}
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

export default UserResourceQuota;
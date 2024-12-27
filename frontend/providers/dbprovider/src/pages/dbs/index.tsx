import Empty from './components/empty';
import DBList from './components/dbList';
import { useQuery } from '@tanstack/react-query';
import { useDBStore } from '@/store/db';
import { useLoading } from '@/hooks/useLoading';
import { useState } from 'react';
import { serviceSideProps } from '@/utils/i18n';
import Sidebar from '@/components/Sidebar';
import { Flex } from '@chakra-ui/react';

function Home() {
  const { dbList, setDBList } = useDBStore();
  const { Loading } = useLoading();
  const [initialized, setInitialized] = useState(false);

  const { refetch } = useQuery(['initDbData'], setDBList, {
    refetchInterval: 3000,
    onSettled() {
      setInitialized(true);
    }
  });

  return (
    <>
      <Flex bg={'grayModern.100'} h={'100%'} pb={'12px'} pr={'12px'} overflow={'hidden'}>
        <Sidebar />
        {dbList.length === 0 && initialized ? (
          <Empty />
        ) : (
          <DBList dbList={dbList} refetchApps={refetch} />
        )}
      </Flex>
      <Loading loading={!initialized} />
    </>
  );
}

export async function getServerSideProps(content: any) {
  return {
    props: {
      ...(await serviceSideProps(content))
    }
  };
}

export default Home;

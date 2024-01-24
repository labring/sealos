import Empty from './components/empty';
import DBList from './components/dbList';
import { useQuery } from '@tanstack/react-query';
import { useDBStore } from '@/store/db';
import { useLoading } from '@/hooks/useLoading';
import { useState } from 'react';
import { serviceSideProps } from '@/utils/i18n';

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
      {dbList.length === 0 && initialized ? (
        <Empty />
      ) : (
        <>
          <DBList dbList={dbList} refetchApps={refetch} />
        </>
      )}
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

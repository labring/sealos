import Empty from './components/empty';
import List from './components/jobList';
import { useQuery } from '@tanstack/react-query';
import { useJobStore } from '@/store/job';
import { useLoading } from '@/hooks/useLoading';
import { useState } from 'react';
import { serviceSideProps } from '@/utils/i18n';

function Home() {
  const { jobList, setJobList } = useJobStore();
  const { Loading } = useLoading();
  const [initialized, setInitialized] = useState(false);

  const { refetch } = useQuery(['initCronJobList'], setJobList, {
    refetchInterval: 3000,
    onSettled() {
      setInitialized(true);
    }
  });

  return (
    <>
      {jobList.length === 0 && initialized ? (
        <Empty />
      ) : (
        <List list={jobList} refetchApps={refetch} />
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

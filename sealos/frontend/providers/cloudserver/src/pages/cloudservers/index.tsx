import MyIcon from '@/components/Icon';
import Pagination from '@/components/Pagination';
import { useLoading } from '@/hooks/useLoading';
import useStore from '@/hooks/useStore';
import useSessionStore from '@/store/session';
import { serviceSideProps } from '@/utils/i18n';
import { Box, Button, Flex, Image } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import router from 'next/router';
import { useState } from 'react';
import List from './components/List';
import { MockInstance } from '@/constants/vm';
import { listCloudServer } from '@/api/cloudserver';

function Home() {
  const { Loading } = useLoading();
  const { t } = useTranslation();
  const [initialized, setInitialized] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [startTime, setStartTime] = useState(() => {
    const currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() - 1);
    return currentDate;
  });
  const [endTime, setEndTime] = useState(new Date());
  const user = useStore(useSessionStore, (state) => state.session?.user);

  const { data, refetch } = useQuery(
    ['listCloudServer', page, pageSize],
    () =>
      listCloudServer({
        page,
        pageSize
      }),
    {
      refetchInterval: 3000,
      onSettled() {
        setInitialized(true);
      }
    }
  );

  return (
    <Flex
      flexDirection={'column'}
      bg={'grayModern.100'}
      px={'32px'}
      h="100%"
      minW={'1024px'}
      overflow={'auto'}
    >
      <Flex flexShrink={0} h={'88px'} alignItems={'center'}>
        <Box mr={4} p={2} bg={'#FEFEFE'} borderRadius={'4px'} border={'1px solid #DEE0E2'}>
          <Image alt="logo" src="/logo.svg" w="24px" h="24px"></Image>
        </Box>
        <Box fontSize={'2xl'} color={'black'}>
          {t('Cloud host list')}
        </Box>
        <Box ml={3} color={'gray.500'}>
          ({data?.total})
        </Box>
        <Box flex={1}></Box>
        <Button
          w="156px"
          h="42px"
          lineHeight={'20px'}
          leftIcon={<MyIcon name="plus" width={'20px'} />}
          onClick={() => router.push('/cloudserver/create')}
        >
          {t('New Server')}
        </Button>
      </Flex>

      {data?.list && data?.list?.length > 0 ? (
        <Box flex={'1 0 0'}>
          <List refetchApps={refetch} apps={data?.list || []} />
        </Box>
      ) : (
        <Flex alignItems={'center'} justifyContent={'center'} flexDirection={'column'} flex={1}>
          <MyIcon name={'noEvents'} color={'transparent'} width={'80px'} height={'80px'} />
          <Box mt={'25px'}>{t('Empty List')}</Box>
          <Button
            lineHeight={'20px'}
            leftIcon={<MyIcon name="plus" width={'20px'} />}
            mt={'40px'}
            w="156px"
            h="42px"
            onClick={() => router.push('/cloudserver/create')}
          >
            {t('New Server')}
          </Button>
        </Flex>
      )}

      {!!data?.total && (
        <Pagination
          totalItems={data?.total || 0}
          itemsPerPage={pageSize}
          currentPage={page}
          setCurrentPage={setPage}
        />
      )}
    </Flex>
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

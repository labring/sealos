import { getOrderList } from '@/api/order';
import MyIcon from '@/components/Icon';
import Pagination from '@/components/Pagination';
import { useLoading } from '@/hooks/useLoading';
import { serviceSideProps } from '@/utils/i18n';
import { Box, Button, Flex, Icon, Text } from '@chakra-ui/react';
import MySelect from '@/components/Select';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import router from 'next/router';
import { useState } from 'react';
import List from './components/List';
import Tabs from '@/components/Tabs';
import { OrderTypeList } from '@/constants/order';
import { OrderStatus, OrderType } from '@/types/order';
import SelectDateRange from '@/components/SelectDateRange';

function Home() {
  const { Loading } = useLoading();
  const { t } = useTranslation();
  const [initialized, setInitialized] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [orderStatus, setOrderStatus] = useState<'all' | OrderStatus>('all');
  const [orderType, setOrderType] = useState<'all' | OrderType>('all');
  const [startTime, setStartTime] = useState(() => {
    const currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() - 1);
    return currentDate;
  });
  const [endTime, setEndTime] = useState(new Date());

  const { data, refetch } = useQuery(
    ['getOrderList', page, pageSize, orderStatus, orderType, startTime, endTime],
    () =>
      getOrderList({
        page,
        pageSize,
        orderStatus,
        orderType,
        startTime,
        endTime
      }),
    {
      // refetchInterval: 3000,
      onSettled() {
        setInitialized(true);
      }
    }
  );

  return (
    <Flex
      flexDirection={'column'}
      bg={'#F3F4F5'}
      px={'32px'}
      h="100%"
      minW={'1024px'}
      overflow={'auto'}
    >
      <Flex flexShrink={0} h={'88px'} alignItems={'center'}>
        <Box mr={4} p={2} bg={'#FEFEFE'} borderRadius={'4px'} border={'1px solid #DEE0E2'}>
          <Icon
            xmlns="http://www.w3.org/2000/svg"
            width="24px"
            height="24px"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12.0789 1.29059C10.5242 1.29059 9.24912 2.48759 9.12495 4.01024H6.91898C5.57485 4.01024 4.90279 4.01024 4.3894 4.27182C3.93781 4.50192 3.57066 4.86907 3.34056 5.32066C3.07898 5.83405 3.07898 6.50611 3.07898 7.85024V18.1736C3.07898 19.5177 3.07898 20.1898 3.34056 20.7032C3.57066 21.1548 3.93781 21.5219 4.3894 21.752C4.90279 22.0136 5.57485 22.0136 6.91898 22.0136H17.239C18.5831 22.0136 19.2552 22.0136 19.7686 21.752C20.2201 21.5219 20.5873 21.1548 20.8174 20.7032C21.079 20.1898 21.079 19.5177 21.079 18.1736V7.85024C21.079 6.50611 21.079 5.83405 20.8174 5.32066C20.5873 4.86907 20.2201 4.50192 19.7686 4.27182C19.2552 4.01024 18.5831 4.01024 17.239 4.01024H15.0328C14.9086 2.48759 13.6335 1.29059 12.0789 1.29059ZM13.0789 4.29059C13.0789 4.84287 12.6312 5.29059 12.0789 5.29059C11.5266 5.29059 11.0789 4.84287 11.0789 4.29059C11.0789 3.7383 11.5266 3.29059 12.0789 3.29059C12.6312 3.29059 13.0789 3.7383 13.0789 4.29059ZM7.23376 9.01192C7.23376 8.45964 7.68148 8.01192 8.23376 8.01192H16.1183C16.6706 8.01192 17.1183 8.45964 17.1183 9.01192C17.1183 9.56421 16.6706 10.0119 16.1183 10.0119H8.23376C7.68148 10.0119 7.23376 9.56421 7.23376 9.01192ZM8.23376 12.0119C7.68148 12.0119 7.23376 12.4596 7.23376 13.0119C7.23376 13.5642 7.68148 14.0119 8.23376 14.0119H16.1183C16.6706 14.0119 17.1183 13.5642 17.1183 13.0119C17.1183 12.4596 16.6706 12.0119 16.1183 12.0119H8.23376ZM7.23376 17.0119C7.23376 16.4596 7.68148 16.0119 8.23376 16.0119H12.0789C12.6312 16.0119 13.0789 16.4596 13.0789 17.0119C13.0789 17.5642 12.6312 18.0119 12.0789 18.0119H8.23376C7.68148 18.0119 7.23376 17.5642 7.23376 17.0119Z"
              fill="#24282C"
            />
          </Icon>
        </Box>
        <Box fontSize={'2xl'} color={'black'}>
          {t('Order List')}
        </Box>
        <Box ml={3} color={'gray.500'}>
          ({data?.totalCount})
        </Box>
        <Box flex={1}></Box>
        <Button
          variant={'primary'}
          w="156px"
          h="42px"
          leftIcon={<MyIcon name={'plus'} w={'12px'} />}
          onClick={() => router.push('/order/create')}
        >
          {t('New Order')}
        </Button>
      </Flex>

      <Flex
        fontSize={'12px'}
        color={'#24282C'}
        fontWeight={400}
        alignItems={'center'}
        mb="14px"
        position={'relative'}
      >
        <Tabs
          fontSize={'12px'}
          borderRadius={'4px'}
          bg="#F6F8F9"
          border={'1px solid #EAEBF0'}
          list={[
            { id: 'all', label: 'All' },
            { id: 'processing', label: 'Processing' },
            { id: 'completed', label: 'Completed' }
          ]}
          activeId={orderStatus}
          onChange={(id: any) => {
            setPage(1);
            setOrderStatus(id);
          }}
        />
        <Text ml="32px" mr="12px">
          {t('Create Time')}
        </Text>
        <SelectDateRange
          startTime={startTime}
          setStartTime={setStartTime}
          endTime={endTime}
          setEndTime={setEndTime}
        />
        <Text ml="32px" mr="12px">
          {t('Question Type')}
        </Text>
        <MySelect
          width={'110px'}
          height={'32px'}
          value={orderType}
          list={[{ id: 'all', label: 'All' }].concat(OrderTypeList)}
          onchange={(val: any) => {
            setPage(1);
            setOrderType(val);
          }}
        />
      </Flex>

      {data?.orders && data?.orders?.length > 0 ? (
        <Box flex={'1 0 0'}>
          <List refetchApps={refetch} apps={data?.orders} />
        </Box>
      ) : (
        <Flex alignItems={'center'} justifyContent={'center'} flexDirection={'column'} flex={1}>
          <MyIcon name={'noEvents'} color={'transparent'} width={'80px'} height={'80px'} />
          <Box py={8}>{t('Order Empty')}</Box>
        </Flex>
      )}

      {!!data?.totalCount && (
        <Pagination
          totalItems={data?.totalCount || 0}
          itemsPerPage={10}
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

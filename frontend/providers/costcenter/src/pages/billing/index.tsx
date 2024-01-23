import { CommonBillingTable, TransferBillingTable } from '../../components/billing/billingTable';
import {
  Box,
  Flex,
  Heading,
  Img,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { formatISO } from 'date-fns';
import receipt_icon from '@/assert/receipt_long_black.svg';
import { useQuery } from '@tanstack/react-query';
import request from '@/service/request';
import { BillingData, BillingSpec, BillingType } from '@/types/billing';
import SelectRange from '@/components/billing/selectDateRange';
import useOverviewStore from '@/stores/overview';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import NotFound from '@/components/notFound';
import NamespaceMenu from '@/components/billing/NamespaceMenu';
import TypeMenu from '@/components/billing/TypeMenu';
import AppMenu from '@/components/billing/AppMenu';
import SearchBox from '@/components/billing/SearchBox';
import SwitchPage from '@/components/billing/SwitchPage';
import { ApiResp } from '@/types';
import CurrencySymbol from '@/components/CurrencySymbol';
import { deFormatMoney, formatMoney } from '@/utils/format';
function AmountDisplay() {
  const { data } = useQuery({
    queryKey: ['getAccount'],
    queryFn: () =>
      request<any, ApiResp<{ deductionBalance: number; balance: number }>>('/api/account/getAmount')
  });
  const list = [
    {
      bgColor: '#36ADEF',
      title: 'Deduction',
      value: data?.data?.deductionBalance || 0
    },
    {
      bgColor: '#47C8BF',
      title: 'Charge',
      value: (data?.data?.balance || 0) - deFormatMoney(5)
    }
  ] as const;
  const { t } = useTranslation();
  return (
    <Flex gap={'32px'}>
      {list.map((item) => (
        <Flex align={'center'} gap={'8px'} fontSize={'12px'} key={item.title}>
          <Box w="8px" h="8px" bgColor={item.bgColor} borderRadius={'2px'} />
          <Text>{t(item.title)}</Text>
          <CurrencySymbol fontSize={'14px'} />
          <Text>{formatMoney(item.value).toFixed(2)}</Text>
        </Flex>
      ))}
    </Flex>
  );
}
function InOutTabPanel({ namespace }: { namespace: string }) {
  const startTime = useOverviewStore((state) => state.startTime);
  const endTime = useOverviewStore((state) => state.endTime);
  const [selectType, setType] = useState<BillingType>(BillingType.ALL);
  const [orderID, setOrderID] = useState('');
  const [totalPage, setTotalPage] = useState(1);
  const [currentPage, setcurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItem, setTotalItem] = useState(10);
  const [appType, setApp] = useState('');
  useEffect(() => {
    setcurrentPage(1);
  }, [startTime, endTime, selectType, namespace]);
  const { data, isFetching, isSuccess } = useQuery(
    ['billing', { currentPage, startTime, endTime, orderID, selectType, namespace, appType }],
    () => {
      const spec: BillingSpec = {
        page: currentPage,
        pageSize: pageSize,
        type: selectType,
        startTime: formatISO(startTime, { representation: 'complete' }),
        // startTime,
        endTime: formatISO(endTime, { representation: 'complete' }),
        // endTime,
        appType,
        namespace,
        orderID
      };
      return request<any, { data: BillingData }, { spec: BillingSpec }>('/api/billing', {
        method: 'POST',
        data: {
          spec
        }
      });
    },
    {
      onSuccess(data) {
        const totalPage = data.data.status.pageLength;
        if (totalPage === 0) {
          // 搜索时的bug
          setTotalPage(1);
          setTotalItem(1);
        } else {
          setTotalItem(data.data.status.totalCount);
          setTotalPage(totalPage);
        }
        if (totalPage < currentPage) setcurrentPage(1);
      },
      staleTime: 1000
    }
  );
  const { t } = useTranslation();
  const tableResult = data?.data?.status?.item || [];
  return (
    <TabPanel p="0" display={'flex'} flexDirection={'column'} flex={'auto'}>
      <Flex alignItems={'center'} flexWrap={'wrap'}>
        <Flex align={'center'} mb="24px">
          <Text fontSize={'12px'} mx={'10px'} width={['60px', '60px', 'auto', 'auto']}>
            {t('APP Type')}
          </Text>
          <AppMenu isDisabled={isFetching} setApp={setApp} mr={'32px'} />
        </Flex>
        <Flex align={'center'} mb="24px">
          <Text fontSize={'12px'} mr={'12px'} width={['60px', '60px', 'auto', 'auto']}>
            {t('Transaction Time')}
          </Text>
          <SelectRange isDisabled={isFetching}></SelectRange>
        </Flex>
        <Flex align={'center'} mb="24px">
          <Text fontSize={'12px'} mr={'12px'} width={['60px', '60px', 'auto', 'auto']}>
            {t('Type')}
          </Text>
          <TypeMenu
            selectType={selectType}
            setType={setType}
            isDisabled={isFetching}
            optional={[BillingType.ALL, BillingType.CONSUME, BillingType.RECHARGE]}
          />
        </Flex>
        <SearchBox isDisabled={isFetching} setOrderID={setOrderID} />
      </Flex>
      {isSuccess && tableResult.length > 0 ? (
        <>
          <CommonBillingTable
            data={tableResult.filter((x) =>
              [BillingType.CONSUME, BillingType.RECHARGE].includes(x.type)
            )}
            flex={'auto'}
            overflow={'auto'}
            overflowY={'auto'}
          />
          <Flex justifyContent={'space-between'} mt="20px">
            <AmountDisplay />
            <SwitchPage
              totalPage={totalPage}
              totalItem={totalItem}
              pageSize={pageSize}
              currentPage={currentPage}
              setCurrentPage={setcurrentPage}
              mt="0"
            />
          </Flex>
        </>
      ) : (
        <Flex direction={'column'} w="full" align={'center'} flex={'1'} h={'0'} justify={'center'}>
          <NotFound></NotFound>
        </Flex>
      )}
    </TabPanel>
  );
}
function TransferTabPanel({ namespace }: { namespace: string }) {
  const startTime = useOverviewStore((state) => state.startTime);
  const endTime = useOverviewStore((state) => state.endTime);
  const [selectType, setType] = useState<BillingType>(BillingType.ALL);
  const [orderID, setOrderID] = useState('');
  const [totalPage, setTotalPage] = useState(1);
  const [currentPage, setcurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItem, setTotalItem] = useState(10);
  useEffect(() => {
    setcurrentPage(1);
  }, [startTime, endTime, selectType, namespace]);
  const { data, isFetching, isSuccess } = useQuery(
    ['billing', { currentPage, startTime, endTime, orderID, selectType, namespace }],
    () => {
      const spec = {
        page: currentPage,
        pageSize: pageSize,
        type: selectType,
        startTime: formatISO(startTime, { representation: 'complete' }),
        // startTime,
        endTime: formatISO(endTime, { representation: 'complete' }),
        // endTime,
        namespace,
        orderID
      };
      return request<any, { data: BillingData }, { spec: BillingSpec }>('/api/billing', {
        method: 'POST',
        data: {
          spec
        }
      });
    },
    {
      onSuccess(data) {
        const totalPage = data.data.status.pageLength;
        if (totalPage === 0) {
          // 搜索时的bug
          setTotalPage(1);
          setTotalItem(1);
        } else {
          setTotalItem(data.data.status.totalCount);
          setTotalPage(totalPage);
        }
        if (totalPage < currentPage) setcurrentPage(1);
      },
      staleTime: 1000
    }
  );
  const { t } = useTranslation();
  const tableResult = data?.data?.status?.item || [];
  return (
    <TabPanel p="0" flex={1} display={'flex'} flexDirection={'column'}>
      <Flex alignItems={'center'} flexWrap={'wrap'}>
        <Flex align={'center'} mb="24px">
          <Text fontSize={'12px'} mr={'12px'} width={['60px', '60px', 'auto', 'auto']}>
            {t('Transaction Time')}
          </Text>
          <SelectRange isDisabled={isFetching}></SelectRange>
        </Flex>
        <Flex align={'center'} mb="24px">
          <Text fontSize={'12px'} mr={'12px'} width={['60px', '60px', 'auto', 'auto']}>
            {t('Type')}
          </Text>
          <TypeMenu
            selectType={selectType}
            setType={setType}
            isDisabled={isFetching}
            optional={[BillingType.ALL, BillingType.RECEIVE, BillingType.TRANSFER]}
          />
        </Flex>
        <SearchBox isDisabled={isFetching} setOrderID={setOrderID} />
      </Flex>
      {isSuccess && tableResult.length > 0 ? (
        <>
          <TransferBillingTable
            data={tableResult.filter((x) =>
              [BillingType.RECEIVE, BillingType.TRANSFER].includes(x.type)
            )}
          />
          <Flex justifyContent={'flex-end'}>
            <SwitchPage
              totalPage={totalPage}
              totalItem={totalItem}
              pageSize={pageSize}
              currentPage={currentPage}
              setCurrentPage={setcurrentPage}
            />
          </Flex>
        </>
      ) : (
        <Flex direction={'column'} w="full" align={'center'} flex={'1'} h={'0'} justify={'center'}>
          <NotFound></NotFound>
        </Flex>
      )}
    </TabPanel>
  );
}
function Billing() {
  const { t } = useTranslation();
  const [namespace, setNamespace] = useState('');
  return (
    <Flex flexDirection="column" w="100%" h="100%" bg={'white'} p="24px" overflow={'auto'}>
      <Flex mr="24px" align={'center'}>
        <Img src={receipt_icon.src} w={'24px'} h={'24px'} mr={'18px'} dropShadow={'#24282C'}></Img>
        <Heading size="lg">{t('SideBar.BillingDetails')}</Heading>
        <NamespaceMenu isDisabled={false} setNamespace={setNamespace} />
      </Flex>
      <Tabs mt={'20px'} flex={1} display={'flex'} flexDir={'column'}>
        <TabList borderColor={'#EFF0F1'}>
          <Tab
            px="10px"
            color={'#9CA2A8'}
            _selected={{ color: '#24282C', borderColor: '#24282C' }}
            _active={{ color: 'unset' }}
          >
            {t('Receipts And Disbursements')}
          </Tab>
          <Tab
            px="10px"
            color={'#9CA2A8'}
            _selected={{ color: '#24282C', borderColor: '#24282C' }}
            _active={{ color: 'unset' }}
          >
            {t('Transfer')}
          </Tab>
        </TabList>
        <TabPanels mt="24px" flexDirection={'column'} flex={'1'} display={'flex'}>
          <InOutTabPanel namespace={namespace} />
          <TransferTabPanel namespace={namespace} />
        </TabPanels>
      </Tabs>
    </Flex>
  );
}

export default Billing;
export async function getServerSideProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, undefined, null, ['zh', 'en']))
    }
  };
}

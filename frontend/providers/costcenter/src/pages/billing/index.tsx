// import { MockBillingData } from '@/mock/billing';
import { CommonBillingTable, TransferBillingTable } from '../../components/billing/billingTable';
import {
  Box,
  Button,
  Flex,
  Heading,
  Img,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tab,
  TabIndicator,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text
} from '@chakra-ui/react';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { formatISO } from 'date-fns';
import receipt_icon from '@/assert/receipt_long_black.svg';
import arrow_icon from '@/assert/Vector.svg';
import arrow_left_icon from '@/assert/toleft.svg';
import magnifyingGlass_icon from '@/assert/magnifyingGlass.svg';
import { useQuery } from '@tanstack/react-query';
import request from '@/service/request';
import { BillingData, BillingSpec, BillingType } from '@/types/billing';
import { LIST_TYPE } from '@/constants/billing';
import SelectRange from '@/components/billing/selectDateRange';
import useOverviewStore from '@/stores/overview';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { getCookie } from '@/utils/cookieUtils';
import NotFound from '@/components/notFound';
import { ApiResp } from '@/types';
function NamespaceMenu({
  isDisabled,
  setNamespace
}: {
  isDisabled: boolean;
  setNamespace: (x: string) => void;
}) {
  const [namespaceIdx, setNamespaceIdx] = useState(0);
  const { data: nsListData } = useQuery({
    queryFn() {
      return request<any, ApiResp<{ nsList: string[] }>>('/api/billing/getNamespaceList');
    },
    queryKey: ['nsList']
  });
  const { t } = useTranslation();
  const namespaceList: string[] = [t('All Namespace'), ...(nsListData?.data?.nsList || [])];
  return (
    <Flex align={'center'} ml="28px">
      <Popover>
        <PopoverTrigger>
          <Button
            w="110px"
            h="32px"
            fontStyle="normal"
            fontWeight="400"
            fontSize="12px"
            lineHeight="140%"
            border={'1px solid #DEE0E2'}
            bg={'#F6F8F9'}
            _expanded={{
              background: '#F8FAFB',
              border: `1px solid #36ADEF`
            }}
            isDisabled={isDisabled}
            _hover={{
              background: '#F8FAFB',
              border: `1px solid #36ADEF`
            }}
            borderRadius={'2px'}
          >
            {namespaceList[namespaceIdx]}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          p={'6px'}
          boxSizing="border-box"
          w={'110px'}
          shadow={'0px 0px 1px 0px #798D9F40, 0px 2px 4px 0px #A1A7B340'}
          border={'none'}
        >
          {namespaceList.map((v, idx) => (
            <Button
              key={v}
              {...(idx === namespaceIdx
                ? {
                    color: '#0884DD',
                    bg: '#F4F6F8'
                  }
                : {
                    color: '#5A646E',
                    bg: '#FDFDFE'
                  })}
              h="30px"
              fontFamily="PingFang SC"
              fontSize="12px"
              fontWeight="400"
              lineHeight="18px"
              p={'0'}
              isDisabled={isDisabled}
              onClick={() => {
                setNamespaceIdx(idx);
                setNamespace(idx === 0 ? '' : namespaceList[namespaceIdx + 1]);
              }}
            >
              {v}
            </Button>
          ))}
        </PopoverContent>
      </Popover>
    </Flex>
  );
}
function TypeMenu({
  isDisabled,
  selectType,
  setType,
  optional
}: {
  optional: BillingType[];
  isDisabled: boolean;
  selectType: BillingType;
  setType: Dispatch<SetStateAction<BillingType>>;
}) {
  const { t } = useTranslation();
  console.log(optional);
  return (
    <Popover>
      <PopoverTrigger>
        <Button
          w="110px"
          h="32px"
          fontStyle="normal"
          fontWeight="400"
          fontSize="12px"
          lineHeight="140%"
          border={'1px solid #DEE0E2'}
          bg={'#F6F8F9'}
          _expanded={{
            background: '#F8FAFB',
            border: `1px solid #36ADEF`
          }}
          isDisabled={isDisabled}
          _hover={{
            background: '#F8FAFB',
            border: `1px solid #36ADEF`
          }}
          borderRadius={'2px'}
        >
          {t(LIST_TYPE[selectType + 1].title)}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        p={'6px'}
        boxSizing="border-box"
        w={'110px'}
        shadow={'0px 0px 1px 0px #798D9F40, 0px 2px 4px 0px #A1A7B340'}
        border={'none'}
      >
        {LIST_TYPE.filter((x) => optional.includes(x.value)).map((v) => (
          <Button
            key={v.value}
            color={v.value === selectType ? '#0884DD' : '#5A646E'}
            h="30px"
            fontFamily="PingFang SC"
            fontSize="12px"
            fontWeight="400"
            lineHeight="18px"
            p={'0'}
            isDisabled={isDisabled}
            bg={v.value === selectType ? '#F4F6F8' : '#FDFDFE'}
            onClick={() => {
              setType(v.value);
            }}
          >
            {t(v.title)}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
function SwitchPage({
  totalPage,
  totalItem,
  pageSize,
  currentPage,
  setCurrentPage
}: {
  currentPage: number;
  totalPage: number;
  totalItem: number;
  pageSize: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
}) {
  const { t } = useTranslation();
  return (
    <Flex minW="370px" h="32px" align={'center'} mt={'20px'}>
      <Text>{t('Total')}:</Text>
      <Flex w="40px">{totalItem}</Flex>
      <Flex gap={'8px'}>
        <Button
          variant={'switchPage'}
          isDisabled={currentPage === 1}
          onClick={(e) => {
            e.preventDefault();
            setCurrentPage(1);
          }}
        >
          <Img w="6px" h="6px" src={arrow_left_icon.src}></Img>
        </Button>
        <Button
          variant={'switchPage'}
          isDisabled={currentPage === 1}
          onClick={(e) => {
            e.preventDefault();
            setCurrentPage(currentPage - 1);
          }}
        >
          <Img src={arrow_icon.src} transform={'rotate(-90deg)'}></Img>
        </Button>
        <Text>{currentPage}</Text>/<Text>{totalPage}</Text>
        <Button
          variant={'switchPage'}
          isDisabled={currentPage === totalPage}
          bg={currentPage !== totalPage ? '#EDEFF1' : '#F1F4F6'}
          onClick={(e) => {
            e.preventDefault();
            setCurrentPage(currentPage + 1);
          }}
        >
          <Img src={arrow_icon.src} transform={'rotate(90deg)'}></Img>
        </Button>
        <Button
          variant={'switchPage'}
          isDisabled={currentPage === totalPage}
          bg={currentPage !== totalPage ? '#EDEFF1' : '#F1F4F6'}
          mr={'10px'}
          onClick={(e) => {
            e.preventDefault();
            setCurrentPage(totalPage);
          }}
        >
          <Img w="6px" h="6px" src={arrow_left_icon.src} transform={'rotate(180deg)'}></Img>
        </Button>
      </Flex>
      <Text>{pageSize}</Text>
      <Text>/{t('Page')}</Text>
    </Flex>
  );
}
function SearchBox({
  isDisabled,
  setOrderID
}: {
  isDisabled: boolean;
  setOrderID: Dispatch<SetStateAction<string>>;
}) {
  const { t } = useTranslation();
  const [searchValue, setSearch] = useState('');
  return (
    <Flex align={'center'} ml={'auto'} mb={'24px'}>
      <Flex
        mr="16px"
        border="1px solid #DEE0E2"
        h="32px"
        align={'center'}
        py={'10.3px'}
        pl={'9.3px'}
        borderRadius={'2px'}
      >
        <Img src={magnifyingGlass_icon.src} w={'14px'} mr={'8px'}></Img>
        <Input
          isDisabled={isDisabled}
          variant={'unstyled'}
          placeholder={t('Order Number') as string}
          value={searchValue}
          onChange={(v) => setSearch(v.target.value)}
        ></Input>
      </Flex>
      <Button
        isDisabled={isDisabled}
        variant={'unstyled'}
        display="flex"
        justifyContent={'center'}
        alignContent={'center'}
        width="88px"
        height="32px"
        bg="#24282C"
        borderRadius="4px"
        color={'white'}
        fontWeight="500"
        fontSize="14px"
        _hover={{
          opacity: '0.5'
        }}
        onClick={(e) => {
          e.preventDefault();
          setOrderID(searchValue);
        }}
      >
        {t('Search')}
      </Button>
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
  const [namespaceIdx, setNamespaceIdx] = useState(0);
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
    <TabPanel p="0">
      <Flex alignItems={'center'} flexWrap={'wrap'}>
        <Flex align={'center'} mb={'24px'}>
          <Text fontSize={'12px'} mr={'12px'} width={['60px', '60px', 'auto', 'auto']}>
            {t('Transaction Time')}
          </Text>
          <SelectRange isDisabled={isFetching}></SelectRange>
        </Flex>
        <Flex align={'center'} mb={'24px'}>
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
          <Box overflow={'auto'}>
            <CommonBillingTable
              data={tableResult.filter((x) =>
                [BillingType.CONSUME, BillingType.RECHARGE].includes(x.type)
              )}
            />
          </Box>
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
    <TabPanel p="0">
      <Flex alignItems={'center'} flexWrap={'wrap'}>
        <Flex align={'center'} mb={'24px'}>
          <Text fontSize={'12px'} mr={'12px'} width={['60px', '60px', 'auto', 'auto']}>
            {t('Transaction Time')}
          </Text>
          <SelectRange isDisabled={isFetching}></SelectRange>
        </Flex>
        <Flex align={'center'} mb={'24px'}>
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
          <Box overflow={'auto'}>
            <TransferBillingTable
              data={tableResult.filter((x) =>
                [BillingType.RECEIVE, BillingType.TRANSFER].includes(x.type)
              )}
            />
          </Box>
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
  const { t, i18n } = useTranslation();
  const cookie = getCookie('NEXT_LOCALE');
  useEffect(() => {
    i18n.changeLanguage(cookie);
  }, [cookie, i18n]);
  const [namespace, setNamespace] = useState('');
  return (
    <Flex flexDirection="column" w="100%" h="100%" bg={'white'} p="24px">
      <Flex mr="24px" align={'center'}>
        <Img src={receipt_icon.src} w={'24px'} h={'24px'} mr={'18px'} dropShadow={'#24282C'}></Img>
        <Heading size="lg">{t('SideBar.BillingDetails')}</Heading>
        <NamespaceMenu isDisabled={false} setNamespace={setNamespace} />
      </Flex>
      <Tabs variant="unstyled">
        <TabList>
          <Tab color={'#9CA2A8'} _selected={{ color: '#24282C' }}>
            {t('Receipts And Disbursements')}
          </Tab>
          <Tab color={'#9CA2A8'} _selected={{ color: '#24282C' }}>
            {t('Transfer')}
          </Tab>
        </TabList>
        <TabIndicator mt="-1.5px" height="2px" bg="#24282C" borderRadius="1px" />
        <TabPanels mt="24px">
          <InOutTabPanel namespace={namespace} />
          <TransferTabPanel namespace={namespace} />
        </TabPanels>
      </Tabs>
    </Flex>
  );
}

export default Billing;
export async function getServerSideProps(content: any) {
  const locale = content?.req?.cookies?.NEXT_LOCALE || 'zh';
  return {
    props: {
      ...(await serverSideTranslations(locale, undefined, null, content.locales))
    }
  };
}

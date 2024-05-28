import { InvoiceTable } from '@/components/invoice/invoiceTable';
import { Box, Button, Flex, Heading, Img, Input, Text } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import receipt_icon from '@/assert/invoice-active.svg';
import arrow_icon from '@/assert/Vector.svg';
import arrow_left_icon from '@/assert/toleft.svg';
import magnifyingGlass_icon from '@/assert/magnifyingGlass.svg';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import request from '@/service/request';
import { RechargeBillingData, RechargeBillingItem } from '@/types/billing';
import SelectRange from '@/components/billing/selectDateRange';
import useOverviewStore from '@/stores/overview';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import NotFound from '@/components/notFound';
import listIcon from '@/assert/list.svg';
import { ApiResp, ReqGenInvoice } from '@/types';
import InvoicdForm from './InvoicdForm';
import { formatMoney } from '@/utils/format';

function Invoice() {
  const { t, i18n } = useTranslation();
  const startTime = useOverviewStore((state) => state.startTime);
  const endTime = useOverviewStore((state) => state.endTime);
  const selectBillings = useRef<RechargeBillingItem[]>([]);
  const [searchValue, setSearch] = useState('');
  const [orderID, setOrderID] = useState('');
  const [totalPage, setTotalPage] = useState(1);
  const [currentPage, setcurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const queryClient = useQueryClient();
  const [invoiceAmount, setInvoiceAmount] = useState(0);
  const [processState, setProcessState] = useState(0);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const { data, isLoading, isSuccess } = useQuery(
    [
      'billing',
      'invoice',
      {
        startTime,
        endTime
      }
    ],
    () => {
      return request<any, ApiResp<RechargeBillingData>>('/api/billing/recharge', {
        data: {
          startTime,
          endTime
        },
        method: 'POST'
      });
    },
    {
      select(data) {
        return ((data?.data?.payment || []) as RechargeBillingItem[])
          .filter((d) => !d.InvoicedAt)
          .map((d) => ({
            ...d,
            Amount: formatMoney(d.Amount)
          }));
      }
    }
  );

  return (
    <Flex flexDirection="column" w="100%" h="100%" bg={'white'} p="24px" overflow={'auto'}>
      {processState === 0 ? (
        <>
          <Flex mr="24px" align={'center'}>
            <Img
              src={receipt_icon.src}
              w={'24px'}
              h={'24px'}
              mr={'18px'}
              dropShadow={'#24282C'}
            ></Img>
            <Heading size="lg">{t('SideBar.CreateInvoice')}</Heading>
          </Flex>
          <Flex mt="24px" alignItems={'center'} flexWrap={'wrap'}>
            <Flex align={'center'} mb={'24px'}>
              <Text fontSize={'12px'} mr={'12px'} width={['60px', '60px', 'auto', 'auto']}>
                {t('Transaction Time')}
              </Text>
              <SelectRange isDisabled={isLoading}></SelectRange>
            </Flex>

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
                  isDisabled={isLoading}
                  variant={'unstyled'}
                  placeholder={t('Order Number') as string}
                  value={searchValue}
                  onChange={(v) => setSearch(v.target.value)}
                ></Input>
              </Flex>
              <Button
                isDisabled={isLoading}
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
                  setOrderID(searchValue.trim());
                }}
              >
                {t('Search')}
              </Button>
            </Flex>
          </Flex>
          {isSuccess ? (
            <>
              <Box
                overflow={'auto'}
                fontFamily="PingFang SC"
                fontSize="14px"
                fontWeight="500"
                lineHeight="20px"
              >
                <Flex mb={'16px'} align="center">
                  <Flex align={'center'}>
                    <Img src={listIcon.src} w={'20px'} h={'20px'} mr={'6px'} />
                    <Text>{t('orders.list')}</Text>
                  </Flex>
                  <Flex ml={'auto'} align="center">
                    <Flex>
                      <Text>{t('orders.invoiceAmount')}:</Text>
                      <Text color="rgba(29, 140, 220, 1)">￥ {invoiceAmount}</Text>
                    </Flex>
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        setProcessState(1);
                      }}
                      isDisabled={invoiceCount === 0}
                      ml="19px"
                      color="#FFFFFF"
                      bg={'#24282C'}
                      variant={'unstyled'}
                      _hover={{
                        opacity: '0.5'
                      }}
                      py="6px"
                      px="30px"
                    >
                      {t('orders.invoice')} {invoiceCount > 0 ? <>({invoiceCount})</> : <></>}
                    </Button>
                  </Flex>
                </Flex>
                <InvoiceTable
                  selectbillings={selectBillings.current || []}
                  data={data}
                  onSelect={(checked, item) => {
                    if (checked) {
                      setInvoiceAmount(invoiceAmount + item.Amount);
                      setInvoiceCount(invoiceCount + 1);
                      selectBillings.current.push({ ...item });
                    } else {
                      setInvoiceAmount(invoiceAmount - item.Amount);
                      setInvoiceCount(invoiceCount - 1);
                      const idx = selectBillings.current.findIndex(
                        (billing) => billing.ID === item.ID
                      );
                      selectBillings.current.splice(idx, 1);
                    }
                  }}
                ></InvoiceTable>
              </Box>
              <Flex w="370px" h="32px" align={'center'} mt={'20px'} mx="auto">
                <Text>{t('Total')}:</Text>
                <Flex w="40px">{data.length}</Flex>
                <Flex gap={'8px'}>
                  <Button
                    variant={'switchPage'}
                    isDisabled={currentPage === 1}
                    onClick={(e) => {
                      e.preventDefault();
                      setcurrentPage(1);
                    }}
                  >
                    <Img w="6px" h="6px" src={arrow_left_icon.src}></Img>
                  </Button>
                  <Button
                    variant={'switchPage'}
                    isDisabled={currentPage === 1}
                    onClick={(e) => {
                      e.preventDefault();
                      setcurrentPage(currentPage - 1);
                    }}
                  >
                    <Img src={arrow_icon.src} transform={'rotate(-90deg)'}></Img>
                  </Button>
                  <Flex my={'auto'}>
                    <Text>{currentPage}</Text>/<Text>{totalPage}</Text>
                  </Flex>
                  <Button
                    variant={'switchPage'}
                    isDisabled={currentPage === totalPage}
                    bg={currentPage !== totalPage ? '#EDEFF1' : '#F1F4F6'}
                    onClick={(e) => {
                      e.preventDefault();
                      setcurrentPage(currentPage + 1);
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
                      setcurrentPage(totalPage);
                    }}
                  >
                    <Img
                      w="6px"
                      h="6px"
                      src={arrow_left_icon.src}
                      transform={'rotate(180deg)'}
                    ></Img>
                  </Button>
                </Flex>
                <Text>{pageSize}</Text>
                <Text>/{t('Page')}</Text>
              </Flex>
            </>
          ) : (
            <Flex
              direction={'column'}
              w="full"
              align={'center'}
              flex={'1'}
              h={'0'}
              justify={'center'}
            >
              <NotFound></NotFound>
            </Flex>
          )}
        </>
      ) : processState === 1 ? (
        <InvoicdForm
          onSuccess={() => {
            selectBillings.current = [];
            setInvoiceAmount(0);
            setInvoiceCount(0);
            queryClient.invalidateQueries({
              queryKey: ['billing'],
              exact: false
            });
          }}
          invoiceAmount={invoiceAmount}
          invoiceCount={invoiceCount}
          billings={selectBillings}
          backcb={() => {
            setProcessState(0);
          }}
        ></InvoicdForm>
      ) : (
        <></>
      )}
    </Flex>
  );
}

export default Invoice;

export async function getServerSideProps({ locale }: { locale: string }) {
  if (!global.AppConfig.costCenter.invoice.enabled) {
    return {
      redirect: {
        destination: '/cost_overview',
        permanent: false
      }
    };
  }
  return {
    props: {
      ...(await serverSideTranslations(locale, undefined, null, ['zh', 'en']))
    }
  };
}

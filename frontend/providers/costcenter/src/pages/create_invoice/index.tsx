import receipt_icon from '@/assert/invoice-active.svg';
import magnifyingGlass_icon from '@/assert/magnifyingGlass.svg';
import PaymentPanel from '@/components/invoice/PaymentPanel';
import RecordPanel from '@/components/invoice/RecordPanel';
import { formatMoney } from '@/utils/format';
import {
  Button as ChakraButton,
  Flex,
  Heading,
  IconButton,
  Img,
  Input as ChakraInput,
  InputGroup,
  InputRightElement,
  Tab,
  TabList,
  TabPanels,
  Tabs as ChakraTabs,
  Text
} from '@chakra-ui/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sealos/shadcn-ui/tabs';
import { Separator } from '@sealos/shadcn-ui/separator';
import { cn } from '@sealos/shadcn-ui';
import { Button } from '@sealos/shadcn-ui/button';
import { TableCell, TableHead, TableRow } from '@sealos/shadcn-ui/table';
import { Pagination } from '@sealos/shadcn-ui/pagination';
import { DateRangePicker } from '@sealos/shadcn-ui/date-range-picker';
import { Input } from '@sealos/shadcn-ui/input';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useMemo, useState, useEffect } from 'react';
import InvoicdForm from './InvoicdForm';
import InvoicdFormDetail from './InvoicdFormDetail';
import { Search } from 'lucide-react';
import request from '@/service/request';
import { DateRange } from 'react-day-picker';
import { getPaymentList } from '@/api/plan';
import { ApiResp } from '@/types';
import { RechargeBillingData } from '@/types/billing';
import {
  TableLayout,
  TableLayoutCaption,
  TableLayoutHeadRow,
  TableLayoutBody,
  TableLayoutFooter,
  TableLayoutContent
} from '@sealos/shadcn-ui/table-layout';
import OrderList, { CombinedRow } from '@/components/invoice/OrderList';
import useBillingStore from '@/stores/billing';

function Invoice() {
  const { t, i18n } = useTranslation();
  const [selectBillings, setSelectBillings] = useState<CombinedRow[]>([]);
  const [searchValue, setSearch] = useState('');
  const [orderID, setOrderID] = useState('');
  const queryClient = useQueryClient();
  const [tabIdx, setTabIdx] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [processState, setProcessState] = useState(0);
  const invoiceAmount = selectBillings.reduce((acc, cur) => acc + cur.amount, 0);
  const invoiceCount = selectBillings.length;
  const isLoading = false;

  const effectiveStartTime = useMemo(() => {
    return dateRange?.from
      ? new Date(dateRange.from).toISOString()
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  }, [dateRange?.from]);
  const effectiveEndTime = useMemo(() => {
    return dateRange?.to ? new Date(dateRange.to).toISOString() : new Date().toISOString();
  }, [dateRange?.to]);

  const regionList = useBillingStore((s) => s.regionList);
  const regionUidToName = useMemo(() => {
    const map = new Map<string, string>();
    (regionList || []).forEach((r) => map.set(r.uid, r.name?.en || r.uid));
    return map;
  }, [regionList]);

  const rechargeBody = useMemo(
    () => ({
      startTime: effectiveStartTime,
      endTime: effectiveEndTime,
      page: 1,
      pageSize: 1000,
      paymentID: orderID,
      invoiced: false
    }),
    [effectiveStartTime, effectiveEndTime, orderID]
  );
  const { data: rechargeResp } = useQuery(['billing', 'invoice', rechargeBody], () => {
    return request<any, ApiResp<RechargeBillingData>>('/api/billing/rechargeBillingList', {
      data: rechargeBody,
      method: 'POST'
    });
  });

  const regionUids = useMemo(() => (regionList || []).map((r) => r.uid), [regionList]);
  const paymentListQueryBodyBase = useMemo(
    () => ({
      startTime: effectiveStartTime,
      endTime: effectiveEndTime
    }),
    [effectiveStartTime, effectiveEndTime]
  );
  const { data: allPaymentsData } = useQuery({
    queryFn: async () => {
      const entries = await Promise.all(
        (regionUids || []).map(async (uid) => {
          const payments = await getPaymentList({ ...paymentListQueryBodyBase, regionUid: uid })
            .then((res) => res?.data?.payments || [])
            .catch(() => []);
          return [uid, payments] as const;
        })
      );
      return entries.reduce<Record<string, any[]>>((acc, [uid, payments]) => {
        acc[uid] = payments;
        return acc;
      }, {});
    },
    queryKey: ['paymentListAllRegions', paymentListQueryBodyBase, regionUids],
    enabled: (regionUids?.length || 0) > 0
  });

  const mergedRows = useMemo(() => {
    const rechargePayments: any[] = (rechargeResp?.data?.payments || [])
      .filter((item) => !item.InvoicedAt && item.Status !== 'REFUNDED')
      .map((item) => ({
        id: item.ID,
        orderId: item.ID,
        region: regionUidToName.get(item.RegionUID) || item.RegionUID || '',
        workspace: '',
        type: '',
        time: item.CreatedAt,
        amount: item.Amount
      }));

    const subscriptionPayments: any[] = Object.entries(allPaymentsData || {}).flatMap(
      ([uid, payments]) =>
        (payments as any[]).map((p) => ({
          id: `${p.Time}-${p.PlanName}-${p.Amount}-${uid}`,
          orderId: '',
          region: regionUidToName.get(uid) || uid || '',
          workspace: '',
          type: '',
          time: p.Time,
          amount: p.Amount
        }))
    );

    return [...rechargePayments, ...subscriptionPayments].sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    );
  }, [rechargeResp, allPaymentsData, regionUidToName]);

  const paginationInfo = useMemo(() => {
    const total = mergedRows.length;
    const totalPage = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentPageData = mergedRows.slice(startIndex, endIndex);
    return { total, totalPage, currentPageData };
  }, [mergedRows, page, pageSize]);

  useEffect(() => {
    if (page > paginationInfo.totalPage) setPage(1);
  }, [paginationInfo.totalPage, page]);

  const ExampleHistoryRow = ({ selected }: { selected?: boolean }) => (
    <TableRow className="h-14 data-[selected]:bg-zinc-50" data-selected={selected}>
      <TableCell>2025-01-20 10:15</TableCell>
      <TableCell>2025-01-20 10:15</TableCell>
      <TableCell>$15.00</TableCell>
      <TableCell>
        <Button variant="outline">Download</Button>
      </TableCell>
    </TableRow>
  );

  return (
    <>
      <section>
        <Tabs defaultValue="listing">
          <TabsList variant="underline" className="w-fit">
            <TabsTrigger variant="cleanUnderline" value="listing">
              Order List
            </TabsTrigger>
            <TabsTrigger variant="cleanUnderline" value="history">
              Invoice History
            </TabsTrigger>
            <TabsTrigger variant="cleanUnderline" value="details_form">
              Details Form (dev)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listing">
            <OrderList
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              orderId={searchValue}
              onOrderIdChange={(v) => {
                setSearch(v);
                setOrderID(v.trim());
              }}
              onSelectionChange={(items) => {
                setSelectBillings(items);
              }}
            />
          </TabsContent>

          <TabsContent value="history">
            <TableLayout>
              <TableLayoutCaption>
                <div className="flex gap-3 items-center">
                  <DateRangePicker placeholder="PICK DATE RANGE!" buttonClassName="shadow-none" />
                  <Input icon={<Search size={16} />} placeholder="Order ID" className="w-[15rem]" />
                </div>
              </TableLayoutCaption>

              <TableLayoutContent>
                <TableLayoutHeadRow>
                  <TableHead>Invoice Request Time</TableHead>
                  <TableHead>Invoice Issued Time</TableHead>
                  <TableHead>Invoice Amount</TableHead>
                  <TableHead>Action</TableHead>
                </TableLayoutHeadRow>

                <TableLayoutBody>
                  <ExampleHistoryRow />
                  <ExampleHistoryRow selected />
                </TableLayoutBody>
              </TableLayoutContent>

              <TableLayoutFooter>
                <div className="px-4 py-3 flex justify-between">
                  <div className="flex items-center text-zinc-500">Total: 101</div>
                  <div className="flex items-center gap-3">
                    <Pagination currentPage={1} totalPages={20} onPageChange={() => {}} />
                    <span>
                      <span>8</span>
                      <span className="text-zinc-500"> / Page</span>
                    </span>
                  </div>
                </div>
              </TableLayoutFooter>
            </TableLayout>
          </TabsContent>

          <TabsContent value="details_form">
            <section className="flex flex-col border rounded-2xl mb-4 shadow-sm">
              <div className="border-b text-base font-medium p-6">Invoice Details</div>
              <div
                className={cn(
                  'px-8 py-6 grid grid-cols-2 gap-y-3 gap-x-6',
                  '[&>label]:text-sm [&>label]:font-medium [&>label]:flex [&>label]:items-start',
                  '[&>label>:first-child]:w-[15ch] [&>label>:first-child]:leading-[2.5rem]',
                  '[&>label_input]:h-10 [&>label>:nth-child(2)]:flex-1',
                  '[&>label:has(input[aria-invalid=true])_p]:text-destructive',
                  '[&>label:not(:has(input[aria-invalid=true]))_p]:pointer-events-none [&>label:not(:has(input[aria-invalid=true]))_p]:opacity-0'
                )}
              >
                <label>
                  <span>Invoice Items</span>
                  <span className="font-normal text-zinc-600 leading-[2.5rem]">
                    Electronic Computer Service Fee
                  </span>
                </label>
                <label>
                  <span>Invoice Type</span>
                  <div>
                    <Input type="text" aria-invalid></Input>
                    <p>Error text</p>
                  </div>
                </label>
                <label>
                  <span>Invoice Title</span>
                  <div>
                    <Input type="text"></Input>
                    <p>No error</p>
                  </div>
                </label>
                <label>
                  <span>Tax ID</span>
                  <div>
                    <Input type="text"></Input>
                    <p>No error</p>
                  </div>
                </label>
                <label>
                  <span>Bank Name</span>
                  <div>
                    <Input type="text"></Input>
                    <p>No error</p>
                  </div>
                </label>
                <label>
                  <span>Bank Account No.</span>
                  <div>
                    <Input type="text"></Input>
                    <p>No error</p>
                  </div>
                </label>
                <label>
                  <span>Address</span>
                  <div>
                    <Input type="text"></Input>
                    <p>No error</p>
                  </div>
                </label>
                <label>
                  <span>Tel</span>
                  <div>
                    <Input type="text"></Input>
                    <p>No error</p>
                  </div>
                </label>
                <label>
                  <span>Fax</span>
                  <div>
                    <Input type="text"></Input>
                    <p>No error</p>
                  </div>
                </label>
              </div>
            </section>

            <section className="flex flex-col border rounded-2xl shadow-sm">
              <div className="border-b text-base font-medium p-6">Invoice Details</div>
              <div
                className={cn(
                  'px-8 py-6 grid grid-cols-2 gap-y-3 gap-x-6',
                  '[&>label]:text-sm [&>label]:font-medium [&>label]:flex [&>label]:items-center',
                  '[&>label>:first-child]:w-[15ch]',
                  '[&>label_input]:h-10 [&>label>:nth-child(2)]:flex-1'
                )}
              >
                <label>
                  <span>Contact Person</span>
                  <Input type="text" aria-invalid></Input>
                </label>
                <label>
                  <span>Notification Email</span>
                  <Input type="text" aria-invalid></Input>
                </label>
                <Separator className="col-span-2 border-dashed bg-transparent border-b-1"></Separator>
                <label>
                  <span>Mobile Number</span>
                  <Input type="text"></Input>
                </label>
                <label>
                  <span>Verification Code</span>
                  <Input type="text"></Input>
                </label>
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </section>

      {/* // ! =================================================================== Old invoice page ! // */}
      <Flex
        flexDirection="column"
        w="100%"
        h="100%"
        bg={'white'}
        px="24px"
        py={'24px'}
        overflow={'auto'}
      >
        {processState === 0 ? (
          <>
            <Flex alignItems={'center'} flexWrap={'wrap'} mb={'24px'}>
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
              <InputGroup
                ml={'auto'}
                variant={'outline'}
                width={'260px'}
                // mb={'24px'}
              >
                <ChakraInput
                  isDisabled={isLoading}
                  placeholder={t('Order Number') as string}
                  value={searchValue}
                  onChange={(v) => setSearch(v.target.value)}
                />
                <InputRightElement>
                  <IconButton
                    minW={'auto'}
                    height={'auto'}
                    boxSize={'16px'}
                    onClick={(e) => {
                      e.preventDefault();
                      setOrderID(searchValue.trim());
                    }}
                    variant={'unstyled'}
                    icon={<Img src={magnifyingGlass_icon.src} boxSize={'16px'} />}
                    aria-label={'search orderId'}
                  ></IconButton>
                </InputRightElement>
              </InputGroup>
            </Flex>
            <ChakraTabs
              variant={'primary'}
              tabIndex={tabIdx}
              onChange={(idx) => {
                setTabIdx(idx);
              }}
            >
              <TabList>
                <Tab>
                  <Text>{t('orders.list')}</Text>
                </Tab>
                <Tab>
                  <Text>{t('orders.invoiceRecord')}</Text>
                </Tab>
                {tabIdx === 0 && (
                  <Flex ml={'auto'} align="center">
                    <Flex>
                      <Text>{t('orders.invoiceAmount')}:</Text>
                      <Text color="rgba(29, 140, 220, 1)">￥ {formatMoney(invoiceAmount)}</Text>
                    </Flex>
                    <ChakraButton
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
                    </ChakraButton>
                  </Flex>
                )}
              </TabList>
              <TabPanels>
                <PaymentPanel
                  selectbillings={[]}
                  setSelectBillings={() => {}}
                  orderID={orderID}
                ></PaymentPanel>
                <RecordPanel
                  toInvoiceDetail={() => {
                    setProcessState(2);
                  }}
                />
              </TabPanels>
            </ChakraTabs>
          </>
        ) : processState === 1 ? (
          <InvoicdForm
            onSuccess={() => {
              setSelectBillings([]);
              queryClient.invalidateQueries({
                queryKey: ['billing'],
                exact: false
              });
            }}
            invoiceAmount={invoiceAmount}
            invoiceCount={invoiceCount}
            billings={[]}
            backcb={() => {
              setProcessState(0);
            }}
          ></InvoicdForm>
        ) : processState === 2 ? (
          <InvoicdFormDetail
            onSuccess={() => {
              setSelectBillings([]);
              queryClient.invalidateQueries({
                queryKey: ['billing'],
                exact: false
              });
            }}
            backcb={() => {
              setProcessState(0);
            }}
          ></InvoicdFormDetail>
        ) : (
          <></>
        )}
      </Flex>
    </>
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

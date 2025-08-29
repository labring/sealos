import receipt_icon from '@/assert/invoice-active.svg';
import magnifyingGlass_icon from '@/assert/magnifyingGlass.svg';
import PaymentPanel from '@/components/invoice/PaymentPanel';
import RecordPanel from '@/components/invoice/RecordPanel';
import { RechargeBillingItem } from '@/types';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableFooter,
  TableRow
} from '@sealos/shadcn-ui/table';
import { Checkbox } from '@sealos/shadcn-ui/checkbox';
import { Pagination } from '@sealos/shadcn-ui/pagination';
import { DateRangePicker } from '@sealos/shadcn-ui/date-range-picker';
import { Input } from '@sealos/shadcn-ui/input';
import { Avatar, AvatarFallback } from '@sealos/shadcn-ui/avatar';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useState } from 'react';
import InvoicdForm from './InvoicdForm';
import InvoicdFormDetail from './InvoicdFormDetail';
import { Badge } from '@sealos/shadcn-ui/badge';
import { ReceiptText, Search } from 'lucide-react';
import {
  TableLayout,
  TableLayoutCaption,
  TableLayoutHeadRow,
  TableLayoutBody,
  TableLayoutFooter,
  TableLayoutContent
} from '@sealos/shadcn-ui/table-layout';

function Invoice() {
  const { t, i18n } = useTranslation();
  const [selectBillings, setSelectBillings] = useState<RechargeBillingItem[]>([]);
  const [searchValue, setSearch] = useState('');
  const [orderID, setOrderID] = useState('');
  const queryClient = useQueryClient();
  const [tabIdx, setTabIdx] = useState(0);

  const [processState, setProcessState] = useState(0);
  const invoiceAmount = selectBillings.reduce((acc, cur) => acc + cur.Amount, 0);
  const invoiceCount = selectBillings.length;
  const isLoading = false;

  const ExampleOrderListRow = ({ selected }: { selected?: boolean }) => (
    <TableRow className="h-14 data-[selected]:bg-zinc-50" data-selected={selected}>
      <TableCell>
        <Checkbox></Checkbox>
      </TableCell>
      <TableCell>ScVJXklcms-m</TableCell>
      <TableCell>Hangzhou</TableCell>
      <TableCell>
        <div className="flex gap-1 items-center">
          <Avatar className="size-4">
            <AvatarFallback>A</AvatarFallback>
          </Avatar>
          <span>sealos-test</span>
        </div>
      </TableCell>
      <TableCell>2025-01-20 10:15</TableCell>
      <TableCell>
        <Badge className="bg-blue-50 text-blue-600">Subscription Change</Badge>
      </TableCell>
      <TableCell>$15.00</TableCell>
    </TableRow>
  );

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
            <TableLayout>
              <TableLayoutCaption>
                <div className="flex gap-3 items-center">
                  <DateRangePicker placeholder="PICK DATE RANGE!" buttonClassName="shadow-none" />
                  <Input icon={<Search size={16} />} placeholder="Order ID" className="w-[15rem]" />
                </div>

                <div className="flex items-center gap-3 font-medium">
                  <div className="text-blue-600 text-base">Amount: $16.00</div>
                  <Button>
                    <ReceiptText size={16} />
                    <span>Obtain Invoice: 10</span>
                  </Button>
                </div>
              </TableLayoutCaption>

              <TableLayoutContent>
                <TableLayoutHeadRow>
                  <TableHead>
                    <Checkbox />
                  </TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Transaction Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                </TableLayoutHeadRow>

                <TableLayoutBody>
                  <ExampleOrderListRow />
                  <ExampleOrderListRow selected />
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
                  selectbillings={selectBillings}
                  setSelectBillings={setSelectBillings}
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
            billings={selectBillings}
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

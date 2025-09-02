import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sealos/shadcn-ui/tabs';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useState } from 'react';
import InvoiceForm from '@/components/invoice/InvoiceForm';
import InvoiceInspection from '@/components/invoice/InvoiceInspection';
import { DateRange } from 'react-day-picker';
import OrderList, { CombinedRow } from '@/components/invoice/OrderList';
import InvoiceHistory from '@/components/invoice/InvoiceHistory';
import useInvoiceStore from '@/stores/invoce';
import { InvoicePayload } from '@/types/invoice';

function Invoice() {
  const { t, i18n } = useTranslation();
  const { data: invoiceInspectionData, setData: setInvoiceInspectionData } = useInvoiceStore();
  const [selectBillings, setSelectBillings] = useState<CombinedRow[]>([]);
  const [searchValue, setSearch] = useState('');
  const [orderID, setOrderID] = useState('');
  const [historySearchValue, setHistorySearchValue] = useState('');
  const [historyDateRange, setHistoryDateRange] = useState<DateRange | undefined>();
  const queryClient = useQueryClient();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const [processState, setProcessState] = useState(0);
  const invoiceAmount = selectBillings.reduce((acc, cur) => acc + cur.amount, 0);
  const invoiceCount = selectBillings.length;

  const handleInvoiceClick = (invoice: InvoicePayload) => {
    setInvoiceInspectionData(invoice);
  };

  return (
    <>
      {processState === 0 ? (
        <section>
          <Tabs defaultValue="listing">
            <TabsList variant="underline" className="w-fit">
              <TabsTrigger variant="cleanUnderline" value="listing">
                Order List
              </TabsTrigger>
              <TabsTrigger variant="cleanUnderline" value="history">
                Invoice History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="listing">
              <OrderList
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                orderIdFilter={searchValue}
                onOrderIdFilterChange={(v) => {
                  setSearch(v);
                  setOrderID(v.trim());
                }}
                onSelectionChange={(items) => {
                  setSelectBillings(items);
                }}
                onObtainInvoice={() => {
                  setProcessState(1);
                }}
              />
            </TabsContent>

            <TabsContent value="history">
              <InvoiceHistory
                dateRange={historyDateRange}
                onDateRangeChange={setHistoryDateRange}
                orderIdFilter={historySearchValue}
                onOrderIdFilterChange={setHistorySearchValue}
                toInvoiceDetail={() => {
                  setProcessState(2);
                }}
                onInvoiceClick={handleInvoiceClick}
              />
            </TabsContent>
          </Tabs>
        </section>
      ) : processState === 1 ? (
        <section>
          <InvoiceForm
            invoiceAmount={invoiceAmount}
            invoiceCount={invoiceCount}
            billings={selectBillings.map((item) => ({
              order_id: item.id,
              regionUID: item.region,
              createdTime: item.time,
              amount: item.amount
            }))}
            onSuccess={() => {
              setSelectBillings([]);
              queryClient.invalidateQueries({
                queryKey: ['billing'],
                exact: false
              });
              setProcessState(0); // Return to main page after success
            }}
            onBack={() => {
              setProcessState(0); // Return to main page
            }}
          />
        </section>
      ) : processState === 2 ? (
        <section>
          <InvoiceInspection
            invoiceData={invoiceInspectionData ?? null}
            onBack={() => {
              setInvoiceInspectionData();
              setProcessState(0);
            }}
          />
        </section>
      ) : null}
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

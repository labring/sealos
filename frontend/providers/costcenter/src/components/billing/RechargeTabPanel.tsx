import CurrencySymbol from '@/components/CurrencySymbol';
import AmountDisplay from '@/components/billing/AmountDisplay';
import Amount from '@/components/billing/AmountTableHeader';
import SearchBox from '@/components/billing/SearchBox';
import SwitchPage from '@/components/billing/SwitchPage';
import SelectRange from '@/components/billing/selectDateRange';
import { BaseTable } from '@/components/table/BaseTable';
import { TableHeaderID } from '@/constants/billing';
import request from '@/service/request';
import useBillingStore from '@/stores/billing';
import useEnvStore from '@/stores/env';
import useOverviewStore from '@/stores/overview';
import { ApiResp, BillingType, RechargeBillingData, RechargeBillingItem } from '@/types';
import { Box, Flex, TabPanel, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import {
  CellContext,
  HeaderContext,
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable
} from '@tanstack/react-table';
import { format, formatISO } from 'date-fns';
import { useTranslation } from 'next-i18next';
import { useEffect, useMemo } from 'react';

export default function RechargeTabPanel() {
  const { startTime, endTime } = useOverviewStore();
  const { getRegion } = useBillingStore();
  const { data, isFetching, isSuccess } = useQuery(
    ['billing', 'in', { startTime, endTime }],
    () => {
      const body = {
        startTime: formatISO(startTime, { representation: 'complete' }),
        // startTime,
        endTime: formatISO(endTime, { representation: 'complete' }),
        regionUid: getRegion()?.uid || ''
      };
      return request<any, ApiResp<RechargeBillingData>>('/api/billing/rechargeBillingList', {
        method: 'POST',
        data: body
      });
    }
  );
  const { t } = useTranslation();
  const tableResult = useMemo(() => {
    if (data?.data?.payments) return data.data.payments;
    else return [];
  }, [data?.data?.payments]);
  const currency = useEnvStore((s) => s.currency);
  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<RechargeBillingItem>();
    const customTh = (needCurrency?: boolean) =>
      function CustomTh({ header }: HeaderContext<RechargeBillingItem, unknown>) {
        return (
          <Flex display={'flex'} alignItems={'center'}>
            <Text mr="4px">{t(header.id)}</Text>
            {!!needCurrency && (
              <Text>
                <CurrencySymbol type={currency} />
              </Text>
            )}
          </Flex>
        );
      };
    const customCell = (isTotal?: boolean) =>
      function CustomCell(props: CellContext<RechargeBillingItem, number>) {
        const original = props.row.original;
        return (
          <Amount total={isTotal} type={BillingType.RECHARGE} amount={props.cell.getValue()} />
        );
      };
    return [
      columnHelper.accessor((row) => row.ID, {
        header: customTh(),
        id: TableHeaderID.OrderNumber,
        enablePinning: true,
        cell(props) {
          const item = props.row.original;
          return (
            <Box>
              <Text color={'#24282C'} fontSize={'12px'}>
                {item.ID}
              </Text>
            </Box>
          );
        }
      }),
      columnHelper.accessor((row) => row.CreatedAt, {
        header: customTh(),
        id: TableHeaderID.TransactionTime,
        enablePinning: true,
        cell(props) {
          const date = new Date(props.cell.getValue());
          return format(date, 'MM-dd HH:mm');
        }
      }),
      columnHelper.accessor((row) => row.Amount, {
        id: TableHeaderID.TotalAmount,
        header: customTh(true),
        cell: customCell(true)
      })
    ];
  }, [t, currency]);
  const table = useReactTable({
    data: tableResult,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 10
      }
    },
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  useEffect(() => {
    table.resetPageIndex(true);
  }, [startTime, endTime]);
  return (
    <TabPanel p="0" display={'flex'} flexDirection={'column'} flex={'auto'}>
      <Flex alignItems={'center'} flexWrap={'wrap'}>
        <Flex align={'center'} mb="24px">
          <Text fontSize={'12px'} mr={'12px'} width={['60px', '60px', 'auto', 'auto']}>
            {t('Transaction Time')}
          </Text>
          <SelectRange isDisabled={isFetching}></SelectRange>
        </Flex>
        <SearchBox
          isDisabled={isFetching}
          setOrderID={(val) => {
            table.getColumn(TableHeaderID.OrderNumber)!.setFilterValue(val);
          }}
        />
      </Flex>
      <BaseTable flex={'auto'} overflow={'auto'} overflowY={'auto'} table={table} />
      <Flex justifyContent={'space-between'} mt="20px">
        <AmountDisplay />
        <SwitchPage
          totalPage={table.getPageCount()}
          totalItem={tableResult.length}
          pageSize={table.getState().pagination.pageSize}
          currentPage={table.getState().pagination.pageIndex + 1}
          setCurrentPage={(pageIdx) => {
            table.setPageIndex(pageIdx - 1);
          }}
          mt="0"
        />
      </Flex>
    </TabPanel>
  );
}

import useOverviewStore from '@/stores/overview';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  CellContext,
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  HeaderContext,
  PaginationState,
  useReactTable
} from '@tanstack/react-table';
import { BaseTable } from '@/components/billing/billingTable';
import { ApiResp, BillingType, RechargeBillingData, RechargeBillingItem } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { format, formatISO, parseISO } from 'date-fns';
import request from '@/service/request';
import { useTranslation } from 'next-i18next';
import { Box, Flex, TabPanel, Text } from '@chakra-ui/react';
import SelectRange from '@/components/billing/selectDateRange';
import AmountDisplay from '@/components/billing/AmountDisplay';
import SwitchPage from '@/components/billing/SwitchPage';
import useEnvStore from '@/stores/env';
import CurrencySymbol from '@/components/CurrencySymbol';
import { TableHeaderID } from '@/constants/billing';
import Amount from '@/components/billing/AmountTableHeader';
import SearchBox from '@/components/billing/SearchBox';

export default function RechargeTabPanel() {
  const { startTime, endTime } = useOverviewStore();
  const { data, isFetching, isSuccess } = useQuery(
    ['billing', 'in', { startTime, endTime }],
    () => {
      const body = {
        startTime: formatISO(startTime, { representation: 'complete' }),
        // startTime,
        endTime: formatISO(endTime, { representation: 'complete' })
      };
      return request<any, ApiResp<RechargeBillingData>>('/api/billing/recharge', {
        method: 'POST',
        data: body
      });
    }
  );
  const { t } = useTranslation();
  const tableResult = useMemo(() => {
    if (data?.data?.payment) return data.data.payment;
    else return [];
  }, [data?.data?.payment]);
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
                (<CurrencySymbol type={currency} />)
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

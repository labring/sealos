import { TableHeaderID } from '@/constants/billing';
import useEnvStore from '@/stores/env';
import { RechargeBillingItem, ReqGenInvoice } from '@/types';
import { formatMoney } from '@/utils/format';
import { Checkbox, Flex, Text } from '@chakra-ui/react';
import {
  HeaderContext,
  RowSelectionState,
  createColumnHelper,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { useTranslation } from 'next-i18next';
import { useEffect, useMemo, useState } from 'react';
import CurrencySymbol from '../CurrencySymbol';
import { BaseTable } from './InoviceBaseTable';

export function InvoicePaymentTable({
  data,
  selectbillings,
  setSelectBillings
}: {
  data: ReqGenInvoice['billings'];
  selectbillings: ReqGenInvoice['billings'];
  setSelectBillings?: (items: RechargeBillingItem[]) => void;
}) {
  const { t } = useTranslation();
  const needSelect = !!setSelectBillings;
  const currency = useEnvStore((s) => s.currency);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>(
    Object.fromEntries(selectbillings.map((v) => [v.ID, true]))
  );

  useEffect(() => {
    const billings = Object.keys(rowSelection).flatMap((id) => {
      const rows = table.getRowModel().rowsById[id];
      if (!rows) return [];
      if (!rows.getIsSelected()) return [];
      return [rows.original];
    });
    setSelectBillings?.(billings);
  }, [rowSelection]);

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
    return [
      columnHelper.accessor((row) => row.ID, {
        header: customTh(),
        id: TableHeaderID.OrderNumber,
        cell({ row }) {
          const item = row.original;

          return (
            <Flex
              gap={'12px'}
              color={'grayModern.900'}
              fontSize={'12px'}
              fontWeight={500}
              alignItems={'center'}
            >
              {needSelect && (
                <Checkbox
                  boxSize={'16px'}
                  isChecked={row.getIsSelected()}
                  isDisabled={!row.getCanSelect()}
                  onClickCapture={(e) => e.preventDefault()}
                />
              )}
              {item.ID}
            </Flex>
          );
        },
        enablePinning: true
      }),
      columnHelper.accessor((row) => row.CreatedAt, {
        id: TableHeaderID.TransactionTime,
        header: customTh(),
        cell(props) {
          const time = props.cell.getValue();
          return format(new Date(time), 'MM-dd HH:mm');
        }
      }),
      columnHelper.accessor((row) => row.Amount, {
        id: TableHeaderID.TotalAmount,
        header: customTh(true),
        cell(props) {
          const amount = props.cell.getValue();
          return (
            <Text gap={'6px'} color={'brightBlue.600'}>
              {formatMoney(amount)}
            </Text>
          );
        },
        enablePinning: true
      })
    ];
  }, [t, currency, needSelect, selectbillings]);

  const table = useReactTable({
    data,
    getRowId: (row) => row.ID,
    onRowSelectionChange: setRowSelection, //hoist up the row selection state to your own scope
    state: {
      columnPinning: {
        left: [TableHeaderID.APPName],
        right: [TableHeaderID.TotalAmount]
      },
      rowSelection
    },
    columns,
    getCoreRowModel: getCoreRowModel()
  });
  return <BaseTable table={table}></BaseTable>;
}

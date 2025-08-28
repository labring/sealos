import Amount from '@/components/billing/AmountTableHeader';
import { TableHeaderID } from '@/constants/billing';
import { valuationMap } from '@/constants/payment';
import useAppTypeStore from '@/stores/appType';
import useEnvStore from '@/stores/env';
import { APPBillingItem, BillingType } from '@/types/billing';
import { Flex, TableContainerProps, Text } from '@chakra-ui/react';
import {
  CellContext,
  HeaderContext,
  createColumnHelper,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table';
import { format, parseISO, subHours } from 'date-fns';
import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';
import CurrencySymbol from '../CurrencySymbol';
import { BaseTable } from '../table/BaseTable';
import { AppIcon } from '../AppIcon';
const getAmountCell = (data?: { isTotal?: boolean }) =>
  function AmountCell(props: CellContext<APPBillingItem, number>) {
    const isTotal = data?.isTotal || false;
    return <Amount total={isTotal} type={BillingType.CONSUME} amount={props.cell.getValue()} />;
  };
const getAppTypeCell = () =>
  function TranslationCell(props: CellContext<APPBillingItem, APPBillingItem['app_type']>) {
    const { t } = useTranslation('applist');
    const { getAppType } = useAppTypeStore();
    const appType = getAppType(props.cell.getValue() + '');
    const text = t(appType);
    return t(text);
  };
export function BillingDetailsTable({
  data,
  ...styles
}: { data: APPBillingItem[] } & TableContainerProps) {
  const { t } = useTranslation();
  const { currency, gpuEnabled } = useEnvStore((s) => s);
  const { getAppType } = useAppTypeStore();

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<APPBillingItem>();
    const customTh = (needCurrency?: boolean) =>
      function CustomTh({ header }: HeaderContext<APPBillingItem, unknown>) {
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
      function CustomCell(props: CellContext<APPBillingItem, number>) {
        return <Amount total={isTotal} type={BillingType.CONSUME} amount={props.cell.getValue()} />;
      };
    const getUnit = (
      x: 'cpu' | 'memory' | 'storage' | 'gpu' | 'network' | 'services.nodeports'
    ) => {
      return function CustomCell(props: CellContext<APPBillingItem, number>) {
        const resourceEntity = valuationMap.get(x);
        if (!resourceEntity) return '0';
        const value = props.cell.getValue();
        if (isNaN(value)) return '-';
        const unit = resourceEntity.unit;
        //return props.cell.getValue() / resourceEntity.scale + ' ' + t(unit, { ns: 'common' });
        return value / resourceEntity.scale + ' ' + t(unit, { ns: 'common' });
      };
    };
    return [
      columnHelper.accessor((row) => row.app_name, {
        header: customTh(),
        id: TableHeaderID.APPName,
        cell(props) {
          const original = props.row.original;
          const app_type = original.app_type;
          const appName =
            props.getValue() || (app_type === 3 ? t('TERMINAL', { ns: 'applist' }) : t('Other'));
          return (
            <Flex gap={'6px'} color={'grayModern.900'}>
              <AppIcon app={getAppType(app_type.toString())} />

              <Text>{appName}</Text>
            </Flex>
          );
        },
        enablePinning: true
      }),
      columnHelper.accessor((row) => row.app_type, {
        header: customTh(),
        id: TableHeaderID.APPType,
        cell: getAppTypeCell(),
        enablePinning: true
      }),
      columnHelper.accessor((row) => row.used[0], {
        id: TableHeaderID.CPU,
        header: customTh(),
        cell: getUnit('cpu')
      }),
      columnHelper.accessor((row) => row.used_amount[0], {
        id: TableHeaderID.CPUAmount,
        header: customTh(),
        cell: customCell()
      }),
      columnHelper.accessor((row) => row.used[1], {
        id: TableHeaderID.Memory,
        header: customTh(),
        cell: getUnit('memory')
      }),
      columnHelper.accessor((row) => row.used_amount[1], {
        id: TableHeaderID.MemoryAmount,
        header: customTh(),
        cell: customCell()
      }),
      columnHelper.accessor((row) => row.used[2], {
        id: TableHeaderID.Storage,
        header: customTh(),
        cell: getUnit('storage')
      }),
      columnHelper.accessor((row) => row.used_amount[2], {
        id: TableHeaderID.StorageAmount,
        header: customTh(),
        cell: customCell()
      }),
      columnHelper.accessor((row) => row.used[3], {
        id: TableHeaderID.Network,
        header: customTh(),
        cell: getUnit('network')
      }),
      columnHelper.accessor((row) => row.used_amount[3], {
        id: TableHeaderID.NetworkAmount,
        header: customTh(),
        cell: customCell()
      }),
      columnHelper.accessor((row) => row.used[4], {
        id: TableHeaderID.Port,
        header: customTh(),
        cell: getUnit('services.nodeports')
      }),
      columnHelper.accessor((row) => row.used_amount[4], {
        id: TableHeaderID.PortAmount,
        header: customTh(),
        cell: customCell()
      }),
      ...(gpuEnabled
        ? [
            columnHelper.accessor((row) => row.used[5], {
              id: TableHeaderID.GPU,
              header: customTh(),
              cell: getUnit('gpu')
            }),
            columnHelper.accessor((row) => row.used_amount[5], {
              id: TableHeaderID.GPUAmount,
              header: customTh(),
              cell: customCell()
            })
          ]
        : []),
      columnHelper.accessor((row) => row.time, {
        id: TableHeaderID.TransactionTime,
        header: customTh(),
        cell(props) {
          const time = props.cell.getValue();
          return (
            format(subHours(parseISO(time), 1), 'yyyy-MM-dd HH:MM') +
            ' ~ ' +
            format(parseISO(time), 'HH:MM')
          );
        }
      }),
      columnHelper.accessor((row) => row.amount, {
        id: TableHeaderID.TotalAmount,
        header: customTh(true),
        cell: getAmountCell({ isTotal: true }),
        enablePinning: true
      })
    ];
  }, [t, currency]);
  const table = useReactTable({
    data,
    state: {
      columnPinning: {
        left: [TableHeaderID.APPName],
        right: [TableHeaderID.TotalAmount]
      }
    },
    columns,
    getCoreRowModel: getCoreRowModel()
  });
  return <BaseTable table={table} h="auto" {...styles} height={'auto'} />;
}

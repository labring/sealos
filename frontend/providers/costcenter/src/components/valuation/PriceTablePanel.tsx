import useEnvStore from '@/stores/env';
import { useTranslation } from 'next-i18next';
import { formatMoney } from '@/utils/format';
import {
  HeaderContext,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table';
import { useMemo } from 'react';
import CurrencySymbol from '../CurrencySymbol';
import {
  TableLayout,
  TableLayoutHeadRow,
  TableLayoutBody,
  TableLayoutContent
} from '@sealos/shadcn-ui/table-layout';
import { TableHead, TableRow, TableCell } from '@sealos/shadcn-ui/table';
import { LucideIcon } from 'lucide-react';

export type PricePayload = {
  price: number;
  title: string;
  unit: string;
  isGpu: boolean;
  icon: LucideIcon;
};

export function PriceTablePanel({ priceData }: { priceData: PricePayload[] }) {
  const { t } = useTranslation();
  const currency = useEnvStore((s) => s.currency);
  const gpuEnabled = useEnvStore((state) => state.gpuEnabled);

  const gpuData = priceData.filter((x) => x.isGpu);
  const otherData = priceData.filter((x) => !x.isGpu);
  const networkData = otherData.filter((x) => x.title === 'network');
  const baseData = otherData.filter((x) => x.title !== 'network');

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<PricePayload>();
    const getTh = (needCurrency?: boolean) =>
      function CustomTh({ header }: HeaderContext<PricePayload, unknown>) {
        return (
          <div className="flex items-center">
            <span className="mr-1">{header.id}</span>
            {!!needCurrency && <CurrencySymbol type={currency} />}
          </div>
        );
      };
    return [
      columnHelper.accessor((row) => row.title, {
        id: t('common:valuation.name'),
        header: getTh(),
        cell(props) {
          const name = props.cell.getValue();
          const Icon = props.row.original.icon;
          return (
            <div className="flex items-center">
              <Icon size={20} strokeWidth={1.5} className="h-4 w-4 mr-2 text-gray-400" />
              <div className="flex flex-col items-start">
                <span className="capitalize text-center">{t(name)}</span>
              </div>
            </div>
          );
        }
      }),
      columnHelper.accessor((row) => row.unit, {
        id: t('common:valuation.unit'),
        header: getTh(),
        cell(props) {
          const unit = props.cell.getValue();
          return unit;
        }
      }),
      columnHelper.accessor((row) => row.price, {
        id: t('common:valuation.price'),
        header: getTh(),
        cell(props) {
          const price = props.cell.getValue();
          return <span>{formatMoney(price).toFixed(6)}</span>;
        }
      })
    ];
  }, [t, currency]);

  const table = useReactTable({
    data: [], // We'll render data manually
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  const SectionHeader = ({ title }: { title: string }) => (
    <TableRow className="bg-gray-50">
      <TableCell colSpan={999} className="px-4 h-12 font-medium">
        <div className="flex items-center">
          <span>{title}</span>
        </div>
      </TableCell>
    </TableRow>
  );

  const renderDataRows = (data: PricePayload[]) =>
    data.map((row, idx) => (
      <TableRow
        key={`${row.title}-${idx}`}
        className="border-b border-gray-200 last:border-b-0 h-14"
      >
        {columns.map((column, colIdx) => (
          <TableCell key={colIdx} className="text-sm">
            {flexRender(column.cell, {
              getValue: () => {
                if (column.id === t('common:valuation.name')) return row.title;
                if (column.id === t('common:valuation.unit')) return row.unit;
                if (column.id === t('common:valuation.price')) return row.price;
                return '';
              },
              row: { original: row },
              cell: {
                getValue: () => {
                  if (column.id === t('common:valuation.name')) return row.title;
                  if (column.id === t('common:valuation.unit')) return row.unit;
                  if (column.id === t('common:valuation.price')) return row.price;
                  return '';
                }
              }
            } as any)}
          </TableCell>
        ))}
      </TableRow>
    ));

  return (
    <div className="w-full">
      <TableLayout className="w-full mt-0 rounded-2xl border border-gray-200 text-sm">
        <TableLayoutContent>
          <TableLayoutHeadRow>
            {table.getHeaderGroups().map((headerGroup) =>
              headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="px-4 h-14 bg-gray-50 text-zinc-600">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))
            )}
          </TableLayoutHeadRow>

          <TableLayoutBody>
            {/* Basic Pricing Section */}
            {baseData.length > 0 && (
              <>
                <SectionHeader title={t('common:common_valuation')} />
                {renderDataRows(baseData)}
              </>
            )}

            {/* Network Pricing Section */}
            {networkData.length > 0 && (
              <>
                <SectionHeader title={t('common:network_valuation')} />
                {renderDataRows(networkData)}
              </>
            )}

            {/* GPU Section */}
            {gpuEnabled && gpuData.length > 0 && (
              <>
                <SectionHeader title={t('common:gpu_valuation')} />
                {renderDataRows(gpuData)}
              </>
            )}
          </TableLayoutBody>
        </TableLayoutContent>
      </TableLayout>
    </div>
  );
}

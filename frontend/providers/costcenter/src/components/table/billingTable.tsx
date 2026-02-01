import Amount from '@/components/billing/AmountTableHeader';
import { TableHeaderID } from '@/constants/billing';
import useAppTypeStore from '@/stores/appType';
import useBillingStore from '@/stores/billing';
import useEnvStore from '@/stores/env';
import { APPBillingItem, BillingType } from '@/types/billing';
import {
  buildResourceIndexMap,
  getResourceDisplayValue,
  getResourceUnit,
  getSortedResources
} from '@/utils/resourceMapping';
import { Flex, TableContainerProps, Text } from '@chakra-ui/react';
import {
  CellContext,
  HeaderContext,
  createColumnHelper,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, subHours } from 'date-fns';
import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';
import CurrencySymbol from '../CurrencySymbol';
import { AppImg, BaseTable } from '../table/BaseTable';
import request from '@/service/request';
import { ApiResp } from '@/types';
import { ValuationStandard } from '@/types/valuation';

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
  const { getRegion } = useBillingStore();

  const { data: propertiesData } = useQuery({
    queryKey: ['properties', getRegion()?.uid],
    queryFn: () =>
      request.post<any, ApiResp<{ properties: ValuationStandard[] }>>('/api/properties', {
        regionUid: getRegion()?.uid || ''
      }),
    staleTime: 5 * 60 * 1000
  });

  const resourceMap = useMemo(() => {
    if (!propertiesData?.data?.properties) return new Map();
    return buildResourceIndexMap(propertiesData.data.properties);
  }, [propertiesData]);

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

    const baseColumns = [
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
              <AppImg app_type={app_type + ''} boxSize={'20px'}></AppImg>
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
      })
    ];

    const resourceColumns: any[] = [];

    if (resourceMap.size > 0) {
      const sortedResources = getSortedResources(resourceMap);
      const gpuIndices: number[] = [];

      sortedResources.forEach(([enumIndex, resource]) => {
        if (resource.resourceType === 'gpu') {
          gpuIndices.push(enumIndex);
          return;
        }

        // Get proper header text based on resource type
        const getHeaderText = () => {
          if (resource.resourceType === 'cpu') return TableHeaderID.CPU;
          if (resource.resourceType === 'memory') return TableHeaderID.Memory;
          if (resource.resourceType === 'storage') return TableHeaderID.Storage;
          if (resource.resourceType === 'network') return TableHeaderID.Network;
          if (resource.resourceType === 'services.nodeports') return TableHeaderID.Port;
          return resource.alias || resource.name;
        };

        const getAmountHeaderText = () => {
          if (resource.resourceType === 'cpu') return TableHeaderID.CPUAmount;
          if (resource.resourceType === 'memory') return TableHeaderID.MemoryAmount;
          if (resource.resourceType === 'storage') return TableHeaderID.StorageAmount;
          if (resource.resourceType === 'network') return TableHeaderID.NetworkAmount;
          if (resource.resourceType === 'services.nodeports') return TableHeaderID.PortAmount;
          return `${resource.alias || resource.name} Amount`;
        };

        const headerText = getHeaderText();
        const amountHeaderText = getAmountHeaderText();

        resourceColumns.push(
          columnHelper.accessor((row) => row.used[enumIndex], {
            id: `${resource.resourceType}_${enumIndex}`,
            header: () => <Text>{t(headerText)}</Text>,
            cell(props) {
              const value = props.getValue();
              const displayValue = getResourceDisplayValue(value, enumIndex, resourceMap);
              const unit = getResourceUnit(enumIndex, resourceMap);
              return displayValue === '-' ? '-' : `${displayValue} ${t(unit, { ns: 'common' })}`;
            }
          })
        );

        resourceColumns.push(
          columnHelper.accessor((row) => row.used_amount[enumIndex], {
            id: `${resource.resourceType}_amount_${enumIndex}`,
            header: () => <Text>{t(amountHeaderText)}</Text>,
            cell: customCell()
          })
        );
      });

      // Add merged GPU column if GPU is enabled and GPU resources exist
      if (gpuEnabled && gpuIndices.length > 0) {
        const gpuConfig = resourceMap.get(gpuIndices[0]);

        resourceColumns.push(
          columnHelper.display({
            id: 'gpu_usage',
            header: () => <Text>{t(TableHeaderID.GPU)}</Text>,
            cell(props) {
              const row = props.row.original;
              let totalUsed = 0;
              gpuIndices.forEach((idx) => {
                totalUsed += row.used[idx] || 0;
              });

              if (!totalUsed || isNaN(totalUsed)) return '-';

              const displayValue = gpuConfig ? totalUsed / gpuConfig.scale : totalUsed;
              const unit = gpuConfig?.unit || 'GPU Unit';
              return `${displayValue} ${t(unit, { ns: 'common' })}`;
            }
          })
        );

        resourceColumns.push(
          columnHelper.display({
            id: 'gpu_amount',
            header: () => <Text>{t(TableHeaderID.GPUAmount)}</Text>,
            cell(props) {
              const row = props.row.original;
              let totalAmount = 0;
              gpuIndices.forEach((idx) => {
                totalAmount += row.used_amount[idx] || 0;
              });

              if (!totalAmount || isNaN(totalAmount)) return '-';

              return <Amount type={BillingType.CONSUME} amount={totalAmount} />;
            }
          })
        );
      }
    }

    const endColumns = [
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

    return [...baseColumns, ...resourceColumns, ...endColumns];
  }, [t, currency, gpuEnabled, resourceMap]);

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

import { TableHeaderID } from '@/constants/billing';
import useAppTypeStore from '@/stores/appType';
import useEnvStore from '@/stores/env';
import { APPBillingItem, BillingType } from '@/types';
import { Box, Flex, TableContainerProps, Text } from '@chakra-ui/react';
import {
  CellContext,
  HeaderContext,
  createColumnHelper,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table';
import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';
import CurrencySymbol from '../CurrencySymbol';
import Amount from '../billing/AmountTableHeader';
import { BaseTable } from './BaseTable';
import BillingDetails from './billingDetails';

import useBillingStore from '@/stores/billing';
import { format, parseISO, subHours } from 'date-fns';
import { AppIcon } from '../AppIcon';
const getCustomTh = (data?: { tNs?: string; needCurrency?: boolean }) =>
  function CustomTh({ header }: HeaderContext<APPBillingItem, unknown>) {
    const tNs = data?.tNs || 'common';
    const needCurrency = data?.needCurrency || false;
    const { t } = useTranslation(tNs);
    const currency = useEnvStore((s) => s.currency);
    return (
      <Flex display={'flex'} alignItems={'center'}>
        <Text mr="4px" color="grayModern.600">
          {t(header.id)}
        </Text>
        {!!needCurrency && (
          <Text>
            <CurrencySymbol type={currency} />
          </Text>
        )}
      </Flex>
    );
  };
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
    return <Text color={'grayModern.600'}>{t(text)}</Text>;
  };
const getAppBillingDetailCell = () =>
  function TranslationCell(props: CellContext<APPBillingItem, unknown>) {
    const item = props.row.original;
    return (
      <BillingDetails
        appName={item.app_name}
        app_type={item.app_type}
        namespace={item.namespace}
        orderID={item.order_id}
      />
    );
  };

export function AppBillingTable({
  data,
  ...styles
}: { data: APPBillingItem[] } & TableContainerProps) {
  const { t, i18n } = useTranslation();
  const { getRegion, namespaceList } = useBillingStore();
  const { getAppType } = useAppTypeStore();
  const region = getRegion();

  const namespaceMap = useMemo(() => new Map(namespaceList), [namespaceList]);
  const regionName = i18n.language === 'zh' ? region?.name.zh || '' : region?.name.en || '';
  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<APPBillingItem>();
    return [
      columnHelper.accessor((row) => row.app_name, {
        header: getCustomTh(),
        id: TableHeaderID.APPName,
        cell(props) {
          const original = props.row.original;
          const app_type = original.app_type;
          const appName =
            props.getValue() || (app_type === 3 ? t('TERMINAL', { ns: 'applist' }) : t('Other'));
          return (
            <Flex gap={'6px'} color={'grayModern.900'}>
              <AppIcon app={getAppType(app_type.toString())} className={{ avatar: 'size-5' }} />
              <Text>{appName}</Text>
            </Flex>
          );
        },
        enablePinning: true
      }),
      columnHelper.accessor((row) => row.app_type, {
        id: TableHeaderID.APPType,
        header: getCustomTh(),
        cell: getAppTypeCell()
      }),
      columnHelper.display({
        id: TableHeaderID.Region,
        header: getCustomTh(),
        cell: regionName
      }),
      columnHelper.accessor((row) => row.namespace, {
        id: TableHeaderID.Namespace,
        header: getCustomTh(),
        cell(props) {
          return namespaceMap.get(props.getValue()) || props.getValue();
        }
      }),
      columnHelper.accessor((row) => row.time, {
        id: TableHeaderID.TransactionTime,
        header: getCustomTh(),
        cell(props) {
          const time = parseISO(props.cell.getValue());
          return (
            <Box color={'grayModern.600'}>
              <Text>{format(subHours(time, 1), 'yyyy-MM-dd')}</Text>
              <Text>{format(subHours(time, 1), 'HH:MM') + ' ~ ' + format(time, 'HH:MM')}</Text>
            </Box>
          );
        }
      }),
      columnHelper.accessor((row) => row.amount, {
        id: TableHeaderID.TotalAmount,
        header: getCustomTh({
          needCurrency: true
        }),
        cell: getAmountCell({ isTotal: true })
      }),
      columnHelper.display({
        header: getCustomTh(),
        id: TableHeaderID.Handle,
        enablePinning: true,
        cell: getAppBillingDetailCell()
      })
    ];
  }, [regionName, t]);
  const table = useReactTable({
    data,
    state: {
      columnPinning: {
        left: [TableHeaderID.APPName],
        right: [TableHeaderID.Handle]
      }
    },
    columns,
    getCoreRowModel: getCoreRowModel()
  });
  return <BaseTable table={table} h="auto" {...styles} />;
}

import { TableHeaderID } from '@/constants/billing';
import useAppTypeStore from '@/stores/appType';
import useBillingStore from '@/stores/billing';
import useEnvStore from '@/stores/env';
import { AppOverviewBilling, BillingType } from '@/types';
import { Flex, TableContainerProps, Text } from '@chakra-ui/react';
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
import AppOverviewDetails from './AppBillingDetails';
import { AppImg, BaseTable } from './BaseTable';

const getCustomTh = (data?: { tNs?: string; needCurrency?: boolean }) =>
  function CustomTh({ header }: HeaderContext<AppOverviewBilling, unknown>) {
    const tNs = data?.tNs || 'common';
    const needCurrency = data?.needCurrency || false;
    const { t } = useTranslation(tNs);
    const currency = useEnvStore((s) => s.currency);
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
const getAmountCell = (data?: { isTotal?: boolean }) =>
  function AmountCell(props: CellContext<AppOverviewBilling, number>) {
    const isTotal = data?.isTotal || false;
    return <Amount total={isTotal} type={BillingType.CONSUME} amount={props.cell.getValue()} />;
  };
const getAppTypeCell = () =>
  function TranslationCell(props: CellContext<AppOverviewBilling, AppOverviewBilling['appType']>) {
    const { t } = useTranslation('applist');
    const { getAppType } = useAppTypeStore();
    const appType = getAppType(props.cell.getValue() + '');
    const text = t(appType);
    return t(text);
  };
const getAppBillingDetailCell = (data?: { tNs?: string }) =>
  function TranslationCell(props: CellContext<AppOverviewBilling, unknown>) {
    const { t } = useTranslation('applist');
    const { getAppType } = useAppTypeStore();
    const item = props.row.original;
    const appType = getAppType(item.appType + '');
    return (
      <AppOverviewDetails appName={item.appName} appType={appType} namespace={''} regionUid={''} />
    );
  };
export function AppOverviewTable({
  data,
  ...styles
}: { data: AppOverviewBilling[] } & TableContainerProps) {
  const { getAppType } = useAppTypeStore();
  const { t, i18n } = useTranslation();
  const { getRegion, namespaceList } = useBillingStore();
  const region = getRegion();
  const namespaceMap = useMemo(() => new Map(namespaceList), [namespaceList]);
  const regionName = i18n.language === 'zh' ? region?.name.zh || '' : region?.name.en || '';
  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<AppOverviewBilling>();
    return [
      columnHelper.accessor((row) => row.appName || t('Other'), {
        header: getCustomTh(),
        id: TableHeaderID.APPName,
        cell(props) {
          const original = props.row.original;
          const app_type = original.appType;
          const appName =
            props.getValue() || (app_type === 3 ? t('TERMINAL', { ns: 'applist' }) : t('Other'));
          return (
            <Flex gap={'6px'} color={'grayModern.900'}>
              <AppImg app_type={app_type + ''} boxSize={'20px'} />
              <Text>{appName}</Text>
            </Flex>
          );
        },
        enablePinning: true
      }),
      columnHelper.accessor((row) => row.appType, {
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
        cell(props) {
          const { appType, namespace } = props.row.original;

          return (
            <AppOverviewDetails
              appName={props.row.original.appName}
              appType={getAppType(appType + '')}
              namespace={namespace}
              regionUid={getRegion()?.uid || ''}
            />
          );
        }
      })
    ];
  }, [t, regionName]);
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

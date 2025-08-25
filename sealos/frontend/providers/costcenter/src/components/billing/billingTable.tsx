import lineDown from '@/assert/lineDown.svg';
import lineUp from '@/assert/lineUp.svg';
import Amount from '@/components/billing/AmountTableHeader';
import { TableHeaderID } from '@/constants/billing';
import useEnvStore from '@/stores/env';
import useSessionStore from '@/stores/session';
import { BillingItem, BillingType, TransferBilling } from '@/types/billing';
import { Box, Flex, Img, TableContainerProps, Text } from '@chakra-ui/react';
import {
  CellContext,
  HeaderContext,
  createColumnHelper,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';
import CurrencySymbol from '../CurrencySymbol';
import { BaseTable } from '../table/BaseTable';
import BillingDetails from './billingDetails';
export function CommonBillingTable({
  data,
  isOverview = false,
  ...styles
}: { data: BillingItem[]; isOverview?: boolean } & TableContainerProps) {
  const { t } = useTranslation();
  const gpuEnabled = useEnvStore((state) => state.gpuEnabled);
  const currency = useEnvStore((s) => s.currency);
  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<BillingItem>();
    const customTh = (needCurrency?: boolean) =>
      function CustomTh({ header }: HeaderContext<BillingItem, unknown>) {
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
      function CustomCell(props: CellContext<BillingItem, number>) {
        const original = props.row.original;
        return <Amount total={isTotal} type={original.type} amount={props.cell.getValue()} />;
      };
    return [
      columnHelper.accessor((row) => row.order_id, {
        header: customTh(),
        id: TableHeaderID.OrderNumber,
        enablePinning: true,
        cell(props) {
          const item = props.row.original;
          return (
            <Box>
              <Text color={'#24282C'} fontSize={'12px'}>
                {item.order_id}
              </Text>
              <Text fontSize={'10px'} color={'#5A646E'}>
                {item.namespace}
              </Text>
            </Box>
          );
        }
      }),
      columnHelper.accessor((row) => row.time, {
        header: customTh(),
        id: TableHeaderID.TransactionTime,
        enablePinning: true,
        cell(props) {
          return format(parseISO(props.cell.getValue()), 'MM-dd HH:mm');
        }
      }),
      columnHelper.accessor((row) => row.appType, {
        header: customTh(),
        id: TableHeaderID.APPType,
        cell(props) {
          return (
            <Flex align={'center'} width={'full'} height={'full'}>
              {props.cell.getValue()}
            </Flex>
          );
        }
      }),
      columnHelper.accessor((row) => row.costs.cpu, {
        id: TableHeaderID.CPU,
        header: customTh(),
        cell: customCell()
      }),
      columnHelper.accessor((row) => row.costs.memory, {
        id: TableHeaderID.Memory,
        header: customTh(),
        cell: customCell()
      }),
      columnHelper.accessor((row) => row.costs.network, {
        id: TableHeaderID.Network,
        header: customTh(),
        cell: customCell()
      }),
      columnHelper.accessor((row) => row.costs.storage, {
        id: TableHeaderID.Storage,
        header: customTh(),
        cell: customCell()
      }),
      columnHelper.accessor((row) => row.costs.port, {
        id: TableHeaderID.Port,
        header: customTh(),
        cell: customCell()
      }),
      ...(gpuEnabled
        ? [
            columnHelper.accessor((row) => row.costs.gpu, {
              id: TableHeaderID.GPU,
              header: customTh(),
              cell: customCell()
            })
          ]
        : []),
      columnHelper.accessor((row) => row.amount, {
        id: TableHeaderID.TotalAmount,
        header: customTh(!isOverview),
        cell: customCell(true)
      }),
      columnHelper.display({
        header: customTh(),
        id: TableHeaderID.Handle,
        enablePinning: true,
        cell(props) {
          const item = props.row.original;
          return (
            <BillingDetails
              orderId={item.order_id}
              time={item.time}
              appType={item.appType}
              isDisabled={
                ['TERMINAL', 'OTHER'].includes(item.appType) || item.type !== BillingType.CONSUME
              }
            />
          );
        }
      })
    ];
  }, [useEnvStore.getState().gpuEnabled, t, currency]);
  const table = useReactTable({
    data,
    state: {
      columnPinning: {
        left: [TableHeaderID.OrderNumber],
        right: [TableHeaderID.Handle]
      }
    },
    columns,
    getCoreRowModel: getCoreRowModel()
  });
  return <BaseTable table={table} {...styles} />;
}

export function TransferBillingTable({ data }: { data: TransferBilling[] }) {
  const { t } = useTranslation();
  const currency = useEnvStore((s) => s.currency);
  const { session } = useSessionStore();
  const user = session.user;

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<TransferBilling>();
    const customTh = (needCurrency?: boolean) =>
      function CustomTh({ header }: HeaderContext<TransferBilling, unknown>) {
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
          return format(parseISO(props.cell.getValue()), 'MM-dd HH:mm');
        }
      }),
      columnHelper.accessor((row) => [row.FromUserID, row.ToUserID], {
        header: customTh(),
        id: TableHeaderID.TraderID,
        cell(props) {
          const item = props.row.original;
          const traderId = item.ToUserID === user.id ? item.FromUserID : item.ToUserID;
          return traderId;
        }
      }),
      columnHelper.accessor((row) => [row.ToUserID, row.FromUserID], {
        id: TableHeaderID.TransferType,
        header: customTh(),
        cell(props) {
          const item = props.row.original;
          const billingType =
            item.ToUserID === user.id ? BillingType.RECEIVE : BillingType.TRANSFER;
          return (
            <Flex align={'center'} width={'full'} height={'full'}>
              <Flex
                px={'12px'}
                py={'4px'}
                minW={'max-content'}
                {...(billingType === BillingType.RECEIVE
                  ? {
                      bg: '#E6F6F6',
                      color: '#00A9A6'
                    }
                  : {
                      bg: '#EBF7FD',
                      color: '#0884DD'
                    })}
                borderRadius="24px"
                align={'center'}
                justify={'space-evenly'}
              >
                <Img
                  src={billingType === BillingType.TRANSFER ? lineDown.src : lineUp.src}
                  w="13.14px"
                  mr={'6px'}
                ></Img>
                <Text>{billingType === BillingType.RECEIVE ? t('Recipient') : t('Transfer')}</Text>
              </Flex>
            </Flex>
          );
        }
      }),
      columnHelper.accessor((row) => row.Amount, {
        header: customTh(true),
        id: TableHeaderID.TotalAmount,
        cell(props) {
          const item = props.row.original;
          const billingType =
            item.ToUserID === user.id ? BillingType.RECEIVE : BillingType.TRANSFER;
          return <Amount total={true} type={billingType} amount={props.cell.getValue()} />;
        }
      })
    ];
  }, [useEnvStore.getState().gpuEnabled, t, currency, user]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel()
  });
  return <BaseTable table={table} h="auto" />;
}

export function BillingDetailsTable({
  data,
  ...styles
}: { data: BillingItem[] } & TableContainerProps) {
  const { t } = useTranslation();
  const gpuEnabled = useEnvStore((state) => state.gpuEnabled);
  const currency = useEnvStore((s) => s.currency);
  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<BillingItem>();
    const customTh = (needCurrency?: boolean) =>
      function CustomTh({ header }: HeaderContext<BillingItem, unknown>) {
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
      function CustomCell(props: CellContext<BillingItem, number>) {
        const original = props.row.original;
        return <Amount total={isTotal} type={original.type} amount={props.cell.getValue()} />;
      };
    return [
      columnHelper.accessor((row) => row.name, {
        header: customTh(),
        id: TableHeaderID.APPName,
        enablePinning: true
      }),
      columnHelper.accessor((row) => row.costs.cpu, {
        id: TableHeaderID.CPU,
        header: customTh(),
        cell: customCell()
      }),
      columnHelper.accessor((row) => row.costs.memory, {
        id: TableHeaderID.Memory,
        header: customTh(),
        cell: customCell()
      }),
      columnHelper.accessor((row) => row.costs.network, {
        id: TableHeaderID.Network,
        header: customTh(),
        cell: customCell()
      }),
      columnHelper.accessor((row) => row.costs.storage, {
        id: TableHeaderID.Storage,
        header: customTh(),
        cell: customCell()
      }),
      columnHelper.accessor((row) => row.costs.port, {
        id: TableHeaderID.Port,
        header: customTh(),
        cell: customCell()
      }),
      ...(gpuEnabled
        ? [
            columnHelper.accessor((row) => row.costs.gpu, {
              id: TableHeaderID.GPU,
              header: customTh(),
              cell: customCell()
            })
          ]
        : []),
      columnHelper.accessor((row) => row.amount, {
        id: TableHeaderID.TotalAmount,
        header: customTh(true),
        cell: customCell(true)
      })
    ];
  }, [useEnvStore.getState().gpuEnabled, t, currency]);
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
  return <BaseTable table={table} h="auto" {...styles} />;
}

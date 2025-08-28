import lineDown from '@/assert/lineDown.svg';
import lineUp from '@/assert/lineUp.svg';
import Amount from '@/components/billing/AmountTableHeader';
import { TableHeaderID } from '@/constants/billing';
import useEnvStore from '@/stores/env';
import useSessionStore from '@/stores/session';
import { BillingType, TransferBilling } from '@/types/billing';
import { Box, Flex, Img, Text } from '@chakra-ui/react';
import {
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

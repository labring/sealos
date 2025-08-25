import useEnvStore from '@/stores/env';
import { formatMoney } from '@/utils/format';
import { Flex, Img, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';
import {
  HeaderContext,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable
} from '@tanstack/react-table';
import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';
import CurrencySymbol from '../CurrencySymbol';
export type PricePayload = {
  price: number;
  title: string;
  unit: string;
  isGpu: boolean;
  icon: typeof Img;
};
export function PriceTable({ data }: { data: PricePayload[] }) {
  const { t } = useTranslation();
  const currency = useEnvStore((s) => s.currency);
  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<PricePayload>();
    const getTh = (needCurrency?: boolean) =>
      function CustomTh({ header }: HeaderContext<PricePayload, unknown>) {
        return (
          <Flex display={'flex'} alignItems={'center'}>
            <Text mr="4px" fontSize={'12px'}>
              {header.id}
            </Text>
            {!!needCurrency && <CurrencySymbol type={currency} />}
          </Flex>
        );
      };
    return [
      columnHelper.accessor((row) => row.title, {
        id: t('Valuation.Name'),
        header: getTh(),
        cell(props) {
          const name = props.cell.getValue();
          const Icon = props.row.original.icon;
          return (
            <Flex alignItems={'center'}>
              <Icon h="16px" w="16px" mr="8px" />
              <Flex flexDirection={'column'} alignItems={'flex-start'}>
                <Text textTransform={'capitalize'} textAlign={'center'} fontSize={'12px'}>
                  {t(name)}
                </Text>
              </Flex>
            </Flex>
          );
        }
      }),
      columnHelper.accessor((row) => row.unit, {
        id: t('Valuation.Unit'),
        header: getTh(),
        cell(props) {
          const unit = props.cell.getValue();
          return unit;
        }
      }),
      columnHelper.accessor((row) => row.price, {
        id: t('Valuation.Price'),
        header: getTh(),
        cell(props) {
          const price = props.cell.getValue();
          return <Text color={'brightBlue.600'}>{formatMoney(price).toFixed(6)}</Text>;
        }
      })
    ];
  }, [t, currency]);
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel()
  });
  return (
    <TableContainer
      w="100%"
      mt="0px"
      borderRadius={'6px'}
      border="1px solid"
      borderColor={'grayModern.250'}
    >
      <Table variant="unstyled">
        <Thead borderBottom="1px solid" overflow={'hidden'} borderColor={'grayModern.250'}>
          {table.getHeaderGroups().map((headerGroup) => {
            return (
              <Tr key={headerGroup.id}>
                {headerGroup.headers.map((header, idx) => (
                  <Th
                    px="24px"
                    pt="12px"
                    pb="14px"
                    w="200px"
                    background="#F1F4F6"
                    key={header.id}
                    borderRadius={'unset'}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </Th>
                ))}
              </Tr>
            );
          })}
        </Thead>
        <Tbody>
          {table.getRowModel().rows.map((row, idx, arr) => (
            <Tr
              borderBottom={idx !== arr.length - 1 ? '1px solid' : ''}
              borderColor={'grayModern.250'}
              key={row.id}
            >
              {row.getAllCells().map((cell) => (
                <Td fontSize={'12px'} key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
}

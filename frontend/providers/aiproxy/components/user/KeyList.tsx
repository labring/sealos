'use client';
import { useState } from 'react';
import { ArrowDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Flex,
  HStack,
  Select,
  Table,
  Tag,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr
} from '@chakra-ui/react';
import {
  Column,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable
} from '@tanstack/react-table';
import { TFunction } from 'i18next';

import { useTranslationClientSide } from '@/app/i18n/client';
import { useI18n } from '@/providers/i18n/i18nContext';

export function KeyList(): JSX.Element {
  const { lng } = useI18n();
  const { t } = useTranslationClientSide(lng, 'common');
  return (
    <>
      <Flex direction="column" alignItems="flex-start" gap="8px" alignSelf="stretch">
        <Text
          color="var(--Black, #000)"
          fontFamily="PingFang SC"
          fontSize="20px"
          fontStyle="normal"
          fontWeight={500}
          lineHeight="26px"
          letterSpacing="0.15px"
        >
          {t('keyList.title')}
        </Text>
      </Flex>
      <Flex direction="column" alignItems="flex-start" gap="12px">
        <KeyItem t={t} />
      </Flex>
    </>
  );
}

function KeyItem({ t }: { t: TFunction }): JSX.Element {
  return <TableDemo t={t} />;
}

// 1. 定义数据类型
type KeyItem = {
  id: number;
  name: string;
  key: string;
  createdAt: string;
  lastUsedAt: string;
  status: 'active' | 'inactive';
};

export enum TableHeaderId {
  NAME = 'key.name',
  KEY = 'key.key',
  CREATED_AT = 'key.createdAt',
  LAST_USED_AT = 'key.lastUsedAt',
  STATUS = 'key.status'
}

// 2. 自定义表头组件
const CustomHeader = ({ column, t }: { column: Column<KeyItem>; t: TFunction }) => {
  console.log(column);
  return (
    <HStack spacing={2}>
      <Text>{t(column.id)}</Text>
      {column.getIsSorted() &&
        {
          asc: <ArrowUpIcon boxSize={3} />,
          desc: <ArrowDownIcon boxSize={3} />
        }[column.getIsSorted() as string]}
    </HStack>
  );
};

const TableDemo = ({ t }: { t: TFunction }) => {
  const [data] = useState<KeyItem[]>([
    {
      id: 1,
      name: '1234567890',
      key: '1234567890',
      createdAt: '2021-01-01',
      lastUsedAt: '2021-01-01',
      status: 'active'
    },
    {
      id: 2,
      name: '1234567890',
      key: '1234567890',
      createdAt: '2021-01-01',
      lastUsedAt: '2021-01-01',
      status: 'inactive'
    }
  ]);

  const [sorting, setSorting] = useState<SortingState>([]);

  const columnHelper = createColumnHelper<KeyItem>();

  const columns = [
    columnHelper.accessor((row) => row.name, {
      id: TableHeaderId.NAME,
      header: (props) => <CustomHeader column={props.column} t={t} />,
      cell: (info) => {
        return info.getValue();
      }
    }),
    columnHelper.accessor((row) => row.key, {
      id: TableHeaderId.KEY,
      header: (props) => <CustomHeader column={props.column} t={t} />,
      cell: (info) => info.getValue()
    }),
    columnHelper.accessor((row) => row.createdAt, {
      id: TableHeaderId.CREATED_AT,
      header: (props) => <CustomHeader column={props.column} t={t} />,
      cell: (info) => info.getValue()
    }),
    columnHelper.accessor((row) => row.lastUsedAt, {
      id: TableHeaderId.LAST_USED_AT,
      header: (props) => <CustomHeader column={props.column} t={t} />,
      cell: (info) => info.getValue()
    }),
    columnHelper.accessor((row) => row.status, {
      id: TableHeaderId.STATUS,
      header: (props) => <CustomHeader column={props.column} t={t} />,
      cell: (info) => (
        <Tag colorScheme={info.getValue() === 'active' ? 'green' : 'red'} size="sm">
          {t(`status.${info.getValue()}`)}
        </Tag>
      )
    })
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting
    },
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <Box>
      <Table variant="simple">
        <Thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <Tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <Th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  cursor="pointer"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </Th>
              ))}
            </Tr>
          ))}
        </Thead>
        <Tbody>
          {table.getRowModel().rows.map((row) => (
            <Tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <Td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>

      <HStack spacing={4} mt={4} justify="flex-end">
        <Button
          size="sm"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
        >
          {'<<'}
        </Button>
        <Button
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeftIcon />
        </Button>
        <Button size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          <ChevronRightIcon />
        </Button>
        <Button
          size="sm"
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
        >
          {'>>'}
        </Button>

        <HStack>
          <Text>{t('pagination.page')}</Text>
          <Text fontWeight="bold">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </Text>
        </HStack>

        <Select
          size="sm"
          w="auto"
          value={table.getState().pagination.pageSize}
          onChange={(e) => {
            table.setPageSize(Number(e.target.value));
          }}
        >
          {[10, 20, 30, 40, 50].map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              {t('pagination.show')} {pageSize}
            </option>
          ))}
        </Select>
      </HStack>
    </Box>
  );
};

export default KeyList;

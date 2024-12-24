import {
  HTMLChakraProps,
  Spinner,
  Table,
  TableContainer,
  TableContainerProps,
  Tbody,
  Td,
  Th,
  Thead,
  Tr
} from '@chakra-ui/react';
import { Column, Table as ReactTable, flexRender } from '@tanstack/react-table';
import { CSSProperties } from 'react';

const getCommonPinningStyles = <T,>(column: Column<T, unknown>): CSSProperties => {
  const isPinned = column.getIsPinned();

  return {
    position: isPinned ? 'sticky' : 'relative',
    left: isPinned === 'left' ? 0 : undefined,
    right: isPinned === 'right' ? 0 : undefined,
    zIndex: isPinned ? 10 : 0
  };
};

export function BaseTable<T extends unknown>({
  table,
  isLoading,
  tdStyle,
  ...props
}: {
  table: ReactTable<T>;
  isLoading: boolean;
  tdStyle?: HTMLChakraProps<'td'>;
} & TableContainerProps) {
  return (
    <TableContainer {...props}>
      <Table variant="unstyled" width={'full'}>
        <Thead>
          {table.getHeaderGroups().map((headers) => {
            return (
              <Tr key={headers.id}>
                {headers.headers.map((header, i) => {
                  return (
                    <Th
                      fontSize={'12px'}
                      py="13px"
                      px={'24px'}
                      key={header.id}
                      bg={'grayModern.100'}
                      color={'grayModern.600'}
                      border={'none'}
                      _first={{
                        borderLeftRadius: '6px'
                      }}
                      _last={{
                        borderRightRadius: '6px'
                      }}
                      {...(getCommonPinningStyles(header.column) as HTMLChakraProps<'th'>)}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </Th>
                  );
                })}
              </Tr>
            );
          })}
        </Thead>
        <Tbody>
          {isLoading ? (
            <Tr>
              <Td h={'300px'} colSpan={table.getAllColumns().length} textAlign="center" py={4}>
                <Spinner size="xl" />
              </Td>
            </Tr>
          ) : (
            table.getRowModel().rows.map((item, index) => {
              return (
                <Tr key={item.id} fontSize={'12px'}>
                  {item.getAllCells().map((cell, i) => {
                    const isPinned = cell.column.getIsPinned();
                    return (
                      <Td
                        key={cell.id}
                        p={'10px 24px'}
                        bg={isPinned ? 'white' : ''}
                        borderBottom={'1px solid'}
                        borderBottomColor={
                          index !== table.getRowModel().rows.length - 1 ? '#F0F1F6' : 'transparent'
                        }
                        {...(getCommonPinningStyles(cell.column) as HTMLChakraProps<'td'>)}
                        {...tdStyle}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Td>
                    );
                  })}
                </Tr>
              );
            })
          )}
        </Tbody>
      </Table>
    </TableContainer>
  );
}

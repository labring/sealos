import {
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
import { Table as ReactTable, flexRender } from '@tanstack/react-table';

export function BaseTable<T extends unknown>({
  table,
  isLoading,
  ...props
}: { table: ReactTable<T>; isLoading: boolean } & TableContainerProps) {
  return (
    <TableContainer {...props}>
      <Table variant="unstyled" width={'full'}>
        <Thead position={'sticky'} top={0} zIndex={1}>
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
                      backgroundColor={'grayModern.50'}
                      color={'grayModern.600'}
                      border={'none'}
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
            table.getRowModel().rows.map((item) => {
              return (
                <Tr
                  key={item.id}
                  fontSize={'12px'}
                  // borderBottom={'1px solid'}
                  // borderColor={'#F0F1F6'}
                >
                  {item.getAllCells().map((cell, i) => {
                    return (
                      <Td py="10px" key={cell.id} px={'24px'}>
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

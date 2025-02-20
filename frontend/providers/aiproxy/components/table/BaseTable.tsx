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
} from '@chakra-ui/react'
import { Table as ReactTable, flexRender } from '@tanstack/react-table'

export function BaseTable<T extends unknown>({
  table,
  isLoading
}: { table: ReactTable<T>; isLoading: boolean } & TableContainerProps) {
  return (
    <TableContainer w="full" h="full" overflowY="auto" flex="1 0 0" minHeight="0">
      <Table variant="simple" fontSize="12px" w="full" size="md">
        <Thead>
          {table.getHeaderGroups().map((headers) => {
            return (
              <Tr key={headers.id} height="42px" alignSelf="stretch" bg="grayModern.100">
                {headers.headers.map((header, i) => {
                  return (
                    <Th
                      py="13px"
                      px="24px"
                      key={header.id}
                      color="grayModern.600"
                      border="none"
                      textTransform="none"
                      borderTopLeftRadius={i === 0 ? '6px' : '0'}
                      borderBottomLeftRadius={i === 0 ? '6px' : '0'}
                      borderTopRightRadius={i === headers.headers.length - 1 ? '6px' : '0'}
                      borderBottomRightRadius={i === headers.headers.length - 1 ? '6px' : '0'}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </Th>
                  )
                })}
              </Tr>
            )
          })}
        </Thead>
        <Tbody>
          {isLoading ? (
            <Tr height="48px" alignSelf="stretch" border="none">
              <Td
                h="300px"
                colSpan={table.getAllColumns().length}
                textAlign="center"
                py={4}
                border="none">
                <Spinner size="xl" />
              </Td>
            </Tr>
          ) : (
            table.getRowModel().rows.map((item) => {
              return (
                <Tr
                  key={item.id}
                  alignSelf="stretch"
                  borderBottom="1px solid"
                  borderColor="grayModern.150"
                  fontSize="12px">
                  {item.getAllCells().map((cell, i) => {
                    return (
                      <Td py="10px" key={cell.id} px="24px">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Td>
                    )
                  })}
                </Tr>
              )
            })
          )}
        </Tbody>
      </Table>
    </TableContainer>
  )
}

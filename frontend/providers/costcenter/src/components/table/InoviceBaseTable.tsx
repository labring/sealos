import {
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
  ...styles
}: { table: ReactTable<T> } & TableContainerProps) {
  return (
    <TableContainer
      w="100%"
      mt="0px"
      flex={'1'}
      h="0"
      borderRadius={'6px'}
      border="1px solid"
      borderColor={'grayModern.250'}
      {...styles}
    >
      <Table variant="simple" fontSize={'12px'} width={'full'}>
        <Thead>
          {table.getHeaderGroups().map((headers) => {
            return (
              <Tr key={headers.id}>
                {headers.headers.map((header, i) => {
                  const pinState = header.column.getIsPinned();
                  return (
                    <Th
                      py="14px"
                      px={'33px'}
                      top={'0'}
                      {...(!pinState
                        ? {
                            zIndex: 3
                          }
                        : {
                            [pinState]: 0,
                            _after: {
                              content: '""',
                              position: 'absolute',
                              top: 0,
                              bottom: '-1px',
                              width: '30px',
                              ...(pinState === 'right'
                                ? {
                                    right: '100%'
                                    // boxShadow: 'rgba(5, 5, 5, 0.06) -10px 0px 8px -8px inset'
                                  }
                                : {
                                    left: '100%'
                                    // boxShadow: 'rgba(5, 5, 5, 0.06) 10px 0px 8px -8px inset'
                                  })
                            },
                            bgColor: 'white',
                            zIndex: 4
                          })}
                      position={'sticky'}
                      key={header.id}
                      bg={'grayModern.100'}
                      color={'grayModern.600'}
                      _before={{
                        content: `""`,
                        display: 'block',
                        borderTopLeftRadius: '10px',
                        borderTopRightRadius: '10px',
                        background: '#F1F4F6'
                      }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </Th>
                  );
                })}
              </Tr>
            );
          })}
        </Thead>
        <Tbody whiteSpace={'nowrap'}>
          {table.getRowModel().rows.map((item) => {
            return (
              <Tr
                key={item.id}
                fontSize={'12px'}
                _hover={{
                  bgColor: 'brightBlue.50'
                }}
                onClick={item.getToggleSelectedHandler()}
                data-group
              >
                {item.getAllCells().map((cell, i) => {
                  const pinState = cell.column.getIsPinned();
                  return (
                    <Td
                      py="19px"
                      key={cell.id}
                      px={'33px'}
                      {...(!pinState
                        ? {}
                        : {
                            [pinState]: 0,
                            position: 'sticky',
                            zIndex: 2,
                            _after: {
                              content: '""',
                              position: 'absolute',
                              top: 0,
                              bottom: '-1px',
                              width: '30px',
                              ...(pinState === 'right'
                                ? {
                                    right: '100%'
                                    // boxShadow: 'rgba(5, 5, 5, 0.06) -10px 0px 8px -8px inset'
                                  }
                                : {
                                    left: '100%'
                                    // boxShadow: 'rgba(5, 5, 5, 0.06) 10px 0px 8px -8px inset'
                                  })
                            },
                            bgColor: 'white'
                          })}
                      _groupHover={{
                        bgColor: 'brightBlue.50'
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Td>
                  );
                })}
              </Tr>
            );
          })}
          {}
        </Tbody>
      </Table>
    </TableContainer>
  );
}

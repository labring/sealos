import appIcon from '@/assert/app.svg';
import cvmIcon from '@/assert/cvm.svg';
import dbIcon from '@/assert/db.svg';
import jobIcon from '@/assert/job.svg';
import osIcon from '@/assert/objectstorage.svg';
import sealosIcon from '@/assert/sealos.svg';
import terminalIcon from '@/assert/terminal.svg';
import useAppTypeStore from '@/stores/appType';
import {
  Img,
  ImgProps,
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
    <TableContainer w="100%" mt="0px" flex={'1'} h="0" overflowY={'auto'} {...styles}>
      <Table variant="simple" fontSize={'12px'} width={'full'}>
        <Thead>
          {table.getHeaderGroups().map((headers) => {
            return (
              <Tr key={headers.id}>
                {headers.headers.map((header, i) => {
                  const pinState = header.column.getIsPinned();
                  return (
                    <Th
                      py="13px"
                      px={'24px'}
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
                                  }
                                : {
                                    left: '100%'
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
              <Tr key={item.id} fontSize={'12px'}>
                {item.getAllCells().map((cell, i) => {
                  const pinState = cell.column.getIsPinned();
                  return (
                    <Td
                      py="10px"
                      key={cell.id}
                      px={'24px'}
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
export function AppImg({ app_type, ...props }: { app_type: string } & ImgProps) {
  const { getAppType } = useAppTypeStore();
  let uri = '';
  if (getAppType(app_type) === 'DB' || app_type === 'DB') {
    uri = dbIcon.src;
  } else if (getAppType(app_type) === 'APP' || app_type === 'APP') {
    uri = appIcon.src;
  } else if (getAppType(app_type) === 'TERMINAL' || app_type === 'TERMINAL') {
    uri = terminalIcon.src;
  } else if (getAppType(app_type) === 'JOB' || app_type === 'JOB') {
    uri = jobIcon.src;
  } else if (getAppType(app_type) === 'OBJECT-STORAGE' || app_type === 'OBJECT-STORAGE') {
    uri = osIcon.src;
  } else if (getAppType(app_type) === 'CLOUD-VM' || app_type === 'CLOUD-VM') {
    uri = cvmIcon.src;
  } else {
    uri = sealosIcon.src;
  }
  return <Img src={uri} boxSize={'20px'} {...props} />;
}

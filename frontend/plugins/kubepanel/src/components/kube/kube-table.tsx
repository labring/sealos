import { Table, Thead, Tbody, Tr, Th, Td, TableContainer, TableCaption } from '@chakra-ui/react';

export type Row = {
  idx: string | number;
  tds: Array<any>;
  onClickRow?: (idx: string | number) => void;
};

export type KubeTableParams = {
  columnNames: Array<string>;
  rows: Array<Row>;
};

export const KubeTable = ({ columnNames, rows }: KubeTableParams) => {
  const columnNamesTags = columnNames.map((name, idx) => <Th key={idx}>{name}</Th>);
  return (
    <TableContainer overflowX="scroll" maxW={'100vw'}>
      <Table variant="simple">
        <Thead bgColor={'gray.100'} borderRadius={'4px'} padding={'2px'} mb={'10px'}>
          <Tr>{columnNamesTags}</Tr>
        </Thead>
        <Tbody>
          {rows.map((row) => (
            <Tr
              onClick={(e) => {
                e.stopPropagation();
                row.onClickRow && row.onClickRow(row.idx);
              }}
              key={row.idx}
              cursor={row.onClickRow ? 'pointer' : 'initial'}
            >
              {row.tds.map((td, idx) => (
                <Td key={idx}>{td}</Td>
              ))}
            </Tr>
          ))}
        </Tbody>
        {rows.length === 0 && <TableCaption>list is empty</TableCaption>}
      </Table>
    </TableContainer>
  );
};

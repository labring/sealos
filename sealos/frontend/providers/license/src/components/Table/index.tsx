import React from 'react';
import { Box, BoxProps, Grid, Flex } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';

interface Props extends BoxProps {
  columns: {
    title: string;
    dataIndex?: string;
    key: string;
    render?: (item: any) => JSX.Element;
  }[];
  data: any[];
}

const Table = ({ columns, data }: Props) => {
  const { t } = useTranslation();
  return (
    <Grid templateColumns={`repeat(${columns.length},1fr)`} overflowX={'auto'}>
      {columns.map((item, i) => (
        <Box
          mb={2}
          px={3}
          py={3}
          bg={'white'}
          key={item.key}
          color={'myGray.500'}
          whiteSpace={'nowrap'}
          _first={{
            borderLeftRadius: 'md',
            pl: 7
          }}
          _last={{
            borderRightRadius: 'md'
          }}
        >
          {t(item.title)}
        </Box>
      ))}
      {data.map((item: any, index1) =>
        columns.map((col, index2) => (
          <Flex
            key={col.key}
            alignItems={'center'}
            bg={'white'}
            px={3}
            py={4}
            fontSize={'sm'}
            color={'myGray.600'}
            borderBottom={'1px solid'}
            borderBottomColor={index1 !== data.length - 1 ? 'myGray.100' : 'transparent'}
            borderTopLeftRadius={index1 === 0 && index2 === 0 ? 'md' : ''}
            borderTopRightRadius={index1 === 0 && index2 === columns.length - 1 ? 'md' : ''}
            borderBottomLeftRadius={index1 === data.length - 1 && index2 === 0 ? 'md' : ''}
            borderBottomEndRadius={
              index1 === data.length - 1 && index2 === columns.length - 1 ? 'md' : ''
            }
          >
            {col.render ? col.render(item) : col.dataIndex ? `${item[col.dataIndex]}` : ''}
          </Flex>
        ))
      )}
    </Grid>
  );
};

export default Table;

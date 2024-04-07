import React from 'react';
import { Box, BoxProps, Grid, Flex } from '@chakra-ui/react';

interface Props extends BoxProps {
  columns: {
    title: string;
    dataIndex?: string;
    key: string;
    render?: (item: any) => JSX.Element;
  }[];
  data: any[];
  itemClass?: string;
}

export const MyTable = ({ columns, data, itemClass = '' }: Props) => {
  return (
    <>
      <Grid
        templateColumns={`repeat(${columns.length},1fr)`}
        overflowX={'auto'}
        borderRadius={'md'}
        mb={2}
        fontSize={'base'}
        color={'grayModern.600'}
        fontWeight={'bold'}
      >
        {columns.map((item, i) => (
          <Box
            px={3}
            py={3}
            bg={'white'}
            key={item.key}
            whiteSpace={'nowrap'}
            _first={{
              pl: 7
            }}
          >
            {item.title}
          </Box>
        ))}
      </Grid>
      {data.map((item: any, index1) => (
        <Grid
          templateColumns={`repeat(${columns.length},1fr)`}
          overflowX={'auto'}
          key={index1}
          bg={'white'}
          _hover={{
            bg: '#FBFBFC'
          }}
          borderTopRadius={index1 === 0 ? 'md' : '0px'}
          borderBottomRadius={index1 === data.length - 1 ? 'md' : '0px'}
          borderBottom={'1px solid'}
          borderBottomColor={index1 !== data.length - 1 ? 'grayModern.150' : 'transparent'}
        >
          {columns.map((col, index2) => (
            <Flex
              className={index2 === 0 ? itemClass : ''}
              data-id={item.id}
              key={col.key}
              alignItems={'center'}
              px={3}
              py={4}
              fontSize={'base'}
              fontWeight={'bold'}
              color={'grayModern.900'}
            >
              {col.render ? col.render(item) : col.dataIndex ? `${item[col.dataIndex]}` : ''}
            </Flex>
          ))}
        </Grid>
      ))}
    </>
  );
};

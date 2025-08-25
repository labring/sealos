import React, { useState } from 'react';
import { Box, BoxProps, Grid, Flex } from '@chakra-ui/react';

export type TableColumnsType = {
  title: string;
  dataIndex?: string;
  key: string;
  render?: (item: any, rowNumber: number, activeId: number) => JSX.Element;
};

interface Props extends BoxProps {
  columns: TableColumnsType[];
  data: any[];
  itemClass?: string;
  openSelected?: boolean; // support select item // isOptional
  onRowClick?: (item: any) => void;
}

export const MyTable = ({
  columns,
  data,
  itemClass = '',
  openSelected = false,
  onRowClick,
  ...reset
}: Props) => {
  const [activeId, setActiveId] = useState(0);

  return (
    <Box border={'1px solid'} borderColor={'grayModern.200'} borderRadius={'md'} {...reset}>
      <Grid
        templateColumns={`repeat(${columns.length},1fr)`}
        overflowX={'auto'}
        fontSize={'md'}
        color={'grayModern.800'}
        fontWeight={'bold'}
        borderBottom={'1px solid'}
        borderColor={'grayModern.200'}
      >
        {columns.map((item, i) => (
          <Box
            px={3}
            py={3}
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
          _hover={{
            bg: '#FBFBFC'
          }}
          cursor={!item.isOptional && openSelected ? 'not-allowed' : 'pointer'}
          borderBottom={'1px solid'}
          borderBottomColor={index1 !== data.length - 1 ? 'grayModern.150' : 'transparent'}
          bg={activeId == index1 && openSelected ? 'grayModern.100' : ''}
          onClick={() => {
            if (item.isOptional || !openSelected) {
              setActiveId(index1);
              onRowClick && onRowClick(item);
            }
          }}
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
              color={!item.isOptional && openSelected ? 'grayModern.500' : 'grayModern.900'}
            >
              {col.render
                ? col.render(item, index1, activeId)
                : col.dataIndex
                ? `${item[col.dataIndex]}`
                : ''}
            </Flex>
          ))}
        </Grid>
      ))}
    </Box>
  );
};

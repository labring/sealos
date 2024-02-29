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
  itemClass?: string;
}

const Table = ({ columns, data, itemClass = '' }: Props) => {
  const { t } = useTranslation();
  return (
    <>
      <Grid
        templateColumns={`repeat(${columns.length},1fr)`}
        overflowX={'auto'}
        borderRadius={'8px'}
        mb={2}
      >
        {columns.map((item, i) => (
          <Box
            px={3}
            py={3}
            bg={'white'}
            key={item.key}
            color={'myGray.700'}
            whiteSpace={'nowrap'}
            _first={{
              pl: 7
            }}
          >
            {t(item.title)}
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
          borderTopRadius={index1 === 0 ? '8px' : '0px'}
          borderBottomRadius={index1 === data.length - 1 ? '8px' : '0px'}
        >
          {columns.map((col, index2) => (
            <Flex
              className={index2 === 0 ? itemClass : ''}
              data-id={item.id}
              key={col.key}
              alignItems={'center'}
              px={3}
              py={4}
              fontSize={'sm'}
              fontWeight={'bold'}
              color={'myGray.700'}
              borderBottom={'1px solid'}
              borderBottomColor={index1 !== data.length - 1 ? 'myGray.100' : 'transparent'}
            >
              {col.render ? col.render(item) : col.dataIndex ? `${item[col.dataIndex]}` : ''}
            </Flex>
          ))}
        </Grid>
      ))}
    </>
  );
};

export default React.memo(Table);

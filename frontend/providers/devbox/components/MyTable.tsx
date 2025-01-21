import { Box, BoxProps, Flex, Grid } from '@chakra-ui/react';

interface Props extends BoxProps {
  columns: {
    title: string;
    dataIndex?: string;
    key: string;
    render?: (item: any) => JSX.Element;
    minWidth?: string;
    width?: string;
  }[];
  data: any[];
  itemClass?: string;
  alternateRowColors?: boolean;
  needRadius?: boolean;
}

const MyTable = ({
  columns,
  data,
  itemClass = '',
  alternateRowColors = false,
  needRadius = false,
  gridTemplateColumns
}: Props) => {
  return (
    <>
      <Grid
        templateColumns={
          gridTemplateColumns
            ? gridTemplateColumns
            : columns.map((col) => col.width || '1fr').join(' ')
        }
        overflowX={'auto'}
        borderTopRadius={'md'}
        borderBottomRadius={needRadius ? 'md' : '0'}
        fontSize={'base'}
        color={'grayModern.600'}
        fontWeight={'bold'}
        backgroundColor={'grayModern.100'}
      >
        {columns.map((item) => (
          <Box
            px={3}
            py={3}
            key={item.key}
            whiteSpace={'nowrap'}
            _first={{ pl: 7 }}
            minWidth={item.minWidth || '100px'}
            overflow={'hidden'}
            textOverflow={'ellipsis'}
          >
            {item.title}
          </Box>
        ))}
      </Grid>
      {data.map((item: any, index1) => (
        <Grid
          templateColumns={
            gridTemplateColumns
              ? gridTemplateColumns
              : columns.map((col) => col.width || '1fr').join(' ')
          }
          overflowX={'auto'}
          key={index1}
          bg={alternateRowColors ? (index1 % 2 === 0 ? '#FBFBFC' : '#F4F4F7') : 'white'}
          _hover={{ bg: '#FBFBFC' }}
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
              minWidth={col.minWidth || '100px'}
            >
              {col.render ? col.render(item) : col.dataIndex ? `${item[col.dataIndex]}` : ''}
            </Flex>
          ))}
        </Grid>
      ))}
    </>
  );
};

export default MyTable;

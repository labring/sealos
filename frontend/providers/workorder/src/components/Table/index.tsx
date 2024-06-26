import { BoxProps, Flex, FlexProps } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';

interface Props extends BoxProps {
  columns: {
    title: string;
    dataIndex?: string;
    key: string;
    render?: (item: any) => JSX.Element;
    ItemStyle?: FlexProps;
  }[];
  data: any[];
}

const Table = ({ columns, data }: Props) => {
  const { t } = useTranslation();

  return (
    <>
      <Flex
        h="47px"
        bg={'white'}
        mb={'7px'}
        alignItems={'center'}
        borderRadius={'4px'}
        color={'#485058'}
        fontSize={'12px'}
        fontWeight={500}
      >
        {columns.map((col, i) => (
          <Flex
            alignItems={'center'}
            flex={1}
            key={col.key}
            whiteSpace={'nowrap'}
            {...col.ItemStyle}
          >
            {t(col.title)}
          </Flex>
        ))}
      </Flex>
      {data.map((item: any, index1) => (
        <Flex
          key={index1}
          height={'64px'}
          alignItems={'center'}
          bg={'white'}
          _hover={{
            bg: '#FBFBFC'
          }}
          fontSize={'12px'}
          color={'#24282C'}
          borderBottom={'1px solid'}
          borderBottomColor={index1 !== data.length - 1 ? '#EFF0F1' : 'transparent'}
          borderTopLeftRadius={index1 === 0 ? 'md' : ''}
          borderTopRightRadius={index1 === 0 ? 'md' : ''}
          borderBottomLeftRadius={index1 === data.length - 1 ? 'md' : ''}
          borderBottomEndRadius={index1 === data.length - 1 ? 'md' : ''}
        >
          {columns.map((col, index2) => (
            <Flex flex={1} key={col.key} alignItems={'center'} {...col.ItemStyle}>
              {col.render ? col.render(item) : col.dataIndex ? `${item[col.dataIndex]}` : ''}
            </Flex>
          ))}
        </Flex>
      ))}
    </>
  );
};

export default Table;

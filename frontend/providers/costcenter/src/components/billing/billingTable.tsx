import { TableHeaders } from '@/constants/billing';
import { BillingItem } from '@/types/billing';
import lineDown from '@/assert/lineDown.svg';
import lineUp from '@/assert/lineUp.svg';
import { Flex, Img, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';
import { format, parseISO } from 'date-fns';
import { formatMoney } from '@/utils/format';
import { useTranslation } from 'next-i18next';
export function BillingTable({ data }: { data: BillingItem[] }) {
  const { t } = useTranslation();

  return (
    <TableContainer w="100%" mt="0px">
      <Table variant="simple">
        <Thead>
          <Tr>
            {TableHeaders?.map((item) => (
              <Th
                key={item}
                bg={'#F1F4F6'}
                _before={{
                  content: `""`,
                  display: 'block',
                  borderTopLeftRadius: '10px',
                  borderTopRightRadius: '10px',
                  background: '#F1F4F6'
                }}
              >
                {t(item)}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {data?.map((item) => {
            return (
              <Tr key={item.order_id} fontSize={'12px'}>
                <Td>{item.order_id}</Td>
                <Td>{format(parseISO(item.time), 'MM-dd HH:mm')}</Td>
                <Td>
                  <Flex align={'center'} width={'full'} height={'full'}>
                    <Flex
                      px={'12px'}
                      py={'4px'}
                      minW={'max-content'}
                      bg={!item.type ? '#EBF7FD' : '#E6F6F6'}
                      borderRadius="24px"
                      color={!item.type ? '#0884DD' : '#00A9A6'}
                      align={'center'}
                      justify={'space-evenly'}
                    >
                      <Img
                        src={!item.type ? lineDown.src : lineUp.src}
                        w="13.14px"
                        mr={'6px'}
                      ></Img>
                      <Text>{!item.type ? t('Deduction') : t('Charge')}</Text>
                    </Flex>
                  </Flex>
                </Td>

                <Td>{!item.type ? '￥' + formatMoney(item.costs?.cpu || 0) : '-'}</Td>
                <Td>{!item.type ? '￥' + formatMoney(item.costs?.memory || 0) : '-'}</Td>
                <Td>{!item.type ? '￥' + formatMoney(item.costs?.storage || 0) : '-'}</Td>
                <Td>{'￥' + formatMoney(item.amount)}</Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </TableContainer>
  );
}

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
          {data
            ?.filter((item) => [0, 1, 2, 3].includes(item.type))
            .map((item) => {
              return (
                <Tr key={item.order_id} fontSize={'12px'}>
                  <Td>{item.order_id}</Td>
                  <Td>{format(parseISO(item.time), 'MM-dd HH:mm')}</Td>
                  <Td>
                    {
                      // 0:扣费 1:充值 2:收款 3:转账
                    }
                    <Flex align={'center'} width={'full'} height={'full'}>
                      <Flex
                        px={'12px'}
                        py={'4px'}
                        minW={'max-content'}
                        {...([1, 2].includes(item.type)
                          ? {
                              bg: '#E6F6F6',
                              color: '#00A9A6'
                            }
                          : {
                              bg: '#EBF7FD',
                              color: '#0884DD'
                            })}
                        borderRadius="24px"
                        align={'center'}
                        justify={'space-evenly'}
                      >
                        <Img
                          src={[0, 3].includes(item.type) ? lineDown.src : lineUp.src}
                          w="13.14px"
                          mr={'6px'}
                        ></Img>
                        <Text>
                          {item.type === 0
                            ? t('Deduction')
                            : item.type === 1
                            ? t('Charge')
                            : item.type === 2
                            ? t('Recipient')
                            : t('Transfer')}
                        </Text>
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

import { BasicTableHeaders, CATEGORY, TableHeaders } from '@/constants/billing';
import { BillingItem, BillingType } from '@/types/billing';
import lineDown from '@/assert/lineDown.svg';
import lineUp from '@/assert/lineUp.svg';
import { Flex, Img, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';
import { format, parseISO } from 'date-fns';
import { formatMoney } from '@/utils/format';
import { useTranslation } from 'next-i18next';
import useEnvStore from '@/stores/env';
import CurrencySymbol from '../CurrencySymbol';
const Amount = ({
  type,
  amount,
  total
}: {
  type: BillingType;
  amount: number | undefined | null;
  total?: boolean;
}) => {
  if (amount === undefined || amount === null) return <span>-</span>;
  if (amount === 0) return <span>0</span>;
  if ([BillingType.CONSUME, BillingType.TRANSFER].includes(type))
    return <Text color={total ? '#0884DD' : ''}>-{formatMoney(amount)}</Text>;
  else if ([BillingType.RECHARGE, BillingType.RECEIVE].includes(type))
    return <Text color={total ? '#00A9A6' : ''}>+{formatMoney(amount)}</Text>;
  else return <span>-</span>;
};
export function CommonBillingTable({ data }: { data: BillingItem[] }) {
  const { t } = useTranslation();
  const gpuEnabled = useEnvStore((state) => state.gpuEnabled);
  const currency = useEnvStore((s) => s.currency);
  return (
    <TableContainer w="100%" mt="0px">
      <Table variant="simple">
        <Thead>
          <Tr>
            {[
              ...BasicTableHeaders,
              ...TableHeaders,
              ...(gpuEnabled ? ['Gpu'] : []),
              'Total Amount',
              'Namespace'
            ].map((item) => (
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
                <Flex display={'flex'} alignItems={'center'}>
                  <Text mr="4px">{t(item)}</Text>
                  {['CPU', 'Gpu', 'Memory', 'Storage', 'Network', 'Total Amount'].includes(
                    item
                  ) && <CurrencySymbol type={currency} />}
                </Flex>
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {data
            ?.filter((item) => [BillingType.CONSUME, BillingType.RECHARGE].includes(item.type))
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
                        {...(item.type === BillingType.RECHARGE
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
                          src={item.type === BillingType.CONSUME ? lineDown.src : lineUp.src}
                          w="13.14px"
                          mr={'6px'}
                        ></Img>
                        <Text>
                          {item.type === BillingType.CONSUME ? t('Deduction') : t('Charge')}
                        </Text>
                      </Flex>
                    </Flex>
                  </Td>
                  <Td>
                    <Amount type={item.type} amount={item?.costs?.cpu} />
                  </Td>
                  <Td>
                    <Amount type={item.type} amount={item?.costs?.memory} />
                  </Td>
                  <Td>
                    <Amount type={item.type} amount={item?.costs?.storage} />
                  </Td>
                  <Td>
                    <Amount type={item.type} amount={item?.costs?.network} />
                  </Td>
                  {gpuEnabled && (
                    <Td>
                      <Amount type={item.type} amount={item?.costs?.gpu} />
                    </Td>
                  )}
                  <Td>
                    <Amount type={item.type} amount={item.amount} total={true} />
                  </Td>
                  <Td>{<span>{item.namespace}</span>}</Td>
                </Tr>
              );
            })}
        </Tbody>
      </Table>
    </TableContainer>
  );
}
export function TransferBillingTable({ data }: { data: BillingItem[] }) {
  const { t } = useTranslation();
  const currency = useEnvStore((s) => s.currency);
  return (
    <TableContainer w="100%" mt="0px">
      <Table variant="simple">
        <Thead>
          <Tr>
            {[...BasicTableHeaders, 'Total Amount', 'Namespace'].map((item) => (
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
                <Flex display={'flex'} alignItems={'center'}>
                  <Text mr="4px">{t(item)}</Text>
                  {['Total Amount'].includes(item) && <CurrencySymbol type={currency} />}
                </Flex>
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {data
            ?.filter((item) => [BillingType.RECEIVE, BillingType.TRANSFER].includes(item.type))
            .map((item) => {
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
                        {...(item.type === BillingType.RECEIVE
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
                          src={item.type === BillingType.TRANSFER ? lineDown.src : lineUp.src}
                          w="13.14px"
                          mr={'6px'}
                        ></Img>
                        <Text>
                          {item.type === BillingType.RECEIVE ? t('Recipient') : t('Transfer')}
                        </Text>
                      </Flex>
                    </Flex>
                  </Td>
                  <Td>
                    <Amount type={item.type} amount={item.amount} total={true} />
                  </Td>
                  <Td>{<span>{item.namespace}</span>}</Td>
                </Tr>
              );
            })}
        </Tbody>
      </Table>
    </TableContainer>
  );
}

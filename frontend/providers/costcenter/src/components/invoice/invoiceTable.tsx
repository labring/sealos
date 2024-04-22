import { InvoiceTableHeaders } from '@/constants/billing';
import { Checkbox, Flex, Table, TableContainer, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react';
import { format } from 'date-fns';
import { useTranslation } from 'next-i18next';
import { RechargeBillingItem, ReqGenInvoice } from '@/types';
import CurrencySymbol from '../CurrencySymbol';
import useEnvStore from '@/stores/env';
import { formatMoney } from '@/utils/format';

export function InvoiceTable({
  data,
  selectbillings,
  onSelect
}: {
  data: ReqGenInvoice['billings'];
  selectbillings: ReqGenInvoice['billings'];
  onSelect?: (type: boolean, item: RechargeBillingItem) => void;
}) {
  const { t } = useTranslation();
  const needSelect = !!onSelect;
  const currency = useEnvStore((s) => s.currency);
  return (
    <TableContainer w="100%" mt="0px" border={'1px solid #DEE0E2'} borderRadius="2px">
      <Table variant="simple">
        <Thead>
          <Tr>
            {InvoiceTableHeaders?.map((item) => (
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
                <Flex display={'flex'}>
                  {t(item)}
                  {item === 'True Amount' && (
                    <>
                      (<CurrencySymbol type={currency} />)
                    </>
                  )}
                </Flex>
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {data.map((item) => (
            <Tr key={item.ID} fontSize={'12px'}>
              <Td>
                <Flex align={'center'}>
                  {needSelect && (
                    <Checkbox
                      isChecked={selectbillings.map((b) => b.ID).includes(item.ID)}
                      onChange={(v) => {
                        onSelect(v.target.checked, item);
                      }}
                      mr="13px"
                      w="12px"
                      h="12px"
                    />
                  )}
                  {item.ID}
                </Flex>
              </Td>
              <Td>{format(new Date(item.CreatedAt), 'MM-dd HH:mm')}</Td>
              <Td color={'#219BF4'}>{item.Amount}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
}

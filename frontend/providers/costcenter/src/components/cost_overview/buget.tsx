import { Flex, Text, Heading, Img } from '@chakra-ui/react';
import { Card, CardBody } from '@chakra-ui/react';
import down_icon from '@/assert/ic_round-trending-down.svg';
import up_icon from '@/assert/ic_round-trending-up.svg';
import { useMemo } from 'react';
import { formatMoney } from '@/utils/format';
import { useTranslation } from 'next-i18next';
import useBillingData from '@/hooks/useBillingData';
import CurrencySymbol from '../CurrencySymbol';
import useEnvStore from '@/stores/env';
export function Buget() {
  const { t } = useTranslation();
  const { data } = useBillingData();
  const currency = useEnvStore((s) => s.currency);
  const [_out, _in] = useMemo(
    () =>
      (data?.data?.status.item || []).reduce<[number, number]>(
        (pre, cur) => {
          if (cur.type === 0) {
            pre[0] += cur.amount;
          } else if (cur.type === 1) {
            pre[1] += cur.amount;
          }
          return pre;
        },
        [0, 0]
      ),
    [data]
  );
  const list = [
    { title: 'Deduction', src: down_icon.src, value: formatMoney(_out) },
    { title: 'Charge', src: up_icon.src, value: formatMoney(_in) }
  ];
  return (
    <Flex direction={'column'} mb={'34px'}>
      <Flex alignItems={'center'} justify="space-between">
        <Heading size="sm">{t('Income And Expense')}</Heading>
      </Flex>
      <Flex mt="20px" justify={'space-evenly'} gap="6">
        {list.map((v) => (
          <Card variant="filled" bg={['#f1f4f6', '#f1f4f6', '#f1f4f6', 'white']} key={v.title}>
            <CardBody alignItems={'center'} flexDirection="column" justifyContent={'center'}>
              <Flex
                bg={'#24282C'}
                w="31.75px"
                h="28.7px"
                justify={'center'}
                align="center"
                borderRadius={'2px'}
              >
                <Img src={v.src}></Img>
              </Flex>
              <Text fontSize={'12px'} mt={'6px'}>
                {t(v.title)}
              </Text>
              <Flex mt="8px">
                <CurrencySymbol w="16px" type={currency} />
                <Text fontWeight="500" fontSize="16px" ml="4px">
                  {v.value}
                </Text>
              </Flex>
            </CardBody>
          </Card>
        ))}
      </Flex>
    </Flex>
  );
}

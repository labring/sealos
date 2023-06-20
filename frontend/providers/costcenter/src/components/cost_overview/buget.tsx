import { Flex, Text, Heading, Img } from '@chakra-ui/react';
import { Card, CardBody } from '@chakra-ui/react';
import down_icon from '@/assert/ic_round-trending-down.svg';
import up_icon from '@/assert/ic_round-trending-up.svg';
import { useMemo } from 'react';
import useOverviewStore from '@/stores/overview';
import { addDays, differenceInDays, formatISO, getTime, parseISO, subSeconds } from 'date-fns';
import { formatMoney } from '@/utils/format';
import request from '@/service/request';
import { BillingSpec, BillingData } from '@/types/billing';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';

export function Buget() {
  const { t } = useTranslation();
  const startTime = useOverviewStore((state) => state.startTime);
  const endTime = useOverviewStore((state) => state.endTime);
  const { data } = useQuery(['billing', { startTime, endTime }], () => {
    const start = startTime;
    const end = subSeconds(addDays(endTime, 1), 1);
    const delta = differenceInDays(end, start);
    const spec: BillingSpec = {
      startTime: formatISO(start, { representation: 'complete' }),
      // pre,
      endTime: formatISO(end, { representation: 'complete' }),
      // start,
      page: 1,
      pageSize: (delta + 1) * 48,
      type: -1,
      orderID: ''
    };
    return request<any, { data: BillingData }, { spec: BillingSpec }>('/api/billing', {
      method: 'POST',
      data: {
        spec
      }
    });
  });
  const [_out, _in] = useMemo(
    () =>
      (data?.data.status.item || []).reduce<[number, number]>(
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
    { title: 'Deduction', src: down_icon.src, value: '￥' + formatMoney(_out) },
    { title: 'Charge', src: up_icon.src, value: '￥' + formatMoney(_in) }
  ];
  return (
    <Flex direction={'column'} mb={'34px'}>
      <Flex alignItems={'center'} justify="space-between">
        <Heading size="sm">{t('Income And Expense')}</Heading>
        {/* <SelectMonth ></SelectMonth> */}
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
              <Text fontWeight="500" fontSize="16px" mt={'8px'}>
                {v.value}
              </Text>
            </CardBody>
          </Card>
        ))}
      </Flex>
    </Flex>
  );
}

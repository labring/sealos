import { Flex, Text, Heading, Img, VStack, HStack } from '@chakra-ui/react';
import { Card, CardBody } from '@chakra-ui/react';
import down_icon from '@/assert/ic_round-trending-down.svg';
import up_icon from '@/assert/ic_round-trending-up.svg';
import { useMemo } from 'react';
import { displayMoney, formatMoney } from '@/utils/format';
import { useTranslation } from 'next-i18next';
import CurrencySymbol from '../CurrencySymbol';
import useEnvStore from '@/stores/env';
import useBillingData from '@/hooks/useBillingData';
import request from '@/service/request';
import { useQuery } from '@tanstack/react-query';
import useOverviewStore from '@/stores/overview';
// const getBuget = ()=>request.post('api/billing/buget',)
export function Buget() {
  const { t } = useTranslation();
  const startTime = useOverviewStore((state) => state.startTime);
  const endTime = useOverviewStore((state) => state.endTime);
  const { data, isSuccess } = useQuery({
    queryKey: ['billing', 'buget', { startTime, endTime }],
    queryFn: () => {
      return request.post<{ amount: number }[]>('/api/billing/buget', {
        startTime,
        endTime
      });
    }
  });
  const currency = useEnvStore((s) => s.currency);
  const list = [
    {
      title: 'Deduction',
      src: down_icon.src,
      value: formatMoney(isSuccess ? data?.data[0].amount || 0 : 0)
    },
    {
      title: 'Charge',
      src: up_icon.src,
      value: formatMoney(isSuccess ? data?.data[1].amount || 0 : 0)
    }
  ];
  return (
    <Flex direction={'column'} mb={'34px'}>
      <Flex alignItems={'center'} justify="space-between">
        <Text color={'#747F88'} mb={'5px'}>
          {t('Income And Expense')}
        </Text>
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
              <HStack mt="8px" gap={'6px'}>
                <CurrencySymbol boxSize="16px" type={currency} />
                <Text fontWeight="500" fontSize="16px" ml="4px">
                  {displayMoney(v.value)}
                </Text>
              </HStack>
            </CardBody>
          </Card>
        ))}
      </Flex>
    </Flex>
  );
}

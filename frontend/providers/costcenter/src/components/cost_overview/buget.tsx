import down_icon from '@/assert/ic_round-trending-down.svg';
import up_icon from '@/assert/ic_round-trending-up.svg';
import request from '@/service/request';
import useEnvStore from '@/stores/env';
import useOverviewStore from '@/stores/overview';
import { displayMoney, formatMoney } from '@/utils/format';
import { Card, CardBody, Flex, HStack, Img, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import CurrencySymbol from '../CurrencySymbol';
// const getBuget = ()=>request.post('api/billing/buget',)
export function Buget({ expenditureAmount }: { expenditureAmount: number }) {
  const { t } = useTranslation();
  const { endTime } = useOverviewStore();
  const rechargeQueryBody = {
    endTime
  };
  const { data: rechargeData, isSuccess: rechargeIsSuccess } = useQuery({
    queryKey: ['recharge', rechargeQueryBody],
    queryFn: () => {
      return request.post<{ amount: number }>('/api/billing/recharge', rechargeQueryBody);
    }
  });
  const currency = useEnvStore((s) => s.currency);
  const list = [
    {
      title: 'Expenditure',
      src: up_icon.src,
      value: formatMoney(expenditureAmount || 0)
    },
    {
      title: 'Charge',
      src: down_icon.src,
      value: formatMoney(rechargeData?.data.amount || 0)
    }
  ];
  return (
    <Flex direction={'column'} mb={'34px'}>
      <Flex alignItems={'center'} justify="space-between">
        <Text
          color={'grayModern.600'}
          mb="5px"
          fontFamily="PingFang SC"
          fontSize="14px"
          fontStyle="normal"
          fontWeight={500}
          lineHeight="20px"
          letterSpacing="0.1px"
        >
          {t('Income And Expense')}
        </Text>
      </Flex>
      <Flex mt="16px" justify={'space-evenly'} gap="16px">
        {list.map((v) => (
          <Card
            variant="filled"
            key={v.title}
            height={'150px'}
            flex={1}
            borderRadius={'8px'}
            bgColor={'white'}
            padding={'33px'}
          >
            <CardBody
              alignItems={'center'}
              flexDirection="column"
              justifyContent={'center'}
              color={'grayModern.900'}
            >
              <Flex
                bg={'#24282C'}
                w="32px"
                h="28px"
                justify={'center'}
                align="center"
                borderRadius={'4px'}
              >
                <Img src={v.src}></Img>
              </Flex>
              <Text fontSize={'12px'} mt={'8px'} fontWeight={'500'}>
                {t(v.title)}
              </Text>
              <HStack mt="12px" gap={'6px'}>
                <CurrencySymbol boxSize="16px" type={currency} />
                <Text fontWeight="700" fontSize="16px" ml="4px">
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

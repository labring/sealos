import request from '@/services/request';
import useAppStore from '@/stores/app';
import { useConfigStore } from '@/stores/config';
import useSessionStore from '@/stores/session';
import { ApiResp } from '@/types';
import { formatMoney } from '@/utils/format';
import { Box, Center, Flex, Text } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';
import { blurBackgroundStyles } from '../desktop_content';
import { getUserBilling } from '@/api/platform';
import { ClockIcon, DesktopSealosCoinIcon } from '../icons';

export default function Cost() {
  const { t } = useTranslation();
  const rechargeEnabled = useConfigStore().commonConfig?.rechargeEnabled;
  const openApp = useAppStore((s) => s.openApp);
  const installApp = useAppStore((s) => s.installedApps);
  const { delSession, session, setToken } = useSessionStore();
  const user = session?.user;

  const { data } = useQuery({
    queryKey: ['getAmount', { userId: user?.userCrUid }],
    queryFn: () =>
      request<any, ApiResp<{ balance: number; deductionBalance: number }>>(
        '/api/account/getAmount'
      ),
    enabled: !!user
  });

  const { data: billing, isSuccess } = useQuery(['getUserBilling'], () => getUserBilling(), {
    cacheTime: 5 * 60 * 1000
  });

  const balance = useMemo(() => {
    let real_balance = data?.data?.balance || 0;
    if (data?.data?.deductionBalance) {
      real_balance -= data?.data.deductionBalance;
    }
    return real_balance;
  }, [data]);

  const calculations = useMemo(() => {
    const prevDayAmount = billing?.data?.prevDayAmountTime || 0;
    const estimatedNextMonthAmount = prevDayAmount * 30 || 0;
    const estimatedDaysUsable = prevDayAmount > 0 ? Math.ceil(balance / prevDayAmount) : '♾️';
    return {
      prevMonthAmount: billing?.data?.prevMonthAmountTime || 0,
      estimatedNextMonthAmount,
      estimatedDaysUsable
    };
  }, [billing?.data?.prevDayAmountTime, billing?.data?.prevMonthAmountTime, , balance]);

  console.log(billing, calculations, 'hourBilling');

  return (
    <Flex
      fontSize={'base'}
      fontWeight={'bold'}
      {...blurBackgroundStyles}
      flex={'1 1 40%'}
      px={'16px'}
      pt={'20px'}
      flexDirection={'column'}
    >
      <Flex
        borderRadius={'6px'}
        p="16px"
        bg={'rgba(255, 255, 255, 0.05)'}
        justifyContent={'space-between'}
      >
        <Box flex={1}>
          <Text color={'rgba(255, 255, 255, 0.90)'} fontSize={'11px'}>
            {t('Balance')}
          </Text>
          <Flex alignItems={'center'} gap={'8px'}>
            <Text fontSize={'20px'} color={'#7CE7FF'}>
              {formatMoney(balance).toFixed(2)}
            </Text>
            <DesktopSealosCoinIcon />
          </Flex>
        </Box>
        {rechargeEnabled && (
          <Center
            ml="auto"
            onClick={() => {
              const costcenter = installApp.find((t) => t.key === 'system-costcenter');
              if (!costcenter) return;
              openApp(costcenter, {
                query: {
                  openRecharge: 'true'
                }
              });
            }}
            color={'rgba(255, 255, 255, 0.90)'}
            cursor={'pointer'}
          >
            {t('Charge')}
          </Center>
        )}
      </Flex>

      {calculations && (
        <Flex flexDirection={'column'}>
          <Flex
            alignItems={'center'}
            px={'16px'}
            py={'18px'}
            borderBottom={'1px solid rgba(255, 255, 255, 0.05)'}
          >
            <ClockIcon mr={'4px'} />
            <Text fontSize={'12px'} fontWeight={'bold'} color={'rgba(255, 255, 255, 0.90)'}>
              {t('Expected used')}
            </Text>
            <Text mr={'4px'} ml={'auto'} color={'white'} fontSize={'14px'} fontWeight={700}>
              {calculations.estimatedDaysUsable} {t('Day')}
            </Text>
          </Flex>
          <Flex
            alignItems={'center'}
            px={'16px'}
            py={'18px'}
            borderBottom={'1px solid rgba(255, 255, 255, 0.05)'}
          >
            <ClockIcon mr={'4px'} />
            <Text fontSize={'12px'} fontWeight={'bold'} color={'rgba(255, 255, 255, 0.90)'}>
              {t('Used last month')}
            </Text>
            <Text mr={'4px'} ml={'auto'} color={'white'} fontSize={'14px'} fontWeight={700}>
              {calculations.prevMonthAmount}
            </Text>
            <DesktopSealosCoinIcon />
          </Flex>
          <Flex alignItems={'center'} px={'16px'} py={'18px'}>
            <ClockIcon mr={'4px'} />
            <Text fontSize={'12px'} fontWeight={'bold'} color={'rgba(255, 255, 255, 0.90)'}>
              {t('Expected to use next month')}
            </Text>
            <Text mr={'4px'} ml={'auto'} color={'white'} fontSize={'14px'} fontWeight={700}>
              {calculations.estimatedNextMonthAmount}
            </Text>
            <DesktopSealosCoinIcon />
          </Flex>
        </Flex>
      )}
    </Flex>
  );
}

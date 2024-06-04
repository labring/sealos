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
import { SealosCoin } from '@sealos/ui';

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

  const balance = useMemo(() => {
    let real_balance = data?.data?.balance || 0;
    if (data?.data?.deductionBalance) {
      real_balance -= data?.data.deductionBalance;
    }
    return real_balance;
  }, [data]);

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
            <SealosCoin />
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
    </Flex>
  );
}

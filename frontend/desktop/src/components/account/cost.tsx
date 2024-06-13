import { getUserBilling } from '@/api/platform';
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
import { ClockIcon, DesktopSealosCoinIcon, InfiniteIcon } from '../icons';
import { Decimal } from 'decimal.js';

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
    let realBalance = new Decimal(data?.data?.balance || 0);
    if (data?.data?.deductionBalance) {
      realBalance = realBalance.minus(new Decimal(data.data.deductionBalance));
    }
    return realBalance.toNumber();
  }, [data]);

  const calculations = useMemo(() => {
    const prevDayAmount = new Decimal(billing?.data?.prevDayTime || 0);
    const estimatedNextMonthAmount = prevDayAmount.times(30).toNumber();
    const _balance = new Decimal(balance || 0);

    const estimatedDaysUsable = prevDayAmount.greaterThan(0)
      ? _balance.div(prevDayAmount).ceil().toNumber()
      : Number.POSITIVE_INFINITY;

    return {
      prevMonthAmount: new Decimal(billing?.data?.prevMonthTime || 0).toNumber(),
      estimatedNextMonthAmount,
      estimatedDaysUsable
    };
  }, [billing?.data?.prevDayTime, billing?.data?.prevMonthTime, , balance]);

  return (
    <Box position={'relative'} flex={'0 1 400px'}>
      <Flex
        position={'relative'}
        zIndex={2}
        fontSize={'base'}
        fontWeight={'bold'}
        px={'16px'}
        pt={'20px'}
        flexDirection={'column'}
      >
        {/* <Icon
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{ mixBlendMode: 'hard-light' }}
        >
          <g style={{ mixBlendMode: 'hard-light' }}>
            <circle cx="6" cy="6" r="5.762" fill="#E8E8E8" stroke="#37383A" stroke-width="0.476" />
            <circle cx="5.99977" cy="6.00001" r="5.24196" fill="#CFCFCF" />
            <path
              d="M5.99999 11.2419C8.89504 11.2419 11.2419 8.89504 11.2419 5.99998C11.2419 4.81165 10.8465 3.71568 10.1801 2.83645C9.84464 2.78912 9.50185 2.76465 9.15335 2.76465C5.39058 2.76465 2.29423 5.61794 1.90991 9.27892C2.87063 10.4758 4.34583 11.2419 5.99999 11.2419Z"
              fill="#BEBEBE"
            />
            <circle cx="6.00011" cy="5.99998" r="4.06529" fill="#828386" />
            <path
              d="M4.32497 5.81633C4.66221 6.30941 5.35996 6.26564 5.35996 6.26564C5.18552 6.09642 5.07214 5.94179 5.06051 5.50122C5.04888 5.06066 4.79885 4.94396 4.79885 4.94396C5.24657 4.66095 5.08667 4.35459 5.07214 4.01323C5.06342 3.80024 5.18843 3.64269 5.28727 3.55225C4.71834 3.63777 4.20426 3.94037 3.8522 4.39697C3.50014 4.85356 3.33727 5.42891 3.39755 6.00306C3.43825 5.88927 4.01389 5.36118 4.32497 5.81633Z"
              fill="#E8E8E8"
            />
            <path
              d="M8.45623 4.93814C8.44119 4.89019 8.42273 4.84339 8.401 4.7981V4.79518C8.29953 4.58802 8.1313 4.42133 7.9236 4.32216C7.71589 4.22299 7.48089 4.19715 7.25672 4.24883C7.03254 4.30052 6.83234 4.42669 6.68858 4.60689C6.54483 4.78709 6.46596 5.01074 6.46476 5.24158C6.46477 5.31417 6.47257 5.38656 6.48801 5.45748C6.48808 5.45845 6.48808 5.45943 6.48801 5.4604C6.49383 5.48958 6.50255 5.51875 6.51127 5.54793C6.56316 5.75346 6.57326 5.96737 6.54096 6.17691C6.50866 6.38644 6.43463 6.5873 6.32328 6.76748C6.21194 6.94767 6.06556 7.1035 5.89288 7.22567C5.72021 7.34784 5.52478 7.43385 5.31826 7.47855C5.11173 7.52326 4.89835 7.52575 4.69085 7.48588C4.48335 7.44601 4.28597 7.36459 4.11051 7.24649C3.93505 7.12839 3.7851 6.97602 3.6696 6.79848C3.55411 6.62094 3.47544 6.42187 3.43829 6.21315C3.49082 6.57495 3.61848 6.92165 3.813 7.2308C4.00751 7.53996 4.26455 7.80467 4.56748 8.0078C4.8704 8.21094 5.21246 8.34797 5.5715 8.41002C5.93054 8.47207 6.29856 8.45777 6.65174 8.36803C7.00493 8.27829 7.33539 8.11511 7.62175 7.88907C7.90811 7.66303 8.14397 7.37916 8.31408 7.05583C8.48418 6.73251 8.58473 6.37693 8.60922 6.01213C8.63371 5.64734 8.58159 5.28144 8.45623 4.93814Z"
              fill="#E8E8E8"
            />
            <path
              d="M8.02299 5.64126C8.02299 6.91262 6.99601 7.94327 5.72916 7.94327C5.05677 7.94327 4.45196 7.65294 4.0324 7.19037C4.05781 7.20984 4.0839 7.22857 4.11051 7.24649C4.28597 7.36459 4.48335 7.44601 4.69085 7.48588C4.89835 7.52575 5.11173 7.52326 5.31826 7.47855C5.52478 7.43385 5.72021 7.34784 5.89288 7.22567C6.06556 7.1035 6.21194 6.94767 6.32328 6.76748C6.43463 6.5873 6.50866 6.38644 6.54096 6.17691C6.57326 5.96737 6.56316 5.75346 6.51127 5.54793C6.50255 5.51875 6.49383 5.48958 6.48801 5.4604C6.48808 5.45943 6.48808 5.45845 6.48801 5.45748C6.47257 5.38656 6.46477 5.31417 6.46476 5.24158C6.46596 5.01074 6.54483 4.78709 6.68858 4.60689C6.83234 4.42669 7.03254 4.30052 7.25672 4.24883C7.3492 4.22751 7.44346 4.21935 7.53695 4.22412C7.84148 4.61483 8.02299 5.10677 8.02299 5.64126Z"
              fill="#E8E8E8"
            />
            <path
              d="M8.12515 2.09558L8.36455 2.52528L8.79425 2.76468L8.36455 3.00408L8.12515 3.43378L7.88575 3.00408L7.45605 2.76468L7.88575 2.52528L8.12515 2.09558Z"
              fill="#F0F0F0"
            />
          </g>
        </Icon> */}
        <Flex
          borderRadius={'6px'}
          p="16px"
          bg={'rgba(255, 255, 255, 0.05)'}
          justifyContent={'space-between'}
          _hover={{
            background: 'rgba(255, 255, 255, 0.10)'
          }}
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
                {calculations.estimatedDaysUsable === Number.POSITIVE_INFINITY ? (
                  <>
                    <InfiniteIcon /> {t('Day')}
                  </>
                ) : (
                  <>
                    {calculations.estimatedDaysUsable} {t('Day')}
                  </>
                )}
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
                {formatMoney(calculations.prevMonthAmount).toFixed(2)}
              </Text>
              <DesktopSealosCoinIcon />
            </Flex>
            <Flex alignItems={'center'} px={'16px'} py={'18px'}>
              <ClockIcon mr={'4px'} />
              <Text fontSize={'12px'} fontWeight={'bold'} color={'rgba(255, 255, 255, 0.90)'}>
                {t('Expected to use next month')}
              </Text>
              <Text mr={'4px'} ml={'auto'} color={'white'} fontSize={'14px'} fontWeight={700}>
                {formatMoney(calculations.estimatedNextMonthAmount).toFixed(2)}
              </Text>
              <DesktopSealosCoinIcon />
            </Flex>
          </Flex>
        )}
      </Flex>

      <Box
        id="blur-background"
        zIndex={0}
        position={'absolute'}
        top={0}
        left={0}
        w={'full'}
        h={'full'}
        overflow={'hidden'}
        {...blurBackgroundStyles}
      ></Box>
    </Box>
  );
}

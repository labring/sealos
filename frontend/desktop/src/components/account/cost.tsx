import { getAmount } from '@/api/auth';
import { getUserBilling } from '@/api/platform';
import useAppStore from '@/stores/app';
import { useConfigStore } from '@/stores/config';
import useSessionStore from '@/stores/session';
import { formatMoney } from '@/utils/format';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Center,
  Flex,
  Text,
  useBreakpointValue
} from '@chakra-ui/react';
import { CurrencySymbol, MonitorIcon } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import { Decimal } from 'decimal.js';
import { useTranslation } from 'next-i18next';
import { useMemo } from 'react';
import CustomTooltip from '../AppDock/CustomTooltip';
import { blurBackgroundStyles } from '../desktop_content';
import Monitor from '../desktop_content/monitor';
import { ClockIcon, HelpIcon, InfiniteIcon } from '../icons';
import { BalancePopover } from './BalancePopover';

/**
 * @deprecated This component is deprecated. Use Cost Center to monitor balance instead.
 */
export default function Cost() {
  const { t } = useTranslation();
  const rechargeEnabled = useConfigStore().commonConfig?.rechargeEnabled;
  const openApp = useAppStore((s) => s.openApp);
  const installApp = useAppStore((s) => s.installedApps);
  const { session } = useSessionStore();
  const user = session?.user;
  const isLargerThanXl = useBreakpointValue({ base: true, xl: false });
  const currencySymbol = useConfigStore(
    (state) => state.layoutConfig?.currencySymbol || 'shellCoin'
  );

  const { data } = useQuery({
    queryKey: ['getAmount', { userId: user?.userCrUid }],
    queryFn: getAmount,
    enabled: !!user,
    staleTime: 60 * 1000
  });

  const { data: billing } = useQuery(['getUserBilling'], () => getUserBilling(), {
    cacheTime: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
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

    let estimatedDaysUsable;
    if (_balance.isNegative()) {
      estimatedDaysUsable = 0;
    } else if (prevDayAmount.isZero()) {
      estimatedDaysUsable = Number.POSITIVE_INFINITY;
    } else {
      estimatedDaysUsable = _balance.div(prevDayAmount).ceil().toNumber();
    }

    return {
      prevMonthAmount: new Decimal(billing?.data?.prevMonthTime || 0).toNumber(),
      estimatedNextMonthAmount,
      estimatedDaysUsable
    };
  }, [billing?.data?.prevDayTime, billing?.data?.prevMonthTime, , balance]);

  return (
    <Box
      position={'relative'}
      flex={'0 1 400px'}
      overflowY={'auto'}
      style={{
        scrollbarWidth: 'none'
      }}
    >
      <Flex
        {...blurBackgroundStyles}
        position={'relative'}
        zIndex={2}
        fontSize={'base'}
        fontWeight={'bold'}
        px={'16px'}
        pt={'20px'}
        flexDirection={'column'}
      >
        <BalancePopover
          openCostCenterApp={() => {
            const costcenter = installApp.find((t) => t.key === 'system-costcenter');
            if (!costcenter) return;
            openApp(costcenter);
          }}
        >
          <Flex
            borderRadius={'6px'}
            p="16px"
            bg={'rgba(255, 255, 255, 0.05)'}
            justifyContent={'space-between'}
            _hover={{
              background: 'rgba(255, 255, 255, 0.10)'
            }}
            cursor="pointer"
          >
            <Box flex={1}>
              <Text color={'rgba(255, 255, 255, 0.90)'} fontSize={'11px'}>
                {t('common:balance')}
              </Text>
              <Flex alignItems={'center'} gap={'8px'}>
                <Text fontSize={'20px'} color={'#7CE7FF'}>
                  {formatMoney(balance).toFixed(2)}
                </Text>
                <CurrencySymbol type={currencySymbol} color={'white'} fontSize={'16px'} />
              </Flex>
            </Box>
            {rechargeEnabled && (
              <Center
                ml="auto"
                onClick={(e) => {
                  e.stopPropagation();
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
                {t('common:charge')}
              </Center>
            )}
          </Flex>
        </BalancePopover>
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
                {t('common:expected_used')}
              </Text>
              <Text mr={'4px'} ml={'auto'} color={'white'} fontSize={'14px'} fontWeight={700}>
                {calculations.estimatedDaysUsable === Number.POSITIVE_INFINITY ? (
                  <>
                    <InfiniteIcon /> {t('common:day')}
                  </>
                ) : (
                  <>
                    {calculations.estimatedDaysUsable} {t('common:day')}
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
              <Center
                mr={'4px'}
                w={'7px'}
                height={'7px'}
                bg={'#4DB4FF'}
                borderRadius={'2px'}
              ></Center>
              <Text fontSize={'12px'} fontWeight={'bold'} color={'rgba(255, 255, 255, 0.90)'}>
                {t('common:used_last_month')}
              </Text>
              <Text mr={'4px'} ml={'auto'} color={'white'} fontSize={'14px'} fontWeight={700}>
                {formatMoney(calculations.prevMonthAmount).toFixed(2)}
              </Text>
              <CurrencySymbol type={currencySymbol} color={'white'} fontSize={'14px'} />
            </Flex>
            <Flex alignItems={'center'} px={'16px'} py={'18px'}>
              <Center
                mr={'4px'}
                w={'7px'}
                height={'7px'}
                bg={'#C74FFF'}
                borderRadius={'2px'}
              ></Center>
              <Flex alignItems={'center'} gap={'4px'} position={'relative'}>
                <Text fontSize={'12px'} fontWeight={'bold'} color={'rgba(255, 255, 255, 0.90)'}>
                  {t('common:expected_to_use_next_month')}
                </Text>
                <CustomTooltip placement="bottom" label={t('common:amount_forecast')}>
                  <Box cursor={'pointer'}>
                    <HelpIcon />
                  </Box>
                </CustomTooltip>
              </Flex>
              <Text mr={'4px'} ml={'auto'} color={'white'} fontSize={'14px'} fontWeight={700}>
                {formatMoney(calculations.estimatedNextMonthAmount).toFixed(2)}
              </Text>
              <CurrencySymbol type={currencySymbol} color={'white'} fontSize={'14px'} />
            </Flex>
          </Flex>
        )}
      </Flex>

      {isLargerThanXl && (
        <Accordion allowMultiple mt={'8px'}>
          <AccordionItem py={'19px'} {...blurBackgroundStyles}>
            <AccordionButton
              gap={'6px'}
              _hover={{
                bg: ''
              }}
            >
              <MonitorIcon />
              <Text color={'rgba(255, 255, 255, 0.90)'} fontWeight={'bold'} fontSize={'14px'}>
                {t('common:monitor')}
              </Text>
              <AccordionIcon ml={'auto'} color={'white'} />
            </AccordionButton>

            <AccordionPanel p={0}>
              <Monitor needStyles={false} />
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      )}
    </Box>
  );
}

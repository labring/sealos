import {
  Box,
  Text,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  VStack,
  HStack,
  Flex
} from '@chakra-ui/react';
import useSessionStore from '@/stores/session';
import { useSubscriptionStore } from '@/stores/subscription';
import { useMemo, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Button, cn, Separator } from '@sealos/shadcn-ui';
import { WorkspaceSubscription } from '@/types/plan';
import Decimal from 'decimal.js';
import { useQuery } from '@tanstack/react-query';
import { getAmount } from '@/api/auth';
import { formatMoney } from '@/utils/format';
import { CurrencySymbol } from '@sealos/ui';
import { useConfigStore } from '@/stores/config';
import { useTranslation } from 'next-i18next';

interface BalancePopoverProps {
  openCostCenterApp: () => void;
  openCostCenterTopup: () => void;
  children: React.ReactNode;
}

/**
 * @deprecated - Move to `getPlanBackgroundClass` if possible.
 */
export function getPlanBackground(subscription?: WorkspaceSubscription) {
  if (!subscription) return 'var(--background-image-plan-payg)';
  const name = subscription?.PlanName ? subscription?.PlanName.toLowerCase() : 'Free';
  const status = subscription?.Status?.toLowerCase();
  if (status === 'debt') return 'var(--background-image-plan-debt)';
  if (name.includes('free')) return 'var(--background-image-plan-hobby)';
  if (name.includes('hobby')) return 'var(--background-image-plan-hobby)';
  if (name.includes('starter')) return 'var(--background-image-plan-starter)';
  if (name.includes('pro')) return 'var(--background-image-plan-pro)';
  if (name.includes('team')) return 'var(--background-image-plan-team)';
  if (name.includes('standard')) return 'var(--background-image-plan-hobby-plus)';
  if (name.includes('enterprise')) return 'var(--background-image-plan-enterprise)';
  return 'var(--background-image-plan-payg)';
}

export function BalancePopover({
  openCostCenterApp,
  openCostCenterTopup,
  children
}: BalancePopoverProps) {
  const { t } = useTranslation();
  const { session } = useSessionStore();
  const subscriptionEnabled = useConfigStore(
    (state) => state.layoutConfig?.common.subscriptionEnabled
  );
  const currencySymbol = useConfigStore(
    (state) => state.layoutConfig?.currencySymbol || 'shellCoin'
  );

  const workspace = session?.user?.nsid || '';

  const { subscriptionInfo, fetchSubscriptionInfo } = useSubscriptionStore();

  useEffect(() => {
    if (workspace) {
      fetchSubscriptionInfo(workspace);
    }
  }, [workspace, fetchSubscriptionInfo]);

  const subscription = subscriptionInfo?.subscription;
  const isFreePlan = (subscription?.PlanName || '').toLowerCase() === 'free';
  const isCancelled = !!subscription?.CancelAtPeriodEnd && !isFreePlan;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCancelledNoticeDate = (dateStr?: string) => {
    const d = dateStr ? new Date(dateStr) : null;
    if (!d || Number.isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
  };

  const calculateRemainingDays = (endDateStr?: string) => {
    if (!endDateStr) return 0;

    const endDate = new Date(endDateStr);
    const currentDate = new Date();
    const timeDiff = endDate.getTime() - currentDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    return Math.max(0, daysDiff);
  };

  const remainingDays = calculateRemainingDays(subscription?.CurrentPeriodEndAt);

  const { data } = useQuery({
    queryKey: ['getAmount', { userId: session?.user?.userCrUid }],
    queryFn: getAmount,
    enabled: !!session?.user,
    staleTime: 60 * 1000,
    refetchOnMount: true
  });

  const balance = useMemo(() => {
    let realBalance = new Decimal(data?.data?.balance || 0);
    if (data?.data?.deductionBalance) {
      realBalance = realBalance.minus(new Decimal(data.data.deductionBalance));
    }
    return realBalance.toNumber();
  }, [data]);

  return (
    <Popover trigger="hover" placement="bottom-start">
      <PopoverTrigger>{children}</PopoverTrigger>
      <PopoverContent
        w="300px"
        bg="white"
        border="1px solid"
        borderColor="gray.200"
        borderRadius="12px"
        shadow="lg"
      >
        <PopoverBody p={4}>
          <VStack spacing={3} align="stretch">
            <Box
              p={'20px'}
              bg={isCancelled ? 'var(--color-zinc-100)' : getPlanBackground(subscription)}
              borderRadius="12px"
            >
              {/* Show plan name only if subscription enabled */}
              {subscriptionEnabled && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold capitalize">
                      {subscription?.PlanName
                        ? `${subscription?.PlanName} ${t('common:balance_popover.plan_suffix')}`
                        : t('common:balance_popover.payg_plan')}
                    </span>
                    {isCancelled && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-200 px-2 py-1 text-xs font-medium text-muted-foreground leading-3.5">
                        {t('common:nav_links.cancelled')}
                      </span>
                    )}
                    {subscriptionInfo?.subscription?.Status?.toLowerCase() === 'debt' && (
                      <div className="text-red-600 bg-red-100 font-medium text-sm px-2 py-1 rounded-full leading-3.5 ml-2">
                        {t('common:balance_popover.subscription_status.expired')}
                      </div>
                    )}
                    {subscription?.PlanName === 'Free' && (
                      <div className="border text-sm font-normal leading-3.5 bg-[#FFEDD5CC] border-none text-orange-500 rounded-full px-2 py-1">
                        {t('common:balance_popover.subscription_status.limited_trial')}
                      </div>
                    )}
                  </div>

                  {!subscription?.PlanName && <Separator className="my-2" />}
                </>
              )}
              {!subscription?.PlanName && (
                <div className="flex items-center gap-2 justify-between">
                  <div className="flex items-start flex-col">
                    <div className="text-sm text-zinc-500">
                      {t('common:balance_popover.balance')}
                    </div>
                    <div className="text-2xl font-semibold text-zinc-900 flex">
                      <span
                        className={cn(
                          'flex items-center justify-center',
                          currencySymbol === 'shellCoin' && 'mr-1'
                        )}
                      >
                        <CurrencySymbol type={currencySymbol} />
                      </span>
                      <span>{formatMoney(balance).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Show topup button if subscription is enabled */}
                  {!subscriptionEnabled && (
                    <Button variant="outline" onClick={openCostCenterTopup}>
                      {t('common:balance_popover.top_up')}
                    </Button>
                  )}
                </div>
              )}
              {!!subscription?.PlanName &&
                (subscription?.PlanName !== 'Free' &&
                subscriptionInfo?.subscription?.Status?.toLowerCase() === 'debt' &&
                subscription?.ExpireAt ? (
                  <HStack>
                    <span className="text-sm text-zinc-600">
                      {t('common:balance_popover.expired_at')}
                    </span>
                    <span className="text-sm text-zinc-600">
                      {formatDate(subscription?.ExpireAt)}
                    </span>
                  </HStack>
                ) : (
                  <></>
                ))}
              {subscriptionEnabled &&
                isCancelled &&
                subscription?.PlanName &&
                subscription?.PlanName !== 'Free' &&
                subscription?.CurrentPeriodEndAt && (
                  <div className="text-zinc-600 text-sm font-normal mt-2">
                    {t('common:balance_popover.expires_on')}{' '}
                    {formatDate(subscription.CurrentPeriodEndAt)}
                  </div>
                )}
              {subscription?.PlanName === 'Free' && (
                <div className="text-zinc-600 text-sm font-normal mt-2">
                  {t('common:balance_popover.trial_expiry_tip', { count: remainingDays })}
                </div>
              )}
            </Box>

            {subscriptionEnabled && (
              <>
                {isCancelled ? (
                  <>
                    <div className="text-sm text-zinc-900 font-normal">
                      {t('common:balance_popover.cancelled_notice', {
                        date: formatCancelledNoticeDate(subscription?.CurrentPeriodEndAt)
                      })}
                    </div>
                    <Button variant="outline" onClick={openCostCenterApp}>
                      <Sparkles size={16} />
                      {t('common:balance_popover.renew_subscription_button')}
                    </Button>
                  </>
                ) : (
                  <>
                    {subscription?.PlanName !== 'Free' ? (
                      <div className="text-sm text-zinc-900 font-normal">
                        {t('common:balance_popover.upgrade_tip')}
                      </div>
                    ) : (
                      <div className="text-sm text-zinc-900 font-normal">
                        {t('common:balance_popover.trial_expiry_upgrade_tip', {
                          count: remainingDays
                        })}
                      </div>
                    )}

                    <Button variant="outline" onClick={openCostCenterApp}>
                      <Sparkles size={16} />
                      {t('common:balance_popover.upgrade_button')}
                    </Button>
                  </>
                )}
              </>
            )}
            <HStack pt={2} borderTop="1px solid" borderColor="gray.100">
              <Flex
                justifyContent={'space-between'}
                px={'0px'}
                w={'100%'}
                cursor={'pointer'}
                fontSize={'14px'}
                fontWeight={400}
                onClick={openCostCenterApp}
              >
                <Text>{t('common:balance_popover.check_costcenter_tip')}</Text>
                <Text>→</Text>
              </Flex>
            </HStack>
          </VStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}

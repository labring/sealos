import { Button, cn, Dialog, DialogContent, DialogTrigger, Separator } from '@sealos/shadcn-ui';
import { Badge } from '@sealos/shadcn-ui/badge';
import { CircleCheck, Sparkles } from 'lucide-react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SubscriptionPlan } from '@/types/plan';
import useSessionStore from '@/stores/session';
import useBillingStore from '@/stores/billing';
import useEnvStore from '@/stores/env';
import { getPlanList, getSubscriptionInfo } from '@/api/plan';
import { AllPlansSection } from '@/components/plan/AllPlansSection';
import { getAccountBalance } from '@/api/account';
import request from '@/service/request';
import GiftCode from '@/components/cost_overview/components/GiftCode';
import RechargeModal from '@/components/RechargeModal';
import TransferModal from '@/components/TransferModal';
import { useRef, useMemo } from 'react';
import jsyaml from 'js-yaml';
import { displayMoney, formatMoney } from '@/utils/format';
import { createSubscriptionPayment } from '@/api/plan';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useMutation } from '@tanstack/react-query';

import { SubscriptionPayRequest } from '@/types/plan';

function PlanHeader({
  plans,
  isLoading,
  subscription,
  onSubscribe,
  isSubscribing = false
}: {
  plans?: SubscriptionPlan[];
  isLoading?: boolean;
  subscription?: any;
  onSubscribe?: (plan: SubscriptionPlan, period: string) => void;
  isSubscribing?: boolean;
}) {
  const planName = subscription?.PlanName || 'Free Plan';
  const renewalTime = subscription?.CurrentPeriodEndAt
    ? new Date(subscription.CurrentPeriodEndAt)
        .toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
        .replace(/\//g, '/')
        .replace(',', '')
    : 'N/A';

  return (
    <div className="bg-white shadow-sm border p-2 rounded-2xl">
      <div className="bg-plan-starter rounded-xl p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-slate-500 text-sm">Current Workspace Plan</span>
            <h1 className="font-semibold text-2xl">{planName}</h1>
          </div>

          <UpgradePlanDialog
            plans={plans}
            isLoading={isLoading}
            currentPlan={subscription?.PlanName}
            onSubscribe={onSubscribe}
            isSubscribing={isSubscribing}
          >
            <Button size="lg">
              <Sparkles />
              <span>Upgrade Plan</span>
            </Button>
          </UpgradePlanDialog>
        </div>

        <Separator className="border-slate-200" />

        <div className="grid grid-cols-3 gap-2">
          <div className="flex gap-2 items-center">
            <CircleCheck size={16} className="text-blue-600"></CircleCheck>
            <span className="text-gray-600 text-sm">
              Status: {subscription?.Status || 'Unknown'}
            </span>
          </div>
          <div className="flex gap-2 items-center">
            <CircleCheck size={16} className="text-blue-600"></CircleCheck>
            <span className="text-gray-600 text-sm">Type: {subscription?.type || 'Unknown'}</span>
          </div>
          <div className="flex gap-2 items-center">
            <CircleCheck size={16} className="text-blue-600"></CircleCheck>
            <span className="text-gray-600 text-sm">
              Pay Status: {subscription?.PayStatus || 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 grid grid-cols-2">
        <div className="flex gap-2 flex-col">
          <span className="text-sm text-muted-foreground">Plan Type</span>
          <span className="text-card-foreground font-semibold text-base leading-none flex items-center gap-2">
            {subscription?.type === 'SUBSCRIPTION'
              ? 'Subscription'
              : subscription?.type || 'Unknown'}
          </span>
        </div>

        <div className="flex gap-2 flex-col">
          <span className="text-sm text-muted-foreground">Renewal Time</span>
          <span className="text-card-foreground font-semibold text-base leading-none flex items-center gap-2">
            {renewalTime}
          </span>
        </div>
      </div>
    </div>
  );
}

function UpgradePlanCard({
  plan,
  className,
  isPopular = false,
  isCurrentPlan = false,
  onSubscribe,
  isLoading = false
}: {
  plan: SubscriptionPlan;
  className?: string;
  isPopular?: boolean;
  isCurrentPlan?: boolean;
  onSubscribe?: (plan: SubscriptionPlan, period: string) => void;
  isLoading?: boolean;
}) {
  const monthlyPrice = plan.Prices?.find((p) => p.BillingCycle === 'monthly')?.Price || 0;

  let resources: any = {};
  try {
    resources = JSON.parse(plan.MaxResources);
  } catch (e) {
    resources = {};
  }

  return (
    <section
      className={cn(
        'flex flex-col border border-gray-200 rounded-xl bg-white shadow-sm',
        className
      )}
      style={{ width: '315px' }}
    >
      <div className="p-6 pb-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-semibold text-gray-900">{plan.Name}</h3>
          {isPopular && (
            <Badge className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
              Most popular
            </Badge>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-6 leading-relaxed">{plan.Description}</p>

        <div className="mb-6">
          <span className="text-4xl font-bold text-gray-900">
            ${(monthlyPrice / 1000000).toFixed(0)}
          </span>
          <span className="text-gray-600 ml-1">/month</span>
        </div>

        <Button
          className={cn(
            'w-full mb-6 font-medium',
            isCurrentPlan
              ? 'bg-gray-200 text-gray-600 cursor-not-allowed hover:bg-gray-200'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          )}
          disabled={isCurrentPlan || isLoading}
          onClick={() => {
            if (!isCurrentPlan && !plan.Name.includes('medium') && onSubscribe) {
              onSubscribe(plan, 'monthly');
            }
          }}
        >
          {isCurrentPlan
            ? 'Your current plan'
            : plan.Name.includes('medium')
              ? 'Contact Us'
              : isLoading
                ? 'Processing...'
                : 'Subscribe'}
        </Button>

        <ul className="space-y-3">
          {resources.cpu && (
            <li className="flex items-center gap-3">
              <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                {resources.cpu === '16'
                  ? '1 vCPU'
                  : resources.cpu === '4'
                    ? '4 vCPU'
                    : resources.cpu === '8'
                      ? 'More vCPU'
                      : `${resources.cpu} CPU`}
              </span>
            </li>
          )}
          {resources.memory && (
            <li className="flex items-center gap-3">
              <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                {resources.memory === '32Gi'
                  ? '2GB RAM'
                  : resources.memory === '8Gi'
                    ? '8GB RAM'
                    : resources.memory === '16Gi'
                      ? 'More RAM'
                      : resources.memory}
              </span>
            </li>
          )}
          {resources.storage && (
            <li className="flex items-center gap-3">
              <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">
                {resources.storage === '500Gi'
                  ? '2GB Disk'
                  : resources.storage === '100Gi'
                    ? '2GB Disk'
                    : resources.storage === '200Gi'
                      ? 'More Disk'
                      : resources.storage}
              </span>
            </li>
          )}
          <li className="flex items-center gap-3">
            <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
            <span className="text-sm text-gray-700">
              {plan.Traffic === 50000
                ? '3GB Traffic'
                : plan.Traffic === 10000
                  ? '3GB Traffic'
                  : plan.Traffic === 20000
                    ? 'More Traffic'
                    : `${plan.Traffic}GB Traffic`}
            </span>
          </li>
          <li className="flex items-center gap-3">
            <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
            <span className="text-sm text-gray-700">
              {plan.MaxSeats === 50
                ? '1 Port'
                : plan.MaxSeats === 10
                  ? '2 Port'
                  : plan.MaxSeats === 20
                    ? 'More Port'
                    : `${plan.MaxSeats} Port`}
            </span>
          </li>
          {plan.Name.includes('medium') && (
            <li className="flex items-center gap-3">
              <CircleCheck size={20} className="text-blue-600 flex-shrink-0" />
              <span className="text-sm text-gray-700">More Customized Services</span>
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}

function UpgradePlanDialog({
  children,
  plans,
  isLoading,
  currentPlan,
  onSubscribe,
  isSubscribing = false
}: {
  children: React.ReactNode;
  plans?: SubscriptionPlan[];
  isLoading?: boolean;
  currentPlan?: string;
  onSubscribe?: (plan: SubscriptionPlan, period: string) => void;
  isSubscribing?: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="min-w-[70rem] py-8 px-20 bg-zinc-50">
        <div className="flex flex-col justify-center">
          <section className="mt-6">
            <h1 className="text-3xl font-semibold text-center">Upgrade Plan</h1>
          </section>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div>Loading plans...</div>
            </div>
          ) : plans && plans.length > 0 ? (
            <div className="flex pt-6 gap-3 overflow-x-auto justify-center">
              {plans
                .filter((plan) => plan.Prices && plan.Prices.length > 0) // 筛选掉免费计划
                .map((plan, index) => (
                  <UpgradePlanCard
                    key={plan.ID}
                    plan={plan}
                    isPopular={index === 1} // 设置第二个为推荐
                    isCurrentPlan={plan.Name === currentPlan}
                    onSubscribe={onSubscribe}
                    isLoading={isSubscribing}
                  />
                ))}
            </div>
          ) : (
            <div className="flex justify-center py-12">
              <div className="text-gray-500">No plans available</div>
            </div>
          )}

          <Button variant="link" className="underline text-zinc-600 text-base mt-4" asChild>
            <a href="">Still wanna charge by volume?</a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Plan() {
  const { session } = useSessionStore();
  const { getRegion, regionList } = useBillingStore();
  const transferEnabled = useEnvStore((state) => state.transferEnabled);
  const rechargeEnabled = useEnvStore((state) => state.rechargeEnabled);
  const stripePromise = useEnvStore((s) => s.stripePromise);
  const region = getRegion();
  const { toast } = useCustomToast();
  console.log('session', session, regionList, region);

  const queryClient = useQueryClient();
  const rechargeRef = useRef<any>();
  const transferRef = useRef<any>();

  // Get balance data
  const { data: balance_raw } = useQuery({
    queryKey: ['getAccount'],
    queryFn: getAccountBalance,
    staleTime: 0
  });

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['plan-list'],
    queryFn: getPlanList
    // staleTime: 5 * 60 * 1000,
    // refetchOnWindowFocus: false
  });

  // Get current workspace subscription info
  const { data: subscriptionData } = useQuery({
    queryKey: ['subscription-info', session?.user?.nsid, region?.uid],
    queryFn: () =>
      getSubscriptionInfo({
        workspace: session?.user?.nsid || '',
        regionDomain: region?.domain || ''
      }),
    enabled: !!(session?.user?.nsid && region?.uid)
  });

  // Calculate balance
  let rechargAmount = balance_raw?.data?.balance || 0;
  let expenditureAmount = balance_raw?.data?.deductionBalance || 0;
  let balance = rechargAmount - expenditureAmount;

  // Get k8s_username for transfer functionality
  const getSession = useSessionStore((state) => state.getSession);
  const { kubeconfig } = getSession();
  const k8s_username = useMemo(() => {
    try {
      let temp = jsyaml.load(kubeconfig);
      // @ts-ignore
      return temp?.users[0]?.name;
    } catch (error) {
      return '';
    }
  }, [kubeconfig]);

  console.log('subscriptionData', subscriptionData?.data?.subscription);

  // Subscription mutation
  const subscriptionMutation = useMutation({
    mutationFn: createSubscriptionPayment,
    onSuccess: (data) => {
      if (data.code === 200) {
        toast({
          title: 'Success',
          description: 'Subscription payment completed successfully',
          variant: 'default'
        });

        // Refresh subscription info and balance
        queryClient.invalidateQueries({ queryKey: ['subscription-info'] });
        queryClient.invalidateQueries({ queryKey: ['getAccount'] });
      } else {
        throw new Error(data.message || 'Payment failed');
      }
    },
    onError: (error: any) => {
      console.error('Subscription payment error:', error);
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to process subscription payment',
        variant: 'destructive'
      });
    }
  });

  const handleSubscribe = (plan: SubscriptionPlan, period: string) => {
    if (!session?.user?.nsid || !region?.domain) {
      toast({
        title: 'Error',
        description: 'Session or region information is missing',
        variant: 'destructive'
      });
      return;
    }

    const paymentRequest: SubscriptionPayRequest = {
      workspace: session.user.nsid,
      regionDomain: region.domain,
      planName: plan.Name,
      period: period,
      payMethod: 'BALANCE', // Using balance as default payment method
      operator: 'created' // Set appropriate operator type
    };

    subscriptionMutation.mutate(paymentRequest);
  };

  return (
    <div className="bg-white gap-8 flex flex-col">
      <PlanHeader
        plans={plansData?.data?.plans}
        isLoading={plansLoading}
        subscription={subscriptionData?.data?.subscription}
        onSubscribe={handleSubscribe}
        isSubscribing={subscriptionMutation.isLoading}
      />

      {/* Balance card */}
      <div className="p-2 border shadow-sm rounded-2xl">
        <div className="bg-plan-payg flex justify-between items-center rounded-xl px-6 py-5">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-slate-500">Balance</span>
            <span className="text-foreground text-2xl font-semibold leading-none">
              ${displayMoney(formatMoney(balance))}
            </span>
          </div>

          <div className="flex gap-4 items-center">
            <div className="w-20">
              <GiftCode />
            </div>
            {rechargeEnabled && (
              <Button
                variant="outline"
                onClick={(e) => {
                  e.preventDefault();
                  rechargeRef?.current!.onOpen();
                }}
              >
                Top Up
              </Button>
            )}
          </div>
        </div>
      </div>

      <AllPlansSection />
      {/* Modals */}
      {rechargeEnabled && (
        <RechargeModal
          ref={rechargeRef}
          balance={balance}
          stripePromise={stripePromise}
          request={request}
          onPaySuccess={async () => {
            await new Promise((s) => setTimeout(s, 2000));
            await queryClient.invalidateQueries({ queryKey: ['billing'] });
            await queryClient.invalidateQueries({ queryKey: ['getAccount'] });
          }}
        />
      )}

      {transferEnabled && (
        <TransferModal
          ref={transferRef}
          balance={balance}
          onTransferSuccess={async () => {
            await new Promise((s) => setTimeout(s, 2000));
            await queryClient.invalidateQueries({ queryKey: ['billing'] });
            await queryClient.invalidateQueries({ queryKey: ['getAccount'] });
          }}
          k8s_username={k8s_username}
        />
      )}
    </div>
  );
}

export async function getServerSideProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'applist'], undefined, ['zh', 'en']))
    }
  };
}

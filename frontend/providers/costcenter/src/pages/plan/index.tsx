import { Button, cn, Dialog, DialogContent, DialogTrigger, Separator } from '@sealos/shadcn-ui';
import { Badge } from '@sealos/shadcn-ui/badge';
import { CircleCheck, Sparkles } from 'lucide-react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SubscriptionInfoResponse, SubscriptionPlan } from '@/types/plan';
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
import { useRef, useMemo, useState } from 'react';
import jsyaml from 'js-yaml';
import { displayMoney, formatMoney } from '@/utils/format';
import { createSubscriptionPayment } from '@/api/plan';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useMutation } from '@tanstack/react-query';
import { Checkbox } from '@sealos/shadcn-ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sealos/shadcn-ui';

import { SubscriptionPayRequest } from '@/types/plan';

function getPlanBackgroundClass(planName: string, isPayg: boolean): string {
  if (isPayg) return 'bg-plan-payg';

  const normalizedPlanName = planName.toLowerCase();

  switch (normalizedPlanName) {
    case 'starter':
      return 'bg-plan-starter';
    case 'pro':
      return 'bg-plan-pro';
    case 'enterprise':
      return 'bg-plan-enterprise';
    case 'hobby':
      return 'bg-plan-hobby';
    case 'hobby plus':
    case 'hobby-plus':
      return 'bg-plan-hobby-plus';
    case 'team':
      return 'bg-plan-team';
    case 'customized':
      return 'bg-plan-customized';
    default:
      return 'bg-plan-starter'; // Default fallback
  }
}

function BalanceSection({
  balance,
  rechargeEnabled,
  onTopUpClick
}: {
  balance: number;
  rechargeEnabled: boolean;
  onTopUpClick: () => void;
}) {
  return (
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
                onTopUpClick();
              }}
            >
              Top Up
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function PlanHeader({
  plans,
  isLoading,
  subscription,
  onSubscribe,
  isSubscribing = false
}: {
  plans?: SubscriptionPlan[];
  isLoading?: boolean;
  subscription?: SubscriptionInfoResponse['subscription'];
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

  const isPaygType = subscription?.type === 'PAYG';
  const planDisplayName = isPaygType ? 'PAYG' : planName;
  const backgroundClass = getPlanBackgroundClass(planName, isPaygType);

  if (isPaygType) {
    return (
      <div className="bg-white shadow-sm border p-2 rounded-2xl">
        <div
          className={`${backgroundClass} rounded-xl px-6 py-4 flex justify-between items-center`}
        >
          <div>
            <span className="text-slate-500 text-sm">Current Workspace Plan</span>
            <h1 className="font-semibold text-2xl">{planDisplayName}</h1>
          </div>

          <UpgradePlanDialog
            plans={plans}
            isLoading={isLoading}
            currentPlan={subscription?.PlanName}
            onSubscribe={onSubscribe}
            isSubscribing={isSubscribing}
          >
            <Button size="lg" variant="outline">
              <Sparkles />
              <span>Subscribe Plan</span>
            </Button>
          </UpgradePlanDialog>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm border p-2 rounded-2xl">
      <div className={`${backgroundClass} rounded-xl p-6 flex flex-col gap-4`}>
        <div className="flex justify-between items-center">
          <div>
            <span className="text-slate-500 text-sm">Current Workspace Plan</span>
            <h1 className="font-semibold text-2xl">{isPaygType ? 'PAYG' : planName}</h1>
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
  const monthlyPrice = plan.Prices?.find((p) => p.BillingCycle === '1m')?.Price || 0;

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
      style={{ width: '258px' }}
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

function PlansDisplay({
  plans,
  currentPlan,
  onSubscribe,
  isSubscribing
}: {
  plans: SubscriptionPlan[];
  currentPlan?: string;
  onSubscribe?: (plan: SubscriptionPlan, period: string) => void;
  isSubscribing?: boolean;
}) {
  const [showMorePlans, setShowMorePlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  // Filter out free plans and show first 4 for main display
  const paidPlans = plans.filter((plan) => plan.Prices && plan.Prices.length > 0);
  const mainPlans = paidPlans.slice(0, 4);
  const additionalPlans = paidPlans.slice(4);

  return (
    <div className="pt-6">
      {/* Main Plans Grid */}
      <div
        className={`flex gap-3 overflow-x-auto justify-center ${showMorePlans ? 'opacity-30' : ''}`}
      >
        {mainPlans.map((plan, index) => (
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

      {/* More Plans Section */}
      {additionalPlans.length > 0 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="more-plans"
              checked={showMorePlans}
              onCheckedChange={(checked) => setShowMorePlans(checked === true)}
            />
            <label htmlFor="more-plans" className="text-sm font-medium">
              More Plans
            </label>
          </div>

          {showMorePlans && (
            <>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {additionalPlans.map((plan) => (
                    <SelectItem key={plan.ID} value={plan.ID}>
                      <div className="flex items-center justify-between w-full">
                        <span>{plan.Name}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          ${((plan.Prices?.[0]?.Price || 0) / 1000000).toFixed(0)}/month
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                disabled={!selectedPlan || isSubscribing}
                onClick={() => {
                  const plan = additionalPlans.find((p) => p.ID === selectedPlan);
                  if (plan && onSubscribe) {
                    onSubscribe(plan, 'monthly');
                  }
                }}
              >
                {isSubscribing ? 'Processing...' : 'Upgrade'}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
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
            <PlansDisplay
              plans={plans}
              currentPlan={currentPlan}
              onSubscribe={onSubscribe}
              isSubscribing={isSubscribing}
            />
          ) : (
            <div className="flex justify-center py-12">
              <div className="text-gray-500">No plans available</div>
            </div>
          )}
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
  // console.log('plansData', plansData);

  // Get current workspace subscription info
  // const { data: subscriptionData } = useQuery({
  //   queryKey: ['subscription-info', session?.user?.nsid, region?.uid],
  //   queryFn: () =>
  //     getSubscriptionInfo({
  //       workspace: session?.user?.nsid || '',
  //       regionDomain: region?.domain || ''
  //     }),
  //   enabled: !!(session?.user?.nsid && region?.uid)
  // });
  const subscriptionData = {
    data: {
      subscription: {
        ID: '5f42293e-ec79-4554-9d65-fdad9069247f',
        PlanName: 'team',
        Workspace: 'ns-1bww11km',
        RegionDomain: '192.168.10.35.nip.io',
        UserUID: '9d510716-9ff9-4aed-8d22-49f41a3600da',
        Status: 'NORMAL',
        PayStatus: 'no_need',
        PayMethod: '',
        Stripe: null,
        TrafficStatus: 'active',
        CurrentPeriodStartAt: '2025-08-26T03:10:24.584415Z',
        CurrentPeriodEndAt: '2025-09-09T03:10:24.584415Z',
        CancelAtPeriodEnd: false,
        CancelAt: '0001-01-01T00:00:00Z',
        CreateAt: '2025-08-26T03:10:24.584415Z',
        UpdateAt: '2025-08-26T03:10:24.584415Z',
        ExpireAt: null,
        Traffic: null,
        type: 'SUBSCRIPTION'
      }
    }
  };
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

  console.log('subscriptionData', subscriptionData);

  // Subscription mutation
  const subscriptionMutation = useMutation({
    mutationFn: createSubscriptionPayment,
    onSuccess: (data) => {
      if (data.code === 200) {
        console.log('data', data);
        if (data.data?.redirectUrl) {
          window.parent.location.href = data.data.redirectUrl;
        }
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
      period: '1m',
      payMethod: 'STRIPE', // Using balance as default payment method
      operator: 'upgraded' // Set appropriate operator type
    };

    subscriptionMutation.mutate(paymentRequest);
  };

  const isPaygType = subscriptionData?.data?.subscription?.type === 'PAYG';

  return (
    <div className="bg-white gap-8 flex flex-col">
      {isPaygType ? (
        <div className="flex gap-4">
          <div className="flex-2/3">
            <PlanHeader
              plans={plansData?.data?.plans}
              isLoading={plansLoading}
              subscription={subscriptionData?.data?.subscription}
              onSubscribe={handleSubscribe}
              isSubscribing={subscriptionMutation.isLoading}
            />
          </div>
          <div className="flex-1/3">
            <BalanceSection
              balance={balance}
              rechargeEnabled={rechargeEnabled}
              onTopUpClick={() => rechargeRef?.current!.onOpen()}
            />
          </div>
        </div>
      ) : (
        <>
          <PlanHeader
            plans={plansData?.data?.plans}
            isLoading={plansLoading}
            subscription={subscriptionData?.data?.subscription}
            onSubscribe={handleSubscribe}
            isSubscribing={subscriptionMutation.isLoading}
          />

          <BalanceSection
            balance={balance}
            rechargeEnabled={rechargeEnabled}
            onTopUpClick={() => rechargeRef?.current!.onOpen()}
          />
        </>
      )}

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

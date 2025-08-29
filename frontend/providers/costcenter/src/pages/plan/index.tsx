import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  Separator
} from '@sealos/shadcn-ui';
import { Badge } from '@sealos/shadcn-ui/badge';
import { CircleCheck, Info, Sparkles } from 'lucide-react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SubscriptionInfoResponse, SubscriptionPlan } from '@/types/plan';
import useSessionStore from '@/stores/session';
import useBillingStore from '@/stores/billing';
import useEnvStore from '@/stores/env';
import { getPlanList, getSubscriptionInfo, getLastTransaction } from '@/api/plan';
import { AllPlansSection } from '@/components/plan/AllPlansSection';
import { getAccountBalance } from '@/api/account';
import request from '@/service/request';
import GiftCode from '@/components/cost_overview/components/GiftCode';
import RechargeModal from '@/components/RechargeModal';
import TransferModal from '@/components/TransferModal';
import { useRef, useMemo, useState, useEffect } from 'react';
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
  isSubscribing = false,
  lastTransaction
}: {
  plans?: SubscriptionPlan[];
  isLoading?: boolean;
  subscription?: SubscriptionInfoResponse['subscription'];
  onSubscribe?: (plan: SubscriptionPlan) => void;
  isSubscribing?: boolean;
  lastTransaction?: any;
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
  console.log('subscription', subscription);

  const isPaygType = subscription?.type === 'PAYG';
  const planDisplayName = isPaygType ? 'PAYG' : planName;
  const backgroundClass = getPlanBackgroundClass(planName, isPaygType);

  // Find current plan details from plans list
  const currentPlan = plans?.find((plan) => plan.Name === subscription?.PlanName);
  const monthlyPrice = currentPlan?.Prices?.find((p) => p.BillingCycle === '1m')?.Price || 0;
  console.log('currentPlan', currentPlan, monthlyPrice);

  // Parse plan resources
  let planResources: any = {};
  try {
    planResources = JSON.parse(currentPlan?.MaxResources || '{}');
  } catch (e) {
    planResources = {};
  }

  // Check if there's a downgrade and show next plan info
  const isDowngrade = lastTransaction?.Operator === 'downgraded';
  const nextPlanName = isDowngrade ? lastTransaction?.NewPlanName : null;

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
            lastTransaction={lastTransaction}
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
            lastTransaction={lastTransaction}
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
          {Object.entries(planResources).map(([key, value]) => (
            <div key={key} className="flex gap-2 items-center">
              <CircleCheck size={16} className="text-blue-600"></CircleCheck>
              <span className="text-gray-600 text-sm">
                {key}: {String(value) || 'N/A'}
              </span>
            </div>
          ))}
          {currentPlan?.Traffic && (
            <div className="flex gap-2 items-center">
              <CircleCheck size={16} className="text-blue-600"></CircleCheck>
              <span className="text-gray-600 text-sm">Traffic: {currentPlan.Traffic}GB</span>
            </div>
          )}
        </div>
      </div>

      <div className={`px-6 py-5 grid ${isDowngrade ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <div className="flex gap-2 flex-col">
          <span className="text-sm text-muted-foreground">Price/Month</span>
          <span className="text-card-foreground font-semibold text-base leading-none flex items-center gap-2">
            ${displayMoney(formatMoney(monthlyPrice))}
          </span>
        </div>

        <div className="flex gap-2 flex-col">
          <span className="text-sm text-muted-foreground">Renewal Time</span>
          <span className="text-card-foreground font-semibold text-base leading-none flex items-center gap-2">
            {renewalTime}
          </span>
        </div>

        {isDowngrade && (
          <div className="flex gap-2 flex-col">
            <span className="text-sm text-muted-foreground">Next Plan</span>
            <span className="bg-[#FFEDD5] text-orange-600 font-medium text-sm leading-none flex items-center gap-2 px-2 py-1 w-fit rounded-full">
              {nextPlanName} Plan
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function UpgradePlanCard({
  plan,
  className,
  isPopular = false,
  isCurrentPlan = false,
  isNextPlan = false,
  currentPlan,
  onSubscribe,
  isLoading = false
}: {
  plan: SubscriptionPlan;
  className?: string;
  isPopular?: boolean;
  isCurrentPlan?: boolean;
  isNextPlan?: boolean;
  currentPlan?: SubscriptionPlan;
  onSubscribe?: (plan: SubscriptionPlan) => void;
  isLoading?: boolean;
}) {
  const monthlyPrice = plan.Prices?.find((p) => p.BillingCycle === '1m')?.Price || 0;

  let resources: any = {};
  try {
    resources = JSON.parse(plan.MaxResources);
  } catch (e) {
    resources = {};
  }

  // Determine action type based on plan relationships
  const getActionType = () => {
    if (!currentPlan) return 'upgrade';
    if (currentPlan.UpgradePlanList?.includes(plan.Name)) return 'upgrade';
    if (currentPlan.DowngradePlanList?.includes(plan.Name)) return 'downgrade';
    if (plan.Name.includes('Enterprise')) return 'contact';
    return 'upgrade';
  };

  const actionType = getActionType();

  // Get button text based on action type
  const getButtonText = () => {
    if (isCurrentPlan) return 'Your current plan';
    if (isNextPlan) return 'Your next plan';
    if (isLoading) return 'Processing...';

    switch (actionType) {
      case 'upgrade':
        return 'Upgrade';
      case 'downgrade':
        return 'Downgrade';
      case 'contact':
        return 'Contact Us';
      default:
        return 'Subscribe';
    }
  };

  return (
    <section
      className={cn(
        'flex flex-col border border-gray-200 rounded-xl bg-white shadow-sm',
        className
      )}
      style={{ width: '258px' }}
    >
      <div className="p-6 pb-4 relative">
        <div className="flex justify-between items-start mb-2 ">
          <h3 className="text-xl font-semibold text-gray-900">{plan.Name}</h3>
          {isPopular && (
            <Badge className="bg-blue-600 z-10 text-white text-xs px-2 py-1 rounded-full absolute -top-4 left-1/2 leading-[14px] -translate-x-1/2">
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
            isCurrentPlan || isNextPlan
              ? 'bg-gray-200 text-gray-600 cursor-not-allowed hover:bg-gray-200'
              : actionType === 'contact'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-900 text-white hover:bg-gray-800'
          )}
          disabled={isCurrentPlan || isNextPlan || isLoading}
          onClick={() => {
            if (!isCurrentPlan && !isNextPlan && actionType !== 'contact' && onSubscribe) {
              onSubscribe(plan);
            }
          }}
        >
          {getButtonText()}
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
  lastTransaction,
  onSubscribe,
  isSubscribing
}: {
  plans: SubscriptionPlan[];
  currentPlan?: string;
  lastTransaction?: any;
  onSubscribe?: (plan: SubscriptionPlan) => void;
  isSubscribing?: boolean;
}) {
  const [showMorePlans, setShowMorePlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  // Filter out free plans and separate main plans from additional plans
  const paidPlans = plans.filter((plan) => plan.Prices && plan.Prices.length > 0);

  // Move plans with 'more' tag to additional plans
  const mainPlans = paidPlans.filter((plan) => !plan.Tags.includes('more'));

  const additionalPlans = paidPlans.filter((plan) => plan.Tags.includes('more'));

  // Find the current plan object
  const currentPlanObj = plans.find((plan) => plan.Name === currentPlan);

  // Check if there's a downgrade and determine next plan
  const isDowngrade = lastTransaction?.Operator === 'downgraded';
  const nextPlanName = isDowngrade ? lastTransaction?.NewPlanName : null;

  // Check if current plan is in more plans (has 'more' tag)
  const currentPlanInMore = currentPlanObj && currentPlanObj.Tags.includes('more');

  // Set initial state for More Plans checkbox and selection
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (!hasInitialized && additionalPlans.length > 0) {
      if (currentPlanInMore) {
        setShowMorePlans(true);
        setSelectedPlan(currentPlanObj.ID);
      } else {
        const hobbyPlusPlan = additionalPlans.find((plan) => plan.Name === 'Hobby+');
        if (hobbyPlusPlan) {
          setSelectedPlan(hobbyPlusPlan.ID);
        }
      }
      setHasInitialized(true);
    }
  }, [additionalPlans, currentPlanInMore, currentPlanObj, hasInitialized]);

  return (
    <div className="pt-6 w-full">
      {/* Main Plans Grid */}
      <div
        className={`flex w-full gap-3 justify-between ${
          showMorePlans ? 'opacity-30 pointer-events-none' : ''
        }`}
      >
        {mainPlans.map((plan, index) => (
          <UpgradePlanCard
            key={plan.ID}
            plan={plan}
            isPopular={index === 1}
            isCurrentPlan={plan.Name === currentPlan}
            isNextPlan={plan.Name === nextPlanName}
            currentPlan={currentPlanObj}
            onSubscribe={onSubscribe}
            isLoading={isSubscribing}
          />
        ))}
      </div>
      {/* More Plans Section */}
      {additionalPlans.length > 0 && (
        <div className="mt-6 flex items-center justify-start gap-4">
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Checkbox
              id="more-plans"
              checked={showMorePlans}
              onCheckedChange={(checked) => setShowMorePlans(checked === true)}
            />
            <label htmlFor="more-plans" className="text-sm font-medium">
              More Plans
            </label>
          </div>

          <Select value={selectedPlan} onValueChange={setSelectedPlan}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a plan" />
            </SelectTrigger>
            <SelectContent>
              {additionalPlans.map((plan) => {
                let resources: any = {};
                try {
                  resources = JSON.parse(plan.MaxResources);
                } catch (e) {
                  resources = {};
                }

                const monthlyPrice = (plan.Prices?.[0]?.Price || 0) / 1000000;
                const trafficGB =
                  plan.Traffic > 1 ? (plan.Traffic / 1024).toFixed(0) : plan.Traffic;

                const isCurrentPlanInSelect = plan.Name === currentPlan;
                const isNextPlanInSelect = plan.Name === nextPlanName;

                return (
                  <SelectItem key={plan.ID} value={plan.ID} className="w-full">
                    <div className="flex w-full items-center">
                      <span className="font-medium text-zinc-900 text-sm">{plan.Name}</span>
                      <Separator
                        orientation="vertical"
                        style={{
                          height: '16px',
                          margin: '0 12px'
                        }}
                      />
                      <div className="text-xs text-gray-500">
                        {resources.cpu} vCPU + {resources.memory} RAM + {resources.storage} Disk +
                        {trafficGB} GB Traffic
                      </div>
                      <Separator
                        orientation="vertical"
                        style={{
                          height: '16px',
                          margin: '0 12px'
                        }}
                      />
                      <span className="text-xs text-gray-500">${monthlyPrice.toFixed(0)}</span>
                      {isCurrentPlanInSelect && (
                        <span className="bg-blue-100 text-blue-600 font-medium text-xs px-2 py-1 rounded-full ml-2">
                          Your current plan
                        </span>
                      )}
                      {isNextPlanInSelect && (
                        <span className="bg-orange-100 text-orange-600 font-medium text-xs px-2 py-1 rounded-full ml-2">
                          Your next plan
                        </span>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {showMorePlans && (
            <Button
              disabled={
                !selectedPlan ||
                isSubscribing ||
                additionalPlans.find((p) => p.ID === selectedPlan)?.Name === currentPlan ||
                additionalPlans.find((p) => p.ID === selectedPlan)?.Name === nextPlanName
              }
              onClick={() => {
                const plan = additionalPlans.find((p) => p.ID === selectedPlan);
                if (plan && onSubscribe) {
                  onSubscribe(plan);
                }
              }}
            >
              {(() => {
                if (isSubscribing) return 'Processing...';

                const selectedPlanName = additionalPlans.find((p) => p.ID === selectedPlan)?.Name;
                if (selectedPlanName === currentPlan) return 'Your current plan';
                if (selectedPlanName === nextPlanName) return 'Your next plan';

                // Determine if it's upgrade or downgrade based on plan relationships
                if (currentPlanObj && selectedPlanName) {
                  if (currentPlanObj.UpgradePlanList?.includes(selectedPlanName)) return 'Upgrade';
                  if (currentPlanObj.DowngradePlanList?.includes(selectedPlanName))
                    return 'Downgrade';
                }

                return 'Upgrade';
              })()}
            </Button>
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
  lastTransaction,
  onSubscribe,
  isSubscribing = false
}: {
  children: React.ReactNode;
  plans?: SubscriptionPlan[];
  isLoading?: boolean;
  currentPlan?: string;
  lastTransaction?: any;
  onSubscribe?: (plan: SubscriptionPlan) => void;
  isSubscribing?: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="min-w-[1200px] py-12 px-14 bg-zinc-50">
        <DialogTitle className="sr-only">Choose Your Workspace Plan</DialogTitle>
        <div className="flex flex-col justify-center">
          <section>
            <h1 className="text-3xl font-semibold text-left">Choose Your Workspace Plan</h1>
          </section>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div>Loading plans...</div>
            </div>
          ) : plans && plans.length > 0 ? (
            <PlansDisplay
              plans={plans}
              currentPlan={currentPlan}
              lastTransaction={lastTransaction}
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
  console.log('plansData', plansData);

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

  // Get last transaction to check if it was a downgrade
  const { data: lastTransactionData } = useQuery({
    queryKey: ['last-transaction', session?.user?.nsid, region?.uid],
    queryFn: () =>
      getLastTransaction({
        workspace: session?.user?.nsid || '',
        regionDomain: region?.domain || ''
      }),
    enabled: !!(session?.user?.nsid && region?.uid)
  });
  console.log('lastTransactionData', lastTransactionData);

  // mock data
  // const subscriptionData = {
  //   data: {
  //     subscription: {
  //       ID: '5f42293e-ec79-4554-9d65-fdad9069247f',
  //       PlanName: 'team',
  //       Workspace: 'ns-1bww11km',
  //       RegionDomain: '192.168.10.35.nip.io',
  //       UserUID: '9d510716-9ff9-4aed-8d22-49f41a3600da',
  //       Status: 'NORMAL',
  //       PayStatus: 'no_need',
  //       PayMethod: '',
  //       Stripe: null,
  //       TrafficStatus: 'active',
  //       CurrentPeriodStartAt: '2025-08-26T03:10:24.584415Z',
  //       CurrentPeriodEndAt: '2025-09-09T03:10:24.584415Z',
  //       CancelAtPeriodEnd: false,
  //       CancelAt: '0001-01-01T00:00:00Z',
  //       CreateAt: '2025-08-26T03:10:24.584415Z',
  //       UpdateAt: '2025-08-26T03:10:24.584415Z',
  //       ExpireAt: null,
  //       Traffic: null,
  //       type: 'SUBSCRIPTION'
  //     }
  //   }
  // };

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
      // Refresh subscription data
      queryClient.invalidateQueries({ queryKey: ['subscription-info'] });
      queryClient.invalidateQueries({ queryKey: ['last-transaction'] });

      if (data.code === 200) {
        console.log('data', data);
        if (data.data?.redirectUrl) {
          window.parent.location.href = data.data.redirectUrl;
        } else if (data.data?.success === true) {
          // Determine if it's an upgrade or downgrade based on the last transaction
          const isDowngrade = lastTransactionData?.data?.transaction?.Operator === 'downgraded';
          toast({
            title: 'Payment Success',
            description: `Your subscription has been ${
              isDowngrade ? 'downgraded' : 'upgraded'
            } successfully`,
            variant: 'success'
          });
        }
      }
    },
    onError: (error: any) => {
      // Refresh subscription data on error as well
      queryClient.invalidateQueries({ queryKey: ['subscription-info'] });
      queryClient.invalidateQueries({ queryKey: ['last-transaction'] });

      console.error('Subscription payment error:', error);
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to process subscription payment',
        variant: 'destructive'
      });
    }
  });

  // useEffect(() => {
  //   toast({
  //     title: 'Payment Success',
  //     description: 'Your subscription has been upgraded successfully',
  //     variant: 'success',
  //     duration: null
  //   });
  // }, []);

  const handleSubscribe = (plan: SubscriptionPlan) => {
    if (!session?.user?.nsid || !region?.domain) {
      toast({
        title: 'Error',
        description: 'Session or region information is missing',
        variant: 'destructive'
      });
      return;
    }

    // Determine operator based on plan relationship
    const currentPlanObj = plansData?.data?.plans?.find(
      (p) => p.Name === subscriptionData?.data?.subscription?.PlanName
    );
    const getOperator = () => {
      if (!currentPlanObj) return 'upgraded';
      if (currentPlanObj.UpgradePlanList?.includes(plan.Name)) return 'upgraded';
      if (currentPlanObj.DowngradePlanList?.includes(plan.Name)) return 'downgraded';
      return 'upgraded';
    };

    const paymentRequest: SubscriptionPayRequest = {
      workspace: session.user.nsid,
      regionDomain: region.domain,
      planName: plan.Name,
      period: '1m',
      payMethod: 'STRIPE',
      operator: getOperator()
    };

    subscriptionMutation.mutate(paymentRequest);
  };

  const isPaygType = subscriptionData?.data?.subscription?.type === 'PAYG';

  return (
    <div className="bg-white gap-8 flex flex-col overflow-auto h-full pb-20">
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
          {lastTransactionData?.data?.transaction?.Operator === 'downgraded' && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
              <div className="size-5 rounded-full flex items-center justify-center flex-shrink-0">
                <Info className="text-orange-600" />
              </div>
              <div className="text-orange-600 text-sm leading-5">
                Please ensure resources remain within
                {lastTransactionData?.data?.transaction?.NewPlanName} plan limits by
                {new Date(
                  lastTransactionData?.data?.transaction?.StartAt || ''
                ).toLocaleDateString()}
                to avoid charges.
              </div>
            </div>
          )}

          <PlanHeader
            plans={plansData?.data?.plans}
            isLoading={plansLoading}
            subscription={subscriptionData?.data?.subscription}
            onSubscribe={handleSubscribe}
            isSubscribing={subscriptionMutation.isLoading}
            lastTransaction={lastTransactionData?.data?.transaction}
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

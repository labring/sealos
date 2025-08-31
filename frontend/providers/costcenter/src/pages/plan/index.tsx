import { Info } from 'lucide-react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { SubscriptionPlan, SubscriptionPayRequest } from '@/types/plan';
import useSessionStore from '@/stores/session';
import useBillingStore from '@/stores/billing';
import useEnvStore from '@/stores/env';
import {
  getPlanList,
  getSubscriptionInfo,
  getLastTransaction,
  createSubscriptionPayment
} from '@/api/plan';
import { AllPlansSection } from '@/components/plan/AllPlansSection';
import { PlanHeader } from '@/components/plan/PlanHeader';
import { BalanceSection } from '@/components/plan/BalanceSection';
import { getAccountBalance } from '@/api/account';
import request from '@/service/request';
import RechargeModal from '@/components/RechargeModal';
import TransferModal from '@/components/TransferModal';
import { useRef, useMemo, useEffect, useState } from 'react';
import jsyaml from 'js-yaml';
import { displayMoney, formatMoney } from '@/utils/format';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useRouter } from 'next/router';

export default function Plan() {
  const router = useRouter();
  const { session } = useSessionStore();
  const { getRegion, regionList } = useBillingStore();
  const transferEnabled = useEnvStore((state) => state.transferEnabled);
  const rechargeEnabled = useEnvStore((state) => state.rechargeEnabled);
  const stripePromise = useEnvStore((s) => s.stripePromise);
  const region = getRegion();
  const { toast } = useCustomToast();

  // Check if we're in create mode - use state to persist across re-renders
  const [isCreateMode, setIsCreateMode] = useState(false);

  useEffect(() => {
    // Method 1: Check router.query when ready
    if (router.isReady && router.query.mode === 'create') {
      setIsCreateMode(true);
      console.log('router.query method - createMode set to true', router.query);
      return;
    }

    // Method 2: Parse URL directly as fallback
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const createMode = urlParams.get('mode') === 'create';
      if (createMode) {
        setIsCreateMode(true);
        console.log('URL parsing method - createMode set to true', window.location.search);
        return;
      }
    }

    console.log(
      'router.query effect',
      router.query,
      'router.isReady',
      router.isReady,
      'window.location.search',
      typeof window !== 'undefined' ? window.location.search : 'N/A'
    );
  }, [router.isReady, router.query, router.asPath]);

  console.log('session', session, regionList, region, 'isCreateMode', isCreateMode);

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

  const handleSubscribe = async (
    plan: SubscriptionPlan | null,
    workspaceName?: string,
    isPayg?: boolean
  ) => {
    if (isCreateMode) {
      // Create mode: need workspace name
      if (!workspaceName?.trim()) {
        toast({
          title: 'Error',
          description: 'Please enter a workspace name',
          variant: 'destructive'
        });
        return;
      }

      if (isPayg) {
        // PAYG mode: only create workspace, no subscription needed
        const paymentRequest: SubscriptionPayRequest = {
          workspace: '', // Will be filled by API after workspace creation
          regionDomain: region?.domain || '',
          planName: 'Free', // No actual plan for PAYG
          period: '1m',
          payMethod: 'BALANCE',
          operator: 'created',
          createWorkspace: {
            teamName: workspaceName.trim(),
            userType: 'Payg'
          }
        };
        subscriptionMutation.mutate(paymentRequest);
      } else if (plan) {
        // Subscription mode: create workspace + subscription
        const paymentRequest: SubscriptionPayRequest = {
          workspace: '', // Will be filled by API after workspace creation
          regionDomain: region?.domain || '',
          planName: plan.Name,
          period: '1m',
          payMethod: 'STRIPE',
          operator: 'created',
          createWorkspace: {
            teamName: workspaceName.trim(),
            userType: 'Subscription'
          }
        };
        subscriptionMutation.mutate(paymentRequest);
      }
      return;
    }

    // Upgrade mode: existing logic
    if (!plan) {
      toast({
        title: 'Error',
        description: 'Plan is required for upgrade',
        variant: 'destructive'
      });
      return;
    }

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
              isCreateMode={isCreateMode}
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
            isCreateMode={isCreateMode}
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

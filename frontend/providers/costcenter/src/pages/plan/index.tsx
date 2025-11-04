import { Info } from 'lucide-react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { SubscriptionPlan, SubscriptionPayRequest } from '@/types/plan';
import useSessionStore from '@/stores/session';
import useBillingStore from '@/stores/billing';
import useEnvStore from '@/stores/env';
import usePlanStore from '@/stores/plan';
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
import CongratulationsModal from '@/components/CongratulationsModal';
import PlanConfirmationModal from '@/components/plan/PlanConfirmationModal';
import DowngradeModal from '@/components/plan/DowngradeModal';
import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import jsyaml from 'js-yaml';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useRouter } from 'next/router';
import { Skeleton } from '@sealos/shadcn-ui';
import { UpgradePlanDialog } from '@/components/plan/UpgradePlanDialog';

export default function Plan() {
  const router = useRouter();
  const { session } = useSessionStore();
  const { getRegion } = useBillingStore();
  const transferEnabled = useEnvStore((state) => state.transferEnabled);
  const rechargeEnabled = useEnvStore((state) => state.rechargeEnabled);
  const stripePromise = useEnvStore((s) => s.stripePromise);
  const region = getRegion();
  const { toast } = useCustomToast();

  // Performance impact is minimal, keeping it simple is also a good choice
  const {
    plansData,
    subscriptionData,
    lastTransactionData,
    setPlansData,
    setSubscriptionData,
    setLastTransactionData,
    isPaygType,
    pendingPlan,
    modalType,
    modalContext,
    hideModal,
    confirmPendingPlan
  } = usePlanStore();

  // Check if we're in create mode - use state to persist across re-renders
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [isUpgradeMode, setIsUpgradeMode] = useState(false);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [workspaceId, setWorkspaceId] = useState('');
  const [defaultSelectedPlan, setDefaultSelectedPlan] = useState<string>('');

  const handleSubscriptionModalOpenChange = useCallback(
    (open: boolean) => {
      setSubscriptionModalOpen(open);
      if (!open) {
        setIsCreateMode(false);
        setIsUpgradeMode(false);
      }
      // Clean up URL parameters after opening or closing the modal
      const url = new URL(window.location.href);
      url.searchParams.delete('mode');
      url.searchParams.delete('plan');
      router.replace(url.pathname + (url.search ? url.search : ''), undefined, {
        shallow: true
      });
    },
    [router]
  );

  // useEffect to handle the router query
  useEffect(() => {
    if (!router.isReady) return;

    console.log('router.query', router.query);

    // Navigate to the specified page
    if (router.query.page) {
      router.push(`/${router.query.page}`);
      return;
    }

    // Handle subscription modal modes
    if (router.query.mode === 'create') {
      setIsCreateMode(true);
      // Handle plan parameter for default selection
      if (router.query.plan) {
        setDefaultSelectedPlan(router.query.plan as string);
      }
      handleSubscriptionModalOpenChange(true);
      return;
    }

    if (router.query.mode === 'upgrade') {
      setIsUpgradeMode(true);
      handleSubscriptionModalOpenChange(true);
      return;
    }

    if (router.query.mode === 'topup') {
      // Add delay to ensure ref is ready
      setTimeout(() => {
        console.log('Trying to open recharge modal', rechargeRef.current);
        rechargeRef.current?.onOpen();
      }, 1000);
      return;
    }

    // Handle workspaceId parameter (set by desktop after workspace switch)
    if (router.query.workspaceId) {
      setWorkspaceId(router.query.workspaceId as string);
    }

    // Check for success state from Stripe callback (set by desktop)
    if (router.query.stripeState === 'success' && router.query.payId) {
      console.log('Setting showCongratulations to true');
      setShowCongratulations(true);
      return;
    }
  }, [router, handleSubscriptionModalOpenChange]);

  const queryClient = useQueryClient();
  const rechargeRef = useRef<any>();
  const transferRef = useRef<any>();

  // Get balance data
  const { data: balance_raw } = useQuery({
    queryKey: ['getAccount'],
    queryFn: getAccountBalance,
    staleTime: 0
  });

  // Fetch plans data and sync to store
  useQuery({
    queryKey: ['plan-list'],
    queryFn: getPlanList,
    onSuccess: (data) => {
      console.log('plansData', data.data);
      setPlansData(data.data || null);
    },
    refetchOnMount: true
  });

  // Get current workspace subscription info and sync to store
  const { isLoading, refetch: refetchSubscriptionInfo } = useQuery({
    queryKey: ['subscription-info', session?.user?.nsid, region?.uid],
    queryFn: () =>
      getSubscriptionInfo({
        workspace: session?.user?.nsid || '',
        regionDomain: region?.domain || ''
      }),
    enabled: !!(session?.user?.nsid && region?.uid),
    onSuccess: (data) => setSubscriptionData(data.data || null),
    refetchOnMount: true,
    retry: 5
  });

  // Get specific workspace subscription info for congratulations modal
  const { data: workspaceSubscriptionData } = useQuery({
    queryKey: ['workspace-subscription', workspaceId, region?.uid],
    queryFn: () =>
      getSubscriptionInfo({
        workspace: workspaceId || '',
        regionDomain: region?.domain || ''
      }),
    enabled: !!(workspaceId && region?.uid),
    refetchOnMount: true
  });

  // Get last transaction and sync to store
  const { data: userLastTransactionData } = useQuery({
    queryKey: ['last-transaction', session?.user?.nsid, region?.uid],
    queryFn: () =>
      getLastTransaction({
        workspace: session?.user?.nsid || '',
        regionDomain: region?.domain || ''
      }),
    enabled: !!(session?.user?.nsid && region?.uid),
    onSuccess: (data) => setLastTransactionData(data.data || null)
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

  // Subscription mutation
  const subscriptionMutation = useMutation({
    mutationFn: createSubscriptionPayment,
    onSuccess: async (data) => {
      if (data?.message && String(data?.message) === '10004') {
        return toast({
          title: 'Quota Reached',
          description:
            'Quota has reached the maximum. To avoid overage effects, please upgrade ahead of time or delete unnecessary resources.',
          variant: 'success'
        });
      }

      // Close any open modals first
      hideModal();
      // Refresh subscription data
      await queryClient.invalidateQueries({ queryKey: ['subscription-info'] });
      await queryClient.invalidateQueries({ queryKey: ['last-transaction'] });
      await refetchSubscriptionInfo();
      setTimeout(async () => {
        // Refresh subscription data with delay
        await queryClient.invalidateQueries({ queryKey: ['subscription-info'] });
        await queryClient.invalidateQueries({ queryKey: ['last-transaction'] });
        await refetchSubscriptionInfo();
      }, 5000);

      if (data.code === 200) {
        if (data.data?.redirectUrl) {
          window.parent.location.href = data.data.redirectUrl;
        } else if (data.data?.success === true) {
          if (isCreateMode) {
            toast({
              title: 'Workspace creation successful',
              description: 'Your workspace has been created successfully',
              variant: 'success'
            });
          } else {
            // Determine if it's an upgrade or downgrade based on the last transaction
            const isDowngrade = lastTransactionData?.transaction?.Operator === 'downgraded';
            toast({
              title: 'Payment Success',
              description: `Your subscription has been ${
                isDowngrade ? 'downgraded' : 'upgraded'
              } successfully`,
              variant: 'success'
            });
          }
        }
      }
      setSubscriptionModalOpen(false);
    },
    onError: (error: any) => {
      // Refresh subscription data on error as well
      queryClient.invalidateQueries({ queryKey: ['subscription-info'] });
      queryClient.invalidateQueries({ queryKey: ['last-transaction'] });
      if (error.code === 409) {
        toast({
          title: 'Workspace creation failed',
          description:
            'The new space has the same name as the existing space, please modify it and try again.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Payment Failed',
          description: error.message || 'Failed to process subscription payment',
          variant: 'destructive'
        });
      }
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
          payMethod: 'balance',
          operator: 'created',
          createWorkspace: {
            teamName: workspaceName.trim(),
            userType: 'payg'
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
          payMethod: 'stripe',
          operator: 'created',
          createWorkspace: {
            teamName: workspaceName.trim(),
            userType: 'subscription'
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
    const currentPlanObj = plansData?.plans?.find(
      (p) => p.Name === subscriptionData?.subscription?.PlanName
    );
    const getOperator = () => {
      if (!currentPlanObj) return 'created';
      if (currentPlanObj.UpgradePlanList?.includes(plan.Name)) return 'upgraded';
      if (currentPlanObj.DowngradePlanList?.includes(plan.Name)) return 'downgraded';
      return 'upgraded';
    };

    const paymentRequest: SubscriptionPayRequest = {
      workspace: session.user.nsid,
      regionDomain: region.domain,
      planName: plan.Name,
      period: '1m',
      payMethod: 'stripe',
      operator: getOperator()
    };

    subscriptionMutation.mutate(paymentRequest);
  };

  const isPaygTypeValue = isPaygType();

  if (isLoading) {
    return (
      <div className="bg-white gap-8 flex flex-col overflow-auto h-full pb-20 p-6">
        <div className="space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-4 p-6 border rounded-lg">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-8 w-16" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="flex gap-4">
              <Skeleton className="h-20 flex-1" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white gap-8 flex flex-col overflow-auto h-full pb-20">
      {isPaygTypeValue ? (
        <div className="flex gap-4">
          <div className="flex-2/3">
            <PlanHeader>
              {({ trigger }) => (
                <UpgradePlanDialog
                  onSubscribe={handleSubscribe}
                  isSubscribing={subscriptionMutation.isLoading}
                  isCreateMode={isCreateMode}
                  isUpgradeMode={isUpgradeMode}
                  isOpen={subscriptionModalOpen}
                  onOpenChange={handleSubscriptionModalOpenChange}
                  defaultSelectedPlan={defaultSelectedPlan}
                >
                  {trigger}
                </UpgradePlanDialog>
              )}
            </PlanHeader>
          </div>
          <div className="flex-1/3">
            <BalanceSection
              balance={balance}
              rechargeEnabled={rechargeEnabled}
              onTopUpClick={() => rechargeRef?.current?.onOpen()}
            />
          </div>
        </div>
      ) : (
        <>
          {lastTransactionData?.transaction?.Operator === 'downgraded' && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
              <div className="size-5 rounded-full flex items-center justify-center flex-shrink-0">
                <Info className="text-orange-600" />
              </div>
              <div className="text-orange-600 text-sm leading-5">
                Please ensure resources remain within
                {lastTransactionData?.transaction?.NewPlanName} plan limits by
                {new Date(lastTransactionData?.transaction?.StartAt || '').toLocaleDateString()}
                to avoid charges.
              </div>
            </div>
          )}

          <PlanHeader>
            {({ trigger }) => (
              <UpgradePlanDialog
                onSubscribe={handleSubscribe}
                isSubscribing={subscriptionMutation.isLoading}
                isCreateMode={isCreateMode}
                isUpgradeMode={isUpgradeMode}
                isOpen={subscriptionModalOpen}
                onOpenChange={handleSubscriptionModalOpenChange}
                defaultSelectedPlan={defaultSelectedPlan}
              >
                {trigger}
              </UpgradePlanDialog>
            )}
          </PlanHeader>

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

      <CongratulationsModal
        isOpen={showCongratulations}
        planName={workspaceSubscriptionData?.data?.subscription?.PlanName || 'Pro Plan'}
        maxResources={
          workspaceSubscriptionData?.data?.subscription?.PlanName
            ? JSON.parse(
                plansData?.plans?.find(
                  (p: SubscriptionPlan) =>
                    p.Name === workspaceSubscriptionData?.data?.subscription?.PlanName
                )?.MaxResources || '{}'
              )
            : undefined
        }
        traffic={
          plansData?.plans?.find(
            (p: SubscriptionPlan) =>
              p.Name === workspaceSubscriptionData?.data?.subscription?.PlanName
          )?.Traffic
        }
        onClose={() => {
          setShowCongratulations(false);
          setWorkspaceId('');
          // Clean up URL parameters after closing the modal
          const url = new URL(window.location.href);
          url.searchParams.delete('stripeState');
          url.searchParams.delete('payId');
          url.searchParams.delete('workspaceId');
          router.replace(url.pathname + (url.search ? url.search : ''), undefined, {
            shallow: true
          });
        }}
      />

      {/* Global Modal Instances */}
      <PlanConfirmationModal
        plan={pendingPlan || undefined}
        workspaceName={modalContext.workspaceName}
        isCreateMode={modalContext.isCreateMode || false}
        isOpen={modalType === 'confirmation'}
        onConfirm={() => {
          const plan = confirmPendingPlan();
          if (plan) {
            handleSubscribe(plan, modalContext.workspaceName, false);
          }
          hideModal();
        }}
        onCancel={() => {
          hideModal();
        }}
      />

      <DowngradeModal
        targetPlan={pendingPlan || undefined}
        isOpen={modalType === 'downgrade'}
        onConfirm={() => {
          const plan = confirmPendingPlan();
          if (plan) {
            handleSubscribe(plan, modalContext.workspaceName, false);
          }
          hideModal();
        }}
        onCancel={() => {
          hideModal();
        }}
      />
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

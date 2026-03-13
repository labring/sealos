import { Info } from 'lucide-react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
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
import { CardInfoSection } from '@/components/plan/CardInfoSection';
import { InvoicePaymentBanner } from '@/components/plan/InvoicePaymentBanner';
import { BeingCancelledBanner } from '@/components/plan/BeingCancelledBanner';
import { FreePlanExpiryBanner } from '@/components/plan/FreePlanExpiryBanner';
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
import { gtmSubscribeCheckout, gtmSubscribeSuccess } from '@/utils/gtm';
import { openInNewWindow } from '@/utils/windowUtils';

export default function Plan() {
  const router = useRouter();
  const { t } = useTranslation();
  const { session } = useSessionStore();
  const { getRegion } = useBillingStore();
  const transferEnabled = useEnvStore((state) => state.transferEnabled);
  const rechargeEnabled = useEnvStore((state) => state.rechargeEnabled);
  const subscriptionEnabled = useEnvStore((state) => state.subscriptionEnabled);
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
    showConfirmationModal,
    redeemCode,
    redeemCodeValidated,
    setRedeemCode,
    startPaymentWaiting,
    defaultSelectedPlan,
    defaultShowPaymentConfirmation,
    defaultWorkspaceName,
    setDefaultSelectedPlan,
    setDefaultShowPaymentConfirmation,
    setDefaultWorkspaceName,
    clearModalDefaults,
    clearRedeemCode,
    invoicePaymentUrl,
    setInvoicePaymentUrl
  } = usePlanStore();

  // Check if we're in create mode - use state to persist across re-renders
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [isUpgradeMode, setIsUpgradeMode] = useState(false);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [congratulationsMode, setCongratulationsMode] = useState<'upgrade' | 'renew'>('upgrade');
  const [congratulationsOverride, setCongratulationsOverride] = useState<{
    planName?: string;
    maxResources?: {
      cpu: string;
      memory: string;
      storage: string;
      nodeports: string;
    };
    traffic?: number;
  } | null>(null);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [workspaceId, setWorkspaceId] = useState('');
  // Track if Stripe success has been tracked to prevent duplicates
  const [hasTrackedStripeSuccess, setHasTrackedStripeSuccess] = useState(false);
  // Use ref to persist Stripe callback flag even after router.query is cleared
  const isStripeCallbackRef = useRef(false);

  const handleSubscriptionModalOpenChange = useCallback(
    (open: boolean) => {
      setSubscriptionModalOpen(open);
      if (!open) {
        setIsCreateMode(false);
        setIsUpgradeMode(false);
        // Clear all default values when closing the modal to prevent duplicate opening
        clearModalDefaults();
        clearRedeemCode();
      }
      // Clean up URL parameters after opening or closing the modal
      const url = new URL(window.location.href);
      url.searchParams.delete('mode');
      url.searchParams.delete('plan');
      url.searchParams.delete('showPaymentConfirmation');
      url.searchParams.delete('workspaceName');
      url.searchParams.delete('redeem');
      router.replace(url.pathname + (url.search ? url.search : ''), undefined, {
        shallow: true
      });
    },
    [router, clearModalDefaults, clearRedeemCode]
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
    if (router.query.mode === 'create' || router.query.mode === 'upgrade') {
      if (router.query.mode === 'create') setIsCreateMode(true);
      if (router.query.mode === 'upgrade') setIsUpgradeMode(true);

      // Handle plan parameter for default selection
      if (router.query.plan) {
        setDefaultSelectedPlan(router.query.plan as string);
      }

      // Handle workspaceName parameter for default workspace name
      if (router.query.workspaceName) {
        setDefaultWorkspaceName(router.query.workspaceName as string);
      }

      // Handle redeem code parameter
      if (router.query.redeem) {
        setRedeemCode(router.query.redeem as string);
      }

      if (router.query.showPaymentConfirmation === 'true') {
        setDefaultShowPaymentConfirmation(true);
      }

      handleSubscriptionModalOpenChange(true);

      // Clean up URL parameters after processing to prevent duplicate opening
      const url = new URL(window.location.href);
      url.searchParams.delete('mode');
      url.searchParams.delete('plan');
      url.searchParams.delete('showPaymentConfirmation');
      url.searchParams.delete('workspaceName');
      url.searchParams.delete('redeem');
      router.replace(url.pathname + (url.search ? url.search : ''), undefined, {
        shallow: true
      });

      return;
    }

    if (router.query.mode === 'topup') {
      // Add delay to ensure ref is ready
      setTimeout(() => {
        console.log('Trying to open recharge modal', rechargeRef.current);
        rechargeRef.current?.onOpen();
      }, 1000);
      // Clean up URL parameters after processing
      const url = new URL(window.location.href);
      url.searchParams.delete('mode');
      router.replace(url.pathname + (url.search ? url.search : ''), undefined, {
        shallow: true
      });
      return;
    }

    // Handle workspaceId parameter (set by desktop after workspace switch)
    if (router.query.workspaceId) {
      setWorkspaceId(router.query.workspaceId as string);
    }

    // Check for success state from Stripe callback (set by desktop)
    if (router.query.stripeState === 'success' && router.query.payId) {
      // Invalidate queries to refresh subscription data after payment success
      queryClient.invalidateQueries({ queryKey: ['subscription-info'] });
      queryClient.invalidateQueries({ queryKey: ['last-transaction'] });
      queryClient.invalidateQueries({ queryKey: ['upgrade-amount'] });
      queryClient.invalidateQueries({ queryKey: ['card-info'] });
      queryClient.invalidateQueries({ queryKey: ['payment-waiting-transaction'] });
      hideModal();
      // Close UpgradePlanDialog to prevent focus fighting
      setSubscriptionModalOpen(false);
      setCongratulationsMode('upgrade');
      setShowCongratulations(true);
      setHasTrackedStripeSuccess(false); // Reset to allow tracking for this payment
      isStripeCallbackRef.current = true; // Save flag, persists even if router.query is cleared
      return;
    }
  }, [
    router,
    handleSubscriptionModalOpenChange,
    setRedeemCode,
    hideModal,
    setDefaultSelectedPlan,
    setDefaultShowPaymentConfirmation,
    setDefaultWorkspaceName
  ]);

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
  const { isSuccess: isPlansLoaded } = useQuery({
    queryKey: ['plan-list'],
    queryFn: getPlanList,
    onSuccess: (data) => {
      console.log('plansData', data.data);
      setPlansData(data.data || null);
    },
    refetchOnMount: true
  });

  // Handle payment confirmation modal once router is ready and plans are loaded
  useEffect(() => {
    if (!router.isReady || !isPlansLoaded) return;

    if (defaultShowPaymentConfirmation && plansData?.plans && defaultSelectedPlan) {
      const targetPlan = plansData.plans.find((p) => p.Name === defaultSelectedPlan);

      if (targetPlan) {
        const workspaceName = isCreateMode ? defaultWorkspaceName : '';
        // Determine operator based on mode: create mode uses 'created', otherwise 'upgraded'
        const operator = isCreateMode ? 'created' : 'upgraded';
        const businessOperation = isCreateMode ? 'create' : 'upgrade';
        showConfirmationModal(targetPlan, {
          workspaceName,
          operator,
          businessOperation
        });
      }
    }
  }, [
    router.isReady,
    router.query,
    isPlansLoaded,
    plansData,
    showConfirmationModal,
    defaultShowPaymentConfirmation,
    defaultSelectedPlan,
    defaultWorkspaceName,
    isCreateMode
  ]);

  // Get current workspace subscription info and sync to store
  const { isLoading, refetch: refetchSubscriptionInfo } = useQuery({
    queryKey: ['subscription-info', session?.user?.nsid, region?.uid],
    queryFn: () =>
      getSubscriptionInfo({
        workspace: session?.user?.nsid || '',
        regionDomain: region?.domain || ''
      }),
    enabled: !!(session?.user?.nsid && region?.uid),
    onSuccess: (data) => {
      setSubscriptionData(data.data || null);
      // Check if InvoiceInfo has PaymentUrl
      const paymentUrl = data.data?.subscription?.InvoiceInfo?.PaymentUrl;
      setInvoicePaymentUrl(paymentUrl || null);
    },
    refetchOnMount: true,
    retry: 5
  });

  // Get specific workspace subscription info for congratulations modal
  const { data: workspaceSubscriptionData } = useQuery({
    queryKey: ['subscription-info', workspaceId, region?.uid],
    queryFn: () =>
      getSubscriptionInfo({
        workspace: workspaceId || '',
        regionDomain: region?.domain || ''
      }),
    enabled: !!(workspaceId && region?.uid),
    refetchOnMount: true
  });

  // Get last transaction for the workspace (for Stripe callback)
  const { data: workspaceLastTransactionData } = useQuery({
    queryKey: ['workspace-last-transaction', workspaceId, region?.uid],
    queryFn: () =>
      getLastTransaction({
        workspace: workspaceId || '',
        regionDomain: region?.domain || ''
      }),
    enabled: !!(workspaceId && region?.uid && router.query.stripeState === 'success'),
    refetchOnMount: true
  });

  // Track subscription success for Stripe payments when data is loaded
  useEffect(() => {
    // Use ref instead of router.query because router.query gets cleared
    if (
      isStripeCallbackRef.current &&
      workspaceSubscriptionData?.data?.subscription &&
      !hasTrackedStripeSuccess
    ) {
      console.log('[GTM] Triggering subscribe_success');

      const subscription = workspaceSubscriptionData.data.subscription;
      const plan = plansData?.plans?.find((p) => p.Name === subscription.PlanName);
      const monthlyPrice = plan?.Prices?.find((p) => p.BillingCycle === '1m')?.Price || 0;

      // Determine subscription type from transaction
      let subscriptionType: 'new' | 'upgrade' | 'downgrade' = 'new';
      if (workspaceLastTransactionData?.data?.transaction?.Operator) {
        const operator = workspaceLastTransactionData.data.transaction.Operator;
        subscriptionType =
          operator === 'created' ? 'new' : operator === 'downgraded' ? 'downgrade' : 'upgrade';
      }

      gtmSubscribeSuccess({
        amount: monthlyPrice,
        paid: monthlyPrice, // For Stripe payments, user pays full amount
        plan: subscription.PlanName,
        type: subscriptionType
      });

      setHasTrackedStripeSuccess(true);
      isStripeCallbackRef.current = false; // Clear the flag after tracking
    }
  }, [workspaceSubscriptionData, workspaceLastTransactionData, plansData, hasTrackedStripeSuccess]);

  // Get last transaction and sync to store
  useQuery({
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
    onSuccess: async (data, variables) => {
      if (data?.message && String(data?.message) === '10004') {
        return toast({
          title: 'Quota Reached',
          description:
            'Quota has reached the maximum. To avoid overage effects, please upgrade ahead of time or delete unnecessary resources.',
          variant: 'success'
        });
      }

      // Note: invalidate will be handled in handleModalClose when modal is closed
      // Only refetch immediately if needed for UI updates
      await refetchSubscriptionInfo();

      if (data.code === 200) {
        if (data.data?.redirectUrl) {
          if (variables.operator === 'upgraded') {
            const targetWorkspace = variables.workspace || session?.user?.nsid || '';
            const targetRegionDomain = variables.regionDomain || region?.domain || '';
            // Set invoice ID from response if available, otherwise don't set it
            const invoiceId = data.data?.invoiceID;
            startPaymentWaiting(
              targetWorkspace,
              targetRegionDomain,
              data.data.redirectUrl,
              invoiceId
            );
            // Note: openInNewWindow is now called synchronously in handleSubscribe
          } else {
            hideModal();
            window.parent.location.href = data.data.redirectUrl;
          }
        }
        // [TODO] upgrade mode is not needed anymore...
        else if (data.data?.success === true) {
          // Track subscription success for balance payments
          // Note: For Stripe payments, tracking happens after redirect
          const plan = plansData?.plans?.find((p) => p.Name === variables.planName);
          if (plan) {
            const monthlyPrice = plan.Prices?.find((p) => p.BillingCycle === '1m')?.Price || 0;
            const subscriptionType: 'new' | 'upgrade' | 'downgrade' =
              variables.operator === 'created'
                ? 'new'
                : variables.operator === 'downgraded'
                ? 'downgrade'
                : 'upgrade';

            gtmSubscribeSuccess({
              amount: monthlyPrice,
              paid: monthlyPrice,
              plan: plan.Name,
              type: subscriptionType
            });
          }

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
      // Note: invalidate will be handled in handleModalClose when modal is closed
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
    const promotionCode = redeemCodeValidated && redeemCode ? redeemCode : undefined;

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
        if (promotionCode) {
          paymentRequest.promotionCode = promotionCode;
        }
        subscriptionMutation.mutate(paymentRequest);
      } else if (plan) {
        // Subscription mode: create workspace + subscription
        const monthlyPrice = plan.Prices?.find((p) => p.BillingCycle === '1m')?.Price || 0;
        gtmSubscribeCheckout({
          amount: monthlyPrice,
          plan: plan.Name,
          type: 'new'
        });
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
        if (promotionCode) {
          paymentRequest.promotionCode = promotionCode;
        }
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
    const inDebt = subscriptionData?.subscription?.Status?.toLowerCase() === 'debt';
    const getOperator = () => {
      // If in debt state, always use 'created' operation
      if (inDebt) return 'created';
      if (!currentPlanObj) return 'created';
      if (currentPlanObj.UpgradePlanList?.includes(plan.Name)) return 'upgraded';
      if (currentPlanObj.DowngradePlanList?.includes(plan.Name)) return 'downgraded';
      return 'upgraded';
    };

    const operator = getOperator();
    const subscriptionType: 'new' | 'upgrade' | 'downgrade' =
      operator === 'created' ? 'new' : operator === 'downgraded' ? 'downgrade' : 'upgrade';

    const monthlyPrice = plan.Prices?.find((p) => p.BillingCycle === '1m')?.Price || 0;
    gtmSubscribeCheckout({
      amount: monthlyPrice,
      plan: plan.Name,
      type: subscriptionType
    });

    const paymentRequest: SubscriptionPayRequest = {
      workspace: session.user.nsid,
      regionDomain: region.domain,
      planName: plan.Name,
      period: '1m',
      payMethod: 'stripe',
      operator: operator
    };

    if (promotionCode) {
      paymentRequest.promotionCode = promotionCode;
    }

    // For upgrade mode, open window synchronously in user interaction, then navigate asynchronously
    if (operator === 'upgraded') {
      const paymentPromise = subscriptionMutation.mutateAsync(paymentRequest);
      openInNewWindow(
        paymentPromise.then((data) => {
          if (data?.code === 200 && data?.data?.redirectUrl) {
            return data.data.redirectUrl;
          }
          throw new Error('No redirect URL in response');
        }),
        true // show loading indicator
      );
    } else {
      subscriptionMutation.mutate(paymentRequest);
    }
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
            {invoicePaymentUrl && (
              <div className="mb-4">
                <InvoicePaymentBanner
                  paymentUrl={invoicePaymentUrl}
                  inDebt={subscriptionData?.subscription?.Status?.toLowerCase() === 'debt'}
                />
              </div>
            )}
            {subscriptionData?.subscription?.CancelAtPeriodEnd &&
              subscriptionData?.subscription?.PlanName?.toLowerCase() !== 'free' &&
              subscriptionData?.subscription?.CurrentPeriodEndAt && (
                <div className="mb-4">
                  <BeingCancelledBanner
                    currentPeriodEndAt={subscriptionData.subscription.CurrentPeriodEndAt}
                  />
                </div>
              )}
            {subscriptionData?.subscription?.PlanName?.toLowerCase() === 'free' &&
              subscriptionData?.subscription?.CurrentPeriodEndAt && (
                <div className="mb-4">
                  <FreePlanExpiryBanner
                    currentPeriodEndAt={subscriptionData.subscription.CurrentPeriodEndAt}
                  />
                </div>
              )}
            <PlanHeader
              onRenewSuccess={() => {
                setWorkspaceId(session?.user?.nsid || '');
                setCongratulationsMode('renew');
                setShowCongratulations(true);
              }}
            >
              {({ trigger }) => (
                <UpgradePlanDialog
                  onSubscribe={handleSubscribe}
                  isSubscribing={subscriptionMutation.isLoading}
                  isCreateMode={isCreateMode}
                  isUpgradeMode={isUpgradeMode}
                  isOpen={subscriptionModalOpen}
                  onOpenChange={handleSubscriptionModalOpenChange}
                  defaultSelectedPlan={defaultSelectedPlan}
                  defaultWorkspaceName={defaultWorkspaceName}
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
              subscriptionEnabled={subscriptionEnabled}
              onTopUpClick={() => rechargeRef?.current?.onOpen()}
            />
          </div>
        </div>
      ) : (
        <>
          {lastTransactionData?.transaction?.Operator === 'downgraded' &&
            lastTransactionData?.transaction?.Status === 'pending' && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
                <div className="size-5 rounded-full flex items-center justify-center flex-shrink-0">
                  <Info className="text-orange-600" />
                </div>
                <div className="text-orange-600 text-sm leading-5">
                  {t('common:downgrade_warning_message', {
                    planName: lastTransactionData?.transaction?.NewPlanName,
                    date: new Date(
                      lastTransactionData?.transaction?.StartAt || ''
                    ).toLocaleDateString()
                  })}
                </div>
              </div>
            )}

          {invoicePaymentUrl && (
            <InvoicePaymentBanner
              paymentUrl={invoicePaymentUrl}
              inDebt={subscriptionData?.subscription?.Status?.toLowerCase() === 'debt'}
            />
          )}
          {subscriptionData?.subscription?.CancelAtPeriodEnd &&
            subscriptionData?.subscription?.PlanName?.toLowerCase() !== 'free' &&
            subscriptionData?.subscription?.CurrentPeriodEndAt && (
              <BeingCancelledBanner
                currentPeriodEndAt={subscriptionData.subscription.CurrentPeriodEndAt}
              />
            )}
          {subscriptionData?.subscription?.PlanName?.toLowerCase() === 'free' &&
            subscriptionData?.subscription?.CurrentPeriodEndAt && (
              <FreePlanExpiryBanner
                currentPeriodEndAt={subscriptionData.subscription.CurrentPeriodEndAt}
              />
            )}

          <PlanHeader
            onRenewSuccess={() => {
              setWorkspaceId(session?.user?.nsid || '');
              setCongratulationsMode('renew');
              setShowCongratulations(true);
            }}
          >
            {({ trigger }) => (
              <UpgradePlanDialog
                onSubscribe={handleSubscribe}
                isSubscribing={subscriptionMutation.isLoading}
                isCreateMode={isCreateMode}
                isUpgradeMode={isUpgradeMode}
                isOpen={subscriptionModalOpen}
                onOpenChange={handleSubscriptionModalOpenChange}
                defaultSelectedPlan={defaultSelectedPlan}
                defaultWorkspaceName={defaultWorkspaceName}
              >
                {trigger}
              </UpgradePlanDialog>
            )}
          </PlanHeader>

          <BalanceSection
            balance={balance}
            rechargeEnabled={rechargeEnabled}
            subscriptionEnabled={subscriptionEnabled}
            onTopUpClick={() => rechargeRef?.current!.onOpen()}
          />
        </>
      )}

      <CardInfoSection workspace={session?.user?.nsid} regionDomain={region?.domain} />

      <AllPlansSection
        onRenewSuccess={(payload) => {
          setCongratulationsOverride(payload);
          setCongratulationsMode('renew');
          setShowCongratulations(true);
        }}
      />
      {/* Modals */}
      {rechargeEnabled && (
        <RechargeModal
          ref={rechargeRef}
          balance={balance}
          stripePromise={stripePromise}
          request={request}
          onPaySuccess={async () => {
            // Note: invalidate will be handled when modal closes
            // Wait a bit for payment to be processed
            await new Promise((s) => setTimeout(s, 2000));
          }}
        />
      )}

      {transferEnabled && (
        <TransferModal
          ref={transferRef}
          balance={balance}
          onTransferSuccess={async () => {
            // Note: invalidate will be handled when modal closes
            // Wait a bit for transfer to be processed
            await new Promise((s) => setTimeout(s, 2000));
          }}
          k8s_username={k8s_username}
        />
      )}

      <CongratulationsModal
        isOpen={showCongratulations}
        mode={congratulationsMode}
        planName={
          congratulationsOverride?.planName ||
          workspaceSubscriptionData?.data?.subscription?.PlanName ||
          'Pro Plan'
        }
        maxResources={
          congratulationsOverride?.maxResources ||
          (workspaceSubscriptionData?.data?.subscription?.PlanName
            ? JSON.parse(
                plansData?.plans?.find(
                  (p: SubscriptionPlan) =>
                    p.Name === workspaceSubscriptionData?.data?.subscription?.PlanName
                )?.MaxResources || '{}'
              )
            : undefined)
        }
        traffic={
          congratulationsOverride?.traffic ||
          plansData?.plans?.find(
            (p: SubscriptionPlan) =>
              p.Name === workspaceSubscriptionData?.data?.subscription?.PlanName
          )?.Traffic
        }
        onClose={() => {
          setShowCongratulations(false);
          setWorkspaceId('');
          setCongratulationsOverride(null);
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
        isOpen={modalType === 'confirmation'}
        isSubmitting={subscriptionMutation.isLoading}
        isRenew={modalContext.businessOperation === 'renew'}
        onConfirm={() => {
          if (pendingPlan) {
            handleSubscribe(pendingPlan, modalContext.workspaceName, false);
          }
          // Not hiding the modal as we need to query payment state.
        }}
        onCancel={() => {
          hideModal();
          // Clear all default values when closing the modal to prevent duplicate opening
          clearModalDefaults();
          clearRedeemCode();
        }}
        onPaymentSuccess={async () => {
          // Invalidate queries to refresh subscription data after payment success
          queryClient.invalidateQueries({ queryKey: ['subscription-info'] });
          queryClient.invalidateQueries({ queryKey: ['last-transaction'] });
          queryClient.invalidateQueries({ queryKey: ['upgrade-amount'] });
          queryClient.invalidateQueries({ queryKey: ['card-info'] });
          queryClient.invalidateQueries({ queryKey: ['payment-waiting-transaction'] });
          // Close all modals before showing congratulations modal
          hideModal();
          // Close UpgradePlanDialog to prevent focus fighting
          setSubscriptionModalOpen(false);
          // Show congratulations modal
          if (pendingPlan) {
            // Set workspace ID for congratulations modal
            const targetWorkspace = session?.user?.nsid || '';
            setWorkspaceId(targetWorkspace);
            setCongratulationsMode('upgrade');
            setShowCongratulations(true);
          }
        }}
      />

      <DowngradeModal
        targetPlan={pendingPlan || undefined}
        isOpen={modalType === 'downgrade'}
        onConfirm={() => {
          if (pendingPlan) {
            handleSubscribe(pendingPlan, modalContext.workspaceName, false);
          }
          hideModal();
        }}
        onCancel={() => {
          hideModal();
          // Clear all default values when closing the modal to prevent duplicate opening
          clearModalDefaults();
          clearRedeemCode();
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

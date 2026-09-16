import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trend as OverviewTrend } from '@/components/cost_overview/trend';
import { TrendBar as TrendOverviewBar } from '@/components/cost_overview/trendBar';
import useSessionStore from '@/stores/session';
import useBillingStore from '@/stores/billing';
import { useClientAppConfig } from '@/hooks/useClientAppConfig';
import { loadStripe } from '@stripe/stripe-js';
import { BalanceSection } from '@/components/plan/BalanceSection';
import { getAccountBalance, getAccountSummary } from '@/api/account';
import request from '@/service/request';
import RechargeModal from '@/components/RechargeModal';
import TransferModal from '@/components/TransferModal';
import { useRef, useMemo, useEffect } from 'react';
import jsyaml from 'js-yaml';
import { useRouter } from 'next/router';
import { RechargeExpenditureSection } from '@/components/plan/RechargeExpenditureSection';

export default function Cost() {
  const router = useRouter();
  const config = useClientAppConfig();
  const stripePromise = useMemo(
    () => loadStripe(config.recharge.payMethods.stripe.publicKey),
    [config.recharge.payMethods.stripe.publicKey]
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

    if (router.query.mode === 'topup') {
      // Add delay to ensure ref is ready
      setTimeout(() => {
        console.log('Trying to open recharge modal', rechargeRef.current);
        rechargeRef.current?.onOpen();
      }, 1000);
      return;
    }
  }, [router]);

  const queryClient = useQueryClient();
  const rechargeRef = useRef<any>();
  const transferRef = useRef<any>();

  // Get balance data
  const accountQuery = useQuery({
    queryKey: ['getAccount'],
    queryFn: getAccountBalance,
    staleTime: 0
  });

  // Calculate balance
  const {
    recharge: rechargeAmount,
    expenditure: expenditureAmount,
    balance
  } = getAccountSummary(accountQuery.data?.data);
  const accountUnavailable = accountQuery.isError || (!accountQuery.isLoading && balance === null);

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

  return (
    <div className="bg-white gap-8 flex flex-col overflow-auto h-full pb-20">
      <div className="flex gap-4">
        <div className="flex-1">
          <BalanceSection
            balance={balance}
            isError={accountUnavailable}
            isLoading={accountQuery.isLoading}
            rechargeEnabled={config.recharge.enabled}
            subscriptionEnabled={config.features.subscriptionEnabled}
            onTopUpClick={() => rechargeRef?.current?.onOpen()}
            onRetry={() => void accountQuery.refetch()}
          />
        </div>

        <RechargeExpenditureSection
          expenditure={expenditureAmount}
          isLoading={accountQuery.isLoading}
          recharge={rechargeAmount}
        />
      </div>

      <div className="flex flex-col gap-4 overflow-auto">
        <OverviewTrend />
        <TrendOverviewBar />
      </div>

      {/* Modals */}
      {config.recharge.enabled && (
        <RechargeModal
          ref={rechargeRef}
          balance={balance ?? 0}
          stripePromise={stripePromise}
          request={request}
          onPaySuccess={async () => {
            await new Promise((s) => setTimeout(s, 2000));
            await queryClient.invalidateQueries({ queryKey: ['billing'] });
            await queryClient.invalidateQueries({ queryKey: ['getAccount'] });
          }}
        />
      )}

      {config.features.transferEnabled && (
        <TransferModal
          ref={transferRef}
          balance={balance ?? 0}
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

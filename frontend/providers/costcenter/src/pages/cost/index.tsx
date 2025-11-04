import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trend as OverviewTrend } from '@/components/cost_overview/trend';
import { TrendBar as TrendOverviewBar } from '@/components/cost_overview/trendBar';
import useSessionStore from '@/stores/session';
import useBillingStore from '@/stores/billing';
import useEnvStore from '@/stores/env';
import { BalanceSection } from '@/components/plan/BalanceSection';
import { getAccountBalance } from '@/api/account';
import request from '@/service/request';
import RechargeModal from '@/components/RechargeModal';
import TransferModal from '@/components/TransferModal';
import { useRef, useMemo, useEffect } from 'react';
import jsyaml from 'js-yaml';
import { useRouter } from 'next/router';
import { RechargeExpenditureSection } from '@/components/plan/RechargeExpenditureSection';

export default function Cost() {
  const router = useRouter();
  const transferEnabled = useEnvStore((state) => state.transferEnabled);
  const rechargeEnabled = useEnvStore((state) => state.rechargeEnabled);
  const stripePromise = useEnvStore((s) => s.stripePromise);

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
  const { data: balance_raw } = useQuery({
    queryKey: ['getAccount'],
    queryFn: getAccountBalance,
    staleTime: 0
  });

  // Calculate balance
  let rechargeAmount = balance_raw?.data?.balance || 0;
  let expenditureAmount = balance_raw?.data?.deductionBalance || 0;
  let balance = rechargeAmount - expenditureAmount;

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
            rechargeEnabled={rechargeEnabled}
            onTopUpClick={() => rechargeRef?.current?.onOpen()}
          />
        </div>

        <RechargeExpenditureSection recharge={rechargeAmount} expenditure={expenditureAmount} />
      </div>

      <div className="flex flex-col gap-4 overflow-auto">
        <OverviewTrend />
        <TrendOverviewBar />
      </div>

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

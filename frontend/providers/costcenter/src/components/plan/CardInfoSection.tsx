import { Button } from '@sealos/shadcn-ui';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getCardInfo, createCardManageSession } from '@/api/plan';
import { useTranslation } from 'next-i18next';
import { useCustomToast } from '@/hooks/useCustomToast';
import useSessionStore from '@/stores/session';
import useBillingStore from '@/stores/billing';
import { BankCardIcon } from '../BankCardIcon';
import { BankCardBrand } from '../BankCardBrand';
import { openInNewWindow } from '@/utils/windowUtils';

interface CardInfoSectionProps {
  workspace?: string;
  regionDomain?: string;
}

export function CardInfoSection({ workspace, regionDomain }: CardInfoSectionProps) {
  const { t } = useTranslation();
  const { toast } = useCustomToast();
  const { session } = useSessionStore();
  const { getRegion } = useBillingStore();
  const region = getRegion();

  const effectiveWorkspace = workspace || session?.user?.nsid || '';
  const effectiveRegionDomain = regionDomain || region?.domain || '';

  // Query card info
  const { data: cardInfoData, isLoading: cardInfoLoading } = useQuery({
    queryKey: ['card-info', effectiveWorkspace, effectiveRegionDomain],
    queryFn: () =>
      getCardInfo({
        workspace: effectiveWorkspace,
        regionDomain: effectiveRegionDomain
      }),
    enabled: !!effectiveWorkspace && !!effectiveRegionDomain,
    refetchOnMount: true
  });

  // Mutation for creating card management session
  const manageCardMutation = useMutation({
    mutationFn: createCardManageSession,
    onSuccess: (data) => {
      if (data?.data?.success && data?.data?.url) {
        // Note: openInNewWindow is now called synchronously in handleManageCards
      } else {
        toast({
          title: t('common:error'),
          description: t('common:failed_to_create_portal_session'),
          status: 'error'
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: t('common:error'),
        description: error?.response?.data?.message || t('common:failed_to_create_portal_session'),
        status: 'error'
      });
    }
  });

  const handleManageCards = () => {
    if (!effectiveWorkspace || !effectiveRegionDomain) {
      toast({
        title: t('common:error'),
        description: t('common:missing_workspace_or_region'),
        status: 'error'
      });
      return;
    }

    // Open window synchronously in user interaction, then navigate asynchronously
    const cardSessionPromise = manageCardMutation.mutateAsync({
      workspace: effectiveWorkspace,
      regionDomain: effectiveRegionDomain,
      // Return to cost center is enough
      redirectUrl: 'https://' + effectiveRegionDomain + '/?openapp=system-costcenter'
    });

    openInNewWindow(
      cardSessionPromise.then((data) => {
        if (data?.data?.success && data?.data?.url) {
          return data.data.url;
        }
        throw new Error('Failed to create portal session');
      }),
      true // show loading indicator
    );
  };

  const paymentMethod = cardInfoData?.data?.payment_method;
  const hasCard = !!paymentMethod;

  const formatExpiryDate = (month: number, year: number) => {
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

  if (!effectiveWorkspace || !effectiveRegionDomain) {
    return null;
  }

  // Hide section if no card and not loading
  if (!cardInfoLoading && !hasCard) {
    return null;
  }

  return (
    <div className="p-2 border rounded-2xl">
      <div className="bg-plan-payg flex justify-between items-center rounded-xl px-3 py-3 gap-6">
        <div className="flex items-center gap-3 flex-1">
          {cardInfoLoading ? (
            <>
              <div className="h-9 w-14 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
            </>
          ) : hasCard ? (
            <>
              <BankCardIcon brand={paymentMethod.card.brand} className="h-9 w-14 shrink-0" />
              <BankCardBrand
                brand={paymentMethod.card.brand}
                className="text-sm font-medium text-zinc-900"
              />
              <span className="text-sm font-medium text-zinc-900">
                •••• {paymentMethod.card.last4}
              </span>
              <span className="text-xs text-zinc-500">
                {t('common:expires')}:{' '}
                {formatExpiryDate(paymentMethod.card.exp_month, paymentMethod.card.exp_year)}
              </span>
              <div className="h-3 w-px bg-zinc-200" />
            </>
          ) : null}
        </div>

        {hasCard && (
          <Button
            variant="outline"
            onClick={handleManageCards}
            disabled={manageCardMutation.isLoading}
            className="h-10"
          >
            {manageCardMutation.isLoading ? t('common:loading') : t('common:manage_card_info')}
          </Button>
        )}
      </div>
    </div>
  );
}

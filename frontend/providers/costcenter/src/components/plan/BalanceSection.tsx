import { Button, Skeleton, Tooltip, TooltipTrigger, TooltipContent } from '@sealos/shadcn-ui';
import { displayMoney, formatMoney } from '@/utils/format';
import GiftCode from '@/components/cost_overview/components/GiftCode';
import { useTranslation } from 'next-i18next';
import CurrencySymbol from '../CurrencySymbol';
import { HelpCircle, RefreshCw } from 'lucide-react';

interface BalanceSectionProps {
  balance: number | null;
  isError?: boolean;
  isLoading?: boolean;
  rechargeEnabled: boolean;
  subscriptionEnabled?: boolean;
  onTopUpClick: () => void;
  onRetry?: () => void;
}

export function BalanceSection({
  balance,
  isError = false,
  isLoading = false,
  rechargeEnabled,
  subscriptionEnabled = false,
  onTopUpClick,
  onRetry
}: BalanceSectionProps) {
  const { t } = useTranslation();
  const errorLabel = `${t('common:error')}: ${t('common:balance')}`;

  return (
    <div className="p-2 border rounded-2xl">
      <div className="bg-plan-payg flex justify-between items-center rounded-xl px-6 py-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-slate-500">{t('common:balance')}</span>
            {subscriptionEnabled && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="inline-flex items-center">
                    <HelpCircle size={14} className="text-slate-400 hover:text-slate-600" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-sm">{t('common:balance_subscription_tooltip')}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          {isLoading ? (
            <Skeleton aria-label={t('common:balance')} className="h-7 w-32" />
          ) : isError || balance === null ? (
            <div className="flex h-7 items-center gap-2" role="status" aria-label={errorLabel}>
              <span className="text-foreground text-2xl font-semibold leading-none">--</span>
              {onRetry && (
                <Button
                  aria-label={errorLabel}
                  className="size-7"
                  size="icon"
                  title={errorLabel}
                  variant="ghost"
                  onClick={onRetry}
                >
                  <RefreshCw className="size-4" />
                </Button>
              )}
            </div>
          ) : (
            <span className="text-foreground text-2xl font-semibold leading-none">
              <CurrencySymbol className="size-5" />
              <span>{displayMoney(formatMoney(balance))}</span>
            </span>
          )}
        </div>

        <div className="flex gap-4 items-center">
          <GiftCode />
          {rechargeEnabled && (
            <Button
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                onTopUpClick();
              }}
            >
              {t('common:top_up')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

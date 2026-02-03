import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { Alert, AlertDescription, cn } from '@sealos/shadcn-ui';
import { Button } from '@sealos/shadcn-ui';
import { openInNewWindow } from '@/utils/windowUtils';

interface InvoicePaymentBannerProps {
  paymentUrl: string;
  inDebt: boolean;
}

export function InvoicePaymentBanner({ paymentUrl, inDebt }: InvoicePaymentBannerProps) {
  const { t } = useTranslation();

  const handlePaymentClick = () => {
    openInNewWindow(paymentUrl);
  };

  return (
    <Alert
      className={cn(
        ' items-baseline rounded-xl',
        inDebt ? 'bg-red-50 border-red-400' : 'bg-orange-50 border-orange-400'
      )}
    >
      <AlertDescription className={cn('flex items-center gap-2')}>
        <AlertCircle className={cn('size-5', inDebt ? 'text-red-600' : 'text-orange-600')} />
        <span className={cn('w-full', inDebt ? 'text-red-600' : 'text-orange-600')}>
          {t('common:invoice_payment_message')}
        </span>
        <Button
          onClick={handlePaymentClick}
          className={cn(
            'text-white flex-shrink-0',
            inDebt ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'
          )}
          size="sm"
        >
          {t('common:go_to_payment')}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

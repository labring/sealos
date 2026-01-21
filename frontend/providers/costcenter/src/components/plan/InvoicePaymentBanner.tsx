import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { Alert, AlertDescription } from '@sealos/shadcn-ui';
import { Button } from '@sealos/shadcn-ui';
import { openInNewWindow } from '@/utils/windowUtils';

interface InvoicePaymentBannerProps {
  paymentUrl: string;
}

export function InvoicePaymentBanner({ paymentUrl }: InvoicePaymentBannerProps) {
  const { t } = useTranslation();

  const handlePaymentClick = () => {
    openInNewWindow(paymentUrl);
  };

  return (
    <Alert className="bg-orange-50 border-orange-200 items-baseline rounded-xl">
      <AlertDescription className="flex items-center gap-2">
        <AlertCircle className="size-5 text-orange-600" />
        <span className="text-orange-600 w-full">{t('common:invoice_payment_message')}</span>
        <Button
          onClick={handlePaymentClick}
          className="bg-orange-600 text-white hover:bg-orange-700 flex-shrink-0"
          size="sm"
        >
          {t('common:go_to_payment')}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

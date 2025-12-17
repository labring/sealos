import { cn } from '@sealos/shadcn-ui';
import { Button } from '@sealos/shadcn-ui/button';
import { Separator } from '@sealos/shadcn-ui/separator';
import { useTranslation } from 'next-i18next';
import { formatMoney } from '@/utils/format';
import { ArrowLeft } from 'lucide-react';

export interface InvoiceInspectionData {
  invoiceType: string;
  invoiceTitle: string;
  taxId: string;
  bankName: string;
  bankAccount: string;
  address: string;
  phone: string;
  fax: string;
  contactPerson: string;
  email: string;
  mobileNumber: string;
}

interface InvoiceInspectionViewProps {
  invoiceAmount: number;
  invoiceData: InvoiceInspectionData;
  onBack?: () => void;
}

export const InvoiceInspectionView = ({
  invoiceAmount,
  invoiceData,
  onBack
}: InvoiceInspectionViewProps) => {
  const { t } = useTranslation();

  const typeList = [
    {
      label: t('common:orders.details.type.list.normal'),
      value: 'normal'
    },
    {
      label: t('common:orders.details.type.list.special'),
      value: 'special'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Page Header with Back Button */}
      <div className="flex items-center justify-between p-3 mb-4">
        <Button type="button" variant="ghost" onClick={onBack} className="hover:bg-gray-100">
          <div className="flex items-center gap-3">
            {onBack && <ArrowLeft size={20} className="size-5" />}
            <h1 className="text-xl font-semibold">{t('common:createinvoice.title')}</h1>
          </div>
        </Button>
        <div className="flex items-center gap-3">
          <div className="text-blue-600 rounded-lg text-sm font-medium">
            {t('common:orders.invoice_details')}
          </div>
        </div>
      </div>

      {/* Invoice Details Section */}
      <section className="flex flex-col border rounded-2xl mb-4 shadow-sm">
        <div className="border-b text-base font-medium p-6 flex items-center justify-between">
          <span>{t('common:orders.invoice_details')}</span>
          <span className="text-sm font-normal">
            {t('common:orders.invoice_amount')}:
            <span className="text-blue-600">￥ {formatMoney(invoiceAmount)}</span>
          </span>
        </div>
        <div
          className={cn(
            'px-8 py-6 grid grid-cols-2 gap-y-4 gap-x-6',
            '[&>div]:flex [&>div]:flex-col [&>div]:gap-2',
            '[&>div>span:first-child]:text-sm [&>div>span:first-child]:font-medium [&>div>span:first-child]:text-gray-600',
            '[&>div>span:last-child]:text-base [&>div>span:last-child]:text-gray-900'
          )}
        >
          <div>
            <span>{t('common:orders.invoice_items')}</span>
            <span>{t('common:orders.electronic_computer_service_fee')}</span>
          </div>
          <div>
            <span>{t('common:orders.invoice_type')}</span>
            <span>
              {typeList.find((type) => type.value === invoiceData.invoiceType)?.label ||
                invoiceData.invoiceType}
            </span>
          </div>
          <div>
            <span>{t('common:orders.invoice_title')}</span>
            <span>{invoiceData.invoiceTitle || '-'}</span>
          </div>
          <div>
            <span>{t('common:orders.tax_id')}</span>
            <span>{invoiceData.taxId || '-'}</span>
          </div>
          <div>
            <span>{t('common:orders.bank_name')}</span>
            <span>{invoiceData.bankName || '-'}</span>
          </div>
          <div>
            <span>{t('common:orders.bank_account')}</span>
            <span>{invoiceData.bankAccount || '-'}</span>
          </div>
          <div>
            <span>{t('common:orders.address')}</span>
            <span>{invoiceData.address || '-'}</span>
          </div>
          <div>
            <span>{t('common:orders.tel')}</span>
            <span>{invoiceData.phone || '-'}</span>
          </div>
          <div>
            <span>{t('common:orders.fax')}</span>
            <span>{invoiceData.fax || '-'}</span>
          </div>
        </div>
      </section>

      {/* Contact Information Section */}
      <section className="flex flex-col border rounded-2xl shadow-sm">
        <div className="border-b text-base font-medium p-6">
          {t('common:orders.contact_information')}
        </div>
        <div
          className={cn(
            'px-8 py-6 grid grid-cols-2 gap-y-4 gap-x-6',
            '[&>div]:flex [&>div]:flex-col [&>div]:gap-2',
            '[&>div>span:first-child]:text-sm [&>div>span:first-child]:font-medium [&>div>span:first-child]:text-gray-600',
            '[&>div>span:last-child]:text-base [&>div>span:last-child]:text-gray-900'
          )}
        >
          <div>
            <span>{t('common:orders.contact_person')}</span>
            <span>{invoiceData.contactPerson || '-'}</span>
          </div>
          <div>
            <span>{t('common:orders.notification_email')}</span>
            <span>{invoiceData.email || '-'}</span>
          </div>
          <Separator className="col-span-2 border-dashed bg-transparent border-b-1"></Separator>
          <div>
            <span>{t('common:orders.mobile_number')}</span>
            <span>{invoiceData.mobileNumber || '-'}</span>
          </div>
        </div>
      </section>
    </div>
  );
};

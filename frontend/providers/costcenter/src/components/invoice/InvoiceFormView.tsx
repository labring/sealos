import { cn } from '@sealos/shadcn-ui';
import { Input } from '@sealos/shadcn-ui/input';
import { Button } from '@sealos/shadcn-ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sealos/shadcn-ui';
import { Separator } from '@sealos/shadcn-ui/separator';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '@/utils/format';
import { ArrowLeft } from 'lucide-react';

export interface InvoiceFormData {
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
  verificationCode: string;
}

interface InvoiceFormViewProps {
  invoiceAmount: number;
  invoiceCount: number;
  formData: InvoiceFormData;
  errors: { [key: string]: string };
  remainTime: number;
  isSubmitting?: boolean;
  onFieldChange: (field: keyof InvoiceFormData, value: string) => void;
  onFieldBlur: (field: keyof InvoiceFormData, value: string) => void;
  onGetVerificationCode: () => void;
  onSubmit: () => void;
  onBack?: () => void;
}

const InvoiceFormView = ({
  invoiceAmount,
  invoiceCount,
  formData,
  errors,
  remainTime,
  isSubmitting = false,
  onFieldChange,
  onFieldBlur,
  onGetVerificationCode,
  onSubmit,
  onBack
}: InvoiceFormViewProps) => {
  const { t } = useTranslation();

  const typeList = [
    {
      label: t('orders.details.type.list.normal'),
      value: 'normal'
    },
    {
      label: t('orders.details.type.list.special'),
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
            <h1 className="text-xl font-semibold">{t('SideBar.CreateInvoice')}</h1>
          </div>
        </Button>
        <div className="flex items-center gap-3">
          <div className="text-blue-600 rounded-lg text-sm font-medium">
            {t('orders.Apply Inovice Tips')}
          </div>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || invoiceCount === 0}
            className="min-w-[120px]"
          >
            {isSubmitting
              ? t('orders.submitting')
              : `${t('orders.Apply Invoice')} ${invoiceCount > 0 ? `(${invoiceCount})` : ''}`}
          </Button>
        </div>
      </div>

      {/* Invoice Details Section */}
      <section className="flex flex-col border rounded-2xl mb-4 shadow-sm">
        <div className="border-b text-base font-medium p-6 flex items-center justify-between">
          <span>Invoice Details</span>
          <span className="text-sm font-normal">
            {t('orders.invoiceAmount')}:{' '}
            <span className="text-blue-600">￥ {formatMoney(invoiceAmount)}</span>
          </span>
        </div>
        <div
          className={cn(
            'px-8 py-6 grid grid-cols-2 gap-y-3 gap-x-6',
            '[&>label]:text-sm [&>label]:font-medium [&>label]:flex [&>label]:items-start',
            '[&>label>:first-child]:w-[15ch] [&>label>:first-child]:leading-[2.5rem]',
            '[&>label_input]:h-10 [&>label>:nth-child(2)]:flex-1',
            '[&>label:has(input[aria-invalid=true])_p]:text-destructive',
            '[&>label:not(:has(input[aria-invalid=true]))_p]:pointer-events-none [&>label:not(:has(input[aria-invalid=true]))_p]:opacity-0'
          )}
        >
          <label>
            <span>Invoice Items</span>
            <span className="font-normal text-zinc-600 leading-[2.5rem]">
              {t('orders.Electronic Computer Service Fee')}
            </span>
          </label>
          <label>
            <span>Invoice Type</span>
            <div>
              <Select
                value={formData.invoiceType}
                onValueChange={(value) => {
                  onFieldChange('invoiceType', value);
                  onFieldBlur('invoiceType', value);
                }}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeList.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p>{errors.invoiceType || 'No error'}</p>
            </div>
          </label>
          <label>
            <span>Invoice Title</span>
            <div>
              <Input
                type="text"
                value={formData.invoiceTitle}
                onChange={(e) => onFieldChange('invoiceTitle', e.target.value)}
                onBlur={(e) => onFieldBlur('invoiceTitle', e.target.value)}
                placeholder={t('orders.details.invoiceTitle.placeholder')}
                aria-invalid={!!errors.invoiceTitle}
              />
              <p>{errors.invoiceTitle || 'No error'}</p>
            </div>
          </label>
          <label>
            <span>Tax ID</span>
            <div>
              <Input
                type="text"
                value={formData.taxId}
                onChange={(e) => onFieldChange('taxId', e.target.value)}
                onBlur={(e) => onFieldBlur('taxId', e.target.value)}
                placeholder={t('orders.details.taxRegistrationNumber.placeholder')}
                aria-invalid={!!errors.taxId}
              />
              <p>{errors.taxId || 'No error'}</p>
            </div>
          </label>
          <label>
            <span>Bank Name</span>
            <div>
              <Input
                type="text"
                value={formData.bankName}
                onChange={(e) => onFieldChange('bankName', e.target.value)}
                onBlur={(e) => onFieldBlur('bankName', e.target.value)}
                placeholder={t('orders.details.bankName.placeholder')}
                aria-invalid={!!errors.bankName}
              />
              <p>{errors.bankName || 'No error'}</p>
            </div>
          </label>
          <label>
            <span>Bank Account No.</span>
            <div>
              <Input
                type="text"
                value={formData.bankAccount}
                onChange={(e) => onFieldChange('bankAccount', e.target.value)}
                onBlur={(e) => onFieldBlur('bankAccount', e.target.value)}
                placeholder={t('orders.details.bankAccount.placeholder')}
                aria-invalid={!!errors.bankAccount}
              />
              <p>{errors.bankAccount || 'No error'}</p>
            </div>
          </label>
          <label>
            <span>Address</span>
            <div>
              <Input
                type="text"
                value={formData.address}
                onChange={(e) => onFieldChange('address', e.target.value)}
                onBlur={(e) => onFieldBlur('address', e.target.value)}
                placeholder={t('orders.details.address.placeholder')}
                aria-invalid={!!errors.address}
              />
              <p>{errors.address || 'No error'}</p>
            </div>
          </label>
          <label>
            <span>Tel</span>
            <div>
              <Input
                type="text"
                value={formData.phone}
                onChange={(e) => onFieldChange('phone', e.target.value)}
                onBlur={(e) => onFieldBlur('phone', e.target.value)}
                placeholder={t('orders.details.phone.placeholder')}
                aria-invalid={!!errors.phone}
              />
              <p>{errors.phone || 'No error'}</p>
            </div>
          </label>
          <label>
            <span>Fax</span>
            <div>
              <Input
                type="text"
                value={formData.fax}
                onChange={(e) => onFieldChange('fax', e.target.value)}
                onBlur={(e) => onFieldBlur('fax', e.target.value)}
                placeholder={t('orders.details.fax.placeholder')}
                aria-invalid={!!errors.fax}
              />
              <p>{errors.fax || 'No error'}</p>
            </div>
          </label>
        </div>
      </section>

      {/* Contact Information Section */}
      <section className="flex flex-col border rounded-2xl shadow-sm">
        <div className="border-b text-base font-medium p-6">Contact Information</div>
        <div
          className={cn(
            'px-8 py-6 grid grid-cols-2 gap-y-3 gap-x-6',
            '[&>label]:text-sm [&>label]:font-medium [&>label]:flex [&>label]:items-center',
            '[&>label>:first-child]:w-[15ch]',
            '[&>label_input]:h-10 [&>label>:nth-child(2)]:flex-1'
          )}
        >
          <label>
            <span>Contact Person</span>
            <Input
              type="text"
              value={formData.contactPerson}
              onChange={(e) => onFieldChange('contactPerson', e.target.value)}
              onBlur={(e) => onFieldBlur('contactPerson', e.target.value)}
              placeholder={t('orders.contract.person.placeholder')}
              aria-invalid={!!errors.contactPerson}
            />
          </label>
          <label>
            <span>Notification Email</span>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => onFieldChange('email', e.target.value)}
              onBlur={(e) => onFieldBlur('email', e.target.value)}
              placeholder={t('orders.contract.email.placeholder')}
              aria-invalid={!!errors.email}
            />
          </label>
          <Separator className="col-span-2 border-dashed bg-transparent border-b-1"></Separator>
          <label>
            <span>Mobile Number</span>
            <div className="flex gap-2 items-center">
              <Input
                type="tel"
                value={formData.mobileNumber}
                onChange={(e) => onFieldChange('mobileNumber', e.target.value)}
                onBlur={(e) => onFieldBlur('mobileNumber', e.target.value)}
                placeholder={t('orders.contract.phone.placeholder')}
                aria-invalid={!!errors.mobileNumber}
              />
              <Button
                type="button"
                variant="link"
                onClick={onGetVerificationCode}
                disabled={remainTime > 0 || !formData.mobileNumber}
                className="whitespace-nowrap text-blue-600"
              >
                {remainTime > 0 ? `${remainTime}s` : t('Get Code')}
              </Button>
            </div>
          </label>
          <label>
            <span>Verification Code</span>
            <Input
              type="text"
              value={formData.verificationCode}
              onChange={(e) => onFieldChange('verificationCode', e.target.value)}
              onBlur={(e) => onFieldBlur('verificationCode', e.target.value)}
              placeholder={t('orders.contract.code.placeholder')}
              aria-invalid={!!errors.verificationCode}
              className="flex-1"
            />
          </label>
        </div>
      </section>
    </div>
  );
};

export default InvoiceFormView;

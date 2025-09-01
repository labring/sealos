import { ApiResp, ReqGenInvoice } from '@/types';
import {
  isValidBANKAccount,
  isValidCNTaxNumber,
  isValidEmail,
  isValidPhoneNumber
} from '@/utils/tools';
import { cn } from '@sealos/shadcn-ui';
import { Input } from '@sealos/shadcn-ui/input';
import { Button } from '@sealos/shadcn-ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sealos/shadcn-ui';
import { Separator } from '@sealos/shadcn-ui/separator';
import { useToast } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import request from '@/service/request';
import { formatMoney } from '@/utils/format';
import { ArrowLeft } from 'lucide-react';

interface InvoiceFormData {
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

interface InvoiceFormProps {
  invoiceAmount: number;
  invoiceCount: number;
  billings: ReqGenInvoice['billings'];
  onSubmit?: (data: InvoiceFormData) => void;
  onSuccess?: () => void;
  onBack?: () => void;
  isSubmitting?: boolean;
}

interface FormErrors {
  [key: string]: string;
}

const InvoiceForm = ({
  invoiceAmount,
  invoiceCount,
  billings,
  onSubmit,
  onSuccess,
  onBack,
  isSubmitting = false
}: InvoiceFormProps) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [remainTime, setRemainTime] = useState(-1);
  const [formData, setFormData] = useState<InvoiceFormData>({
    invoiceType: 'normal',
    invoiceTitle: '',
    taxId: '',
    bankName: '',
    bankAccount: '',
    address: '',
    phone: '',
    fax: '',
    contactPerson: '',
    email: '',
    mobileNumber: '',
    verificationCode: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (remainTime <= 0) return;
    const interval = setInterval(() => {
      setRemainTime(remainTime - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [remainTime]);

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

  const validateField = (field: keyof InvoiceFormData, value: string): string => {
    switch (field) {
      case 'invoiceTitle':
        return !value.trim() ? t('orders.require') : '';
      case 'taxId':
        if (!value.trim()) return t('orders.require');
        return !isValidCNTaxNumber(value) ? t('orders.taxNumberValidation') : '';
      case 'bankName':
        return !value.trim() ? t('orders.require') : '';
      case 'bankAccount':
        if (!value.trim()) return t('orders.require');
        return !isValidBANKAccount(value) ? t('orders.bankAccountValidation') : '';
      case 'address':
        return !value.trim() ? t('orders.require') : '';
      case 'phone':
        return !value.trim() ? t('orders.require') : '';
      case 'contactPerson':
        return !value.trim() ? t('orders.require') : '';
      case 'email':
        if (!value.trim()) return t('orders.require');
        return !isValidEmail(value) ? t('orders.emailValidation') : '';
      case 'mobileNumber':
        if (!value.trim()) return t('orders.require');
        return !isValidPhoneNumber(value) ? t('orders.phoneValidation') : '';
      case 'verificationCode':
        return !value.trim() ? t('orders.require') : '';
      case 'fax':
        // Fax is optional, no validation needed
        return '';
      default:
        return '';
    }
  };

  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};
    Object.keys(formData).forEach((field) => {
      const error = validateField(
        field as keyof InvoiceFormData,
        formData[field as keyof InvoiceFormData]
      );
      if (error) {
        newErrors[field] = error;
      }
    });
    return newErrors;
  };

  const handleInputChange = (field: keyof InvoiceFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleFieldBlur = (field: keyof InvoiceFormData, value: string) => {
    const error = validateField(field, value);
    setErrors((prev) => ({
      ...prev,
      [field]: error
    }));
  };

  const getVerificationCode = async () => {
    if (!isValidPhoneNumber(formData.mobileNumber)) {
      toast({
        title: t('orders.phoneValidation'),
        status: 'error',
        position: 'top',
        duration: 2000
      });
      return;
    }

    setRemainTime(60);
    try {
      const res = await request.post<any, ApiResp<any>>('/api/invoice/sms', {
        phoneNumbers: formData.mobileNumber
      });
      if (res.code !== 200 || res.message !== 'successfully') {
        throw new Error('Get code failed');
      }
      toast({
        title: t('orders.code success'),
        status: 'success',
        duration: 2000,
        position: 'top'
      });
    } catch (err) {
      toast({
        title: t('orders.code error'),
        status: 'error',
        position: 'top',
        duration: 2000
      });
      setRemainTime(0);
    }
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      if (!billings || billings.length === 0) {
        return;
      }

      const result = await request.post<any, { status: boolean }, ReqGenInvoice>(
        '/api/invoice/verify',
        {
          token: '',
          billings: billings,
          detail: {
            title: formData.invoiceTitle,
            tax: formData.taxId,
            bank: formData.bankName,
            bankAccount: formData.bankAccount,
            address: formData.address,
            phone: formData.phone,
            fax: formData.fax,
            type: formData.invoiceType
          },
          contract: {
            person: formData.contactPerson,
            email: formData.email,
            phone: formData.mobileNumber,
            code: formData.verificationCode
          }
        }
      );

      toast({
        title: t('orders.submit success'),
        status: 'success',
        position: 'top',
        duration: 2000
      });

      onSubmit?.(formData);
      onSuccess?.();
    } catch (err) {
      toast({
        title: (err as { message: string }).message || t('orders.submit fail'),
        status: 'error',
        position: 'top',
        duration: 2000
      });
    }
  };

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
            onClick={handleSubmit}
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
                  handleInputChange('invoiceType', value);
                  handleFieldBlur('invoiceType', value);
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
                onChange={(e) => handleInputChange('invoiceTitle', e.target.value)}
                onBlur={(e) => handleFieldBlur('invoiceTitle', e.target.value)}
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
                onChange={(e) => handleInputChange('taxId', e.target.value)}
                onBlur={(e) => handleFieldBlur('taxId', e.target.value)}
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
                onChange={(e) => handleInputChange('bankName', e.target.value)}
                onBlur={(e) => handleFieldBlur('bankName', e.target.value)}
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
                onChange={(e) => handleInputChange('bankAccount', e.target.value)}
                onBlur={(e) => handleFieldBlur('bankAccount', e.target.value)}
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
                onChange={(e) => handleInputChange('address', e.target.value)}
                onBlur={(e) => handleFieldBlur('address', e.target.value)}
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
                onChange={(e) => handleInputChange('phone', e.target.value)}
                onBlur={(e) => handleFieldBlur('phone', e.target.value)}
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
                onChange={(e) => handleInputChange('fax', e.target.value)}
                onBlur={(e) => handleFieldBlur('fax', e.target.value)}
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
              onChange={(e) => handleInputChange('contactPerson', e.target.value)}
              onBlur={(e) => handleFieldBlur('contactPerson', e.target.value)}
              placeholder={t('orders.contract.person.placeholder')}
              aria-invalid={!!errors.contactPerson}
            />
          </label>
          <label>
            <span>Notification Email</span>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              onBlur={(e) => handleFieldBlur('email', e.target.value)}
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
                onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                onBlur={(e) => handleFieldBlur('mobileNumber', e.target.value)}
                placeholder={t('orders.contract.phone.placeholder')}
                aria-invalid={!!errors.mobileNumber}
              />
              <Button
                type="button"
                variant="link"
                onClick={getVerificationCode}
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
              onChange={(e) => handleInputChange('verificationCode', e.target.value)}
              onBlur={(e) => handleFieldBlur('verificationCode', e.target.value)}
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

export default InvoiceForm;

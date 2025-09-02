import { ApiResp, InvoiceBillingItem, ReqGenInvoice, Tbilling } from '@/types';
import {
  isValidBANKAccount,
  isValidCNTaxNumber,
  isValidEmail,
  isValidPhoneNumber
} from '@/utils/tools';
import { useToast } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import request from '@/service/request';
import InvoiceFormView, { InvoiceFormData } from './InvoiceFormView';

interface InvoiceFormProps {
  invoiceAmount: number;
  invoiceCount: number;
  billings: InvoiceBillingItem[];
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
      if (billings.length === 0) {
        return;
      }

      const result = await request.post<any, { status: boolean }, ReqGenInvoice>(
        '/api/invoice/verify',
        {
          token: '',
          billings,
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
    <InvoiceFormView
      invoiceAmount={invoiceAmount}
      invoiceCount={invoiceCount}
      formData={formData}
      errors={errors}
      remainTime={remainTime}
      isSubmitting={isSubmitting}
      onFieldChange={handleInputChange}
      onFieldBlur={handleFieldBlur}
      onGetVerificationCode={getVerificationCode}
      onSubmit={handleSubmit}
      onBack={onBack}
    />
  );
};

export default InvoiceForm;

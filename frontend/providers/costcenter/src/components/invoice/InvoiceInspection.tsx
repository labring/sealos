import { useMemo } from 'react';
import { useTranslation } from 'next-i18next';
import { InvoicesCollection } from '@/types';
import { InvoiceInspectionView, InvoiceInspectionData } from './InvoiceInspectionView';

interface InvoiceInspectionProps {
  invoiceData: {
    detail: string;
    totalAmount: number;
  } | null;
  onBack?: () => void;
}

const InvoiceInspection = ({ invoiceData: rawData, onBack }: InvoiceInspectionProps) => {
  const { t } = useTranslation();

  const parsedInvoiceData = useMemo((): InvoiceInspectionData | null => {
    if (!rawData?.detail) {
      return null;
    }

    try {
      const res = JSON.parse(rawData.detail) as InvoicesCollection;
      return {
        invoiceType: res.detail.type || 'normal',
        invoiceTitle: res.detail.title || '',
        taxId: res.detail.tax || '',
        bankName: res.detail.bank || '',
        bankAccount: res.detail.bankAccount || '',
        address: res.detail.address || '',
        phone: res.detail.phone || '',
        fax: res.detail.fax || '',
        contactPerson: res.contract.person || '',
        email: res.contract.email || '',
        mobileNumber: res.contract.phone || ''
      };
    } catch (e) {
      console.error('Failed to parse invoice detail:', e);
      return null;
    }
  }, [rawData?.detail]);

  if (!rawData || !parsedInvoiceData) {
    return null;
  }

  return (
    <InvoiceInspectionView
      invoiceAmount={rawData.totalAmount || 0}
      invoiceData={parsedInvoiceData}
      onBack={onBack}
    />
  );
};

export default InvoiceInspection;

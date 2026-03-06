import React from 'react';
import { InvoicePrintableView, InvoicePrintableViewProps } from './InvoicePrintableView';
import { useClientAppConfig } from '@/hooks/useClientAppConfig';

export const InvoicePrintable = React.forwardRef<
  HTMLDivElement,
  Omit<InvoicePrintableViewProps, 'billedBy'>
>(function InvoicePrintable({ invoiceNumber, dateOfIssue, billTo, items, subtotal, total }, ref) {
  const config = useClientAppConfig();

  return (
    <InvoicePrintableView
      ref={ref}
      invoiceNumber={invoiceNumber}
      dateOfIssue={dateOfIssue}
      billedBy={config.billingInfo}
      billTo={billTo}
      items={items}
      subtotal={subtotal}
      total={total}
    />
  );
});

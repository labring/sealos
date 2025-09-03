import React from 'react';
import { InvoicePrintableView, InvoicePrintableViewProps } from './InvoicePrintableView';
import useEnvStore from '@/stores/env';

export const InvoicePrintable = React.forwardRef<
  HTMLDivElement,
  Omit<InvoicePrintableViewProps, 'billedBy'>
>(function InvoicePrintable({ invoiceNumber, dateOfIssue, billTo, items, subtotal, total }, ref) {
  const billingInfo = useEnvStore((state) => state.billingInfo);

  return (
    <InvoicePrintableView
      ref={ref}
      invoiceNumber={invoiceNumber}
      dateOfIssue={dateOfIssue}
      billedBy={billingInfo}
      billTo={billTo}
      items={items}
      subtotal={subtotal}
      total={total}
    />
  );
});

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@sealos/shadcn-ui/dialog';
import { Textarea } from '@sealos/shadcn-ui/textarea';
import { Button } from '@sealos/shadcn-ui/button';
import { Label } from '@sealos/shadcn-ui/label';
import { InvoicePrintable } from './InvoicePrintable';
import { OrderListRow } from './OrderListView';
import { formatMoney } from '@/utils/format';
import { InvoiceItem } from './InvoicePrintableView';
import { format } from 'date-fns';
import { snapdom } from '@zumer/snapdom';

interface InvoiceDownloadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: OrderListRow[];
}

export function InvoiceDownloadModal({ open, onOpenChange, items }: InvoiceDownloadModalProps) {
  const [billTo, setBillTo] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');

  const invoicePrintableRef = useRef<HTMLDivElement>(null);

  const billingItems = useMemo(() => {
    return items.map(
      (item): InvoiceItem => ({
        amount: '$' + formatMoney(item.amount),
        period: '',
        description: item.id,
        quantity: 1,
        unitPrice: '$' + formatMoney(item.amount)
      })
    );
  }, [items]);

  const invoiceAmount = useMemo(() => items.reduce((acc, cur) => acc + cur.amount, 0), [items]);

  const dateOfIssue = format(new Date(), 'MMM dd, yyyy');

  // Crypto API returns async values.
  useEffect(() => {
    const itemIds = items.map((item) => item.id);

    window.crypto.subtle
      .digest('SHA-1', new TextEncoder().encode(itemIds.join(',')))
      .then((hash) => btoa(String.fromCharCode(...new Uint8Array(hash.slice(0, 12)))))
      .then((hash) =>
        setInvoiceNumber(hash.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', ''))
      );
  }, [items]);

  const handleDownload = async () => {
    if (!invoicePrintableRef.current) return;

    const result = await snapdom(invoicePrintableRef.current, { dpr: 4 });
    await result.download({ format: 'png', filename: 'invoice-' + invoiceNumber });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Download Invoice</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6">
          {/* Customer Information Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="billTo">Bill To</Label>
              <Textarea
                id="billTo"
                className="min-h-64"
                value={billTo}
                onChange={(e) => setBillTo(e.target.value)}
                placeholder="Enter your info"
              />
            </div>
          </div>

          {/* Invoice Preview */}
          <div className="fixed -top-[1000vh] -left-[1000vw] -z-50">
            <InvoicePrintable
              ref={invoicePrintableRef}
              invoiceNumber={invoiceNumber}
              dateOfIssue={dateOfIssue}
              billTo={billTo}
              items={billingItems}
              subtotal={'$' + formatMoney(invoiceAmount)}
              total={'$' + formatMoney(invoiceAmount)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleDownload} disabled={!billTo}>
            Download Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

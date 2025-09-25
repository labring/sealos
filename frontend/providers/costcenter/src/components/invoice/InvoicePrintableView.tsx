import React from 'react';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@sealos/shadcn-ui/table';
import Image from 'next/image';

export type InvoiceItem = {
  description: string;
  period: string;
  quantity: number;
  unitPrice: string;
  amount: string;
};

export type InvoicePrintableViewProps = {
  invoiceNumber: string;
  dateOfIssue: string;
  billedBy: {
    companyName: string;
    addressLines: string[];
    contactLines: string[];
  };
  billTo: string;
  items: InvoiceItem[];
  subtotal: string;
  total: string;
};

export const InvoicePrintableView = React.forwardRef<HTMLDivElement, InvoicePrintableViewProps>(
  function InvoicePrintableView(
    { invoiceNumber, dateOfIssue, billedBy, billTo, items, subtotal, total },
    ref
  ) {
    return (
      <div ref={ref} className="w-[210mm] min-h-[297mm] pointer-events-none bg-white p-10 relative">
        <Image
          src="/sealos.svg"
          alt="Sealos Logo"
          width={64}
          height={64}
          className="absolute top-10 right-10 size-16"
        />

        <h1 className="text-2xl font-bold">Invoice</h1>

        <section className="mt-5 flex flex-col gap-1 text-gray-600">
          <div className="flex">
            <span className="w-[15ch]">Invoice Number</span>
            <span className="w-[15ch]">{invoiceNumber}</span>
          </div>
          <div className="flex">
            <span className="w-[15ch]">Date of Issue</span>
            <span className="w-[15ch]">{dateOfIssue}</span>
          </div>
        </section>

        <div className="flex mt-10">
          <section className="flex-1 flex flex-col gap-5 text-gray-600">
            <h2 className="font-semibold text-foreground">Billed By</h2>

            <p className="leading-relaxed">{billedBy.companyName}</p>

            <p className="leading-relaxed">
              {billedBy.addressLines.map((line, index) => (
                <span key={index}>
                  {line}
                  {index < billedBy.addressLines.length - 1 && <br />}
                </span>
              ))}
            </p>

            <p className="leading-relaxed">
              {billedBy.contactLines.map((line, index) => (
                <span key={index}>
                  {line}
                  {index < billedBy.contactLines.length - 1 && <br />}
                </span>
              ))}
            </p>
          </section>

          <section className="flex-1 flex flex-col gap-5 text-gray-600">
            <h2 className="font-semibold text-foreground">Bill to</h2>

            {billTo.split('\n\n').map((par, parIndex) => (
              <p key={parIndex} className="leading-relaxed">
                {par.split('\n').map((line) => (
                  <>
                    <span>{line}</span>
                    <br />
                  </>
                ))}
              </p>
            ))}
          </section>
        </div>

        <section className="mt-16">
          <Table className="border-y [&_td:last-child]:text-end">
            <TableHeader className="border-b uppercase font-medium text-gray-600">
              <TableRow className="h-10">
                <TableCell>Description</TableCell>
                <TableCell>Qty</TableCell>
                <TableCell>Unit Price</TableCell>
                <TableCell>Amount</TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="font-medium [&>tr]:h-16 [&>:not(:last-child)]:border-b">
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="font-semibold">{item.description}</div>
                    <div className="font-normal text-gray-600">{item.period}</div>
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{item.unitPrice}</TableCell>
                  <TableCell>{item.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <section className="mt-16 flex flex-col items-end">
          <div className="flex border-y py-1.5 w-60">
            <span>Subtotal</span>
            <span className="flex-1 text-end">{subtotal}</span>
          </div>
          <div className="flex border-b py-1.5 font-semibold w-60">
            <span>Total</span>
            <span className="flex-1 text-end">{total}</span>
          </div>
        </section>
      </div>
    );
  }
);

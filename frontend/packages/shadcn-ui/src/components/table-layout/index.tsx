import React from 'react';
import { Table, TableHeader, TableRow, TableBody, TableFooter, TableCell } from '../ui/table';
import { cn } from '../../lib/utils';

export function TableLayout({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('border shadow-sm overflow-hidden rounded-2xl bg-card', className)}>
      {children}
    </div>
  );
}

export function TableLayoutCaption({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex py-3 px-4 border-b justify-between items-center', className)}>
      {children}
    </div>
  );
}

export function TableLayoutHeadRow({
  children,
  className
}: {
  children: React.ReactNode;
  className?: {
    thead?: string;
    tr?: string;
  };
}) {
  return (
    <TableHeader className={cn('h-10', className?.thead)}>
      <TableRow className={cn('[&>th]:bg-transparent border-b', className?.tr)}>
        {children}
      </TableRow>
    </TableHeader>
  );
}

export function TableLayoutBody({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <TableBody className={cn('text-foreground', className)}>{children}</TableBody>;
}

export function TableLayoutFooter({
  children,
  className
}: {
  children: React.ReactNode;
  className?: {
    tfoot?: string;
    tr?: string;
    td?: string;
  };
}) {
  return (
    <TableFooter className={cn('bg-transparent', className?.tfoot)}>
      <TableRow className={cn(className?.tr)}>
        <TableCell colSpan={999} className={cn('p-0', className?.td)}>
          {children}
        </TableCell>
      </TableRow>
    </TableFooter>
  );
}

export function TableLayoutContent({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <Table className={cn('text-sm', className)}>{children}</Table>;
}

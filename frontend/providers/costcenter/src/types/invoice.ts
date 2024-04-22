import { RechargeBillingItem } from '@/types/billing';

export type TInvoiceDetail = {
  title: string;
  tax: string;
  bank: string;
  bankAccount: string;
  address?: string;
  phone?: string;
  fax?: string;
};
export type TInvoiceContract = {
  person: string;
  phone: string;
  email: string;
};
export type ReqGenInvoice = {
  detail: TInvoiceDetail;
  contract: TInvoiceContract & { code: string };
  billings: RechargeBillingItem[];
};
export type Tbilling = {
  order_id: string;
  amount: number;
  regionUID: string;
  userUID: string;
  createdTime: Date;
};

export type InvoicesCollection = {
  amount: number;
  detail: TInvoiceDetail;
  billings: Tbilling[];
  contract: TInvoiceContract;
  k8s_user: string;
  createdTime: Date;
};

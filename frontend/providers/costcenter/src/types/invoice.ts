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
export type TInvoice = {
  detail: TInvoiceDetail;
  contract: TInvoiceContract;
};
export type ReqGenInvoice = {
  detail: TInvoiceDetail;
  contract: TInvoiceContract & { code: string };
  billings: {
    order_id: string;
    amount: number;
    // timeStamp
    createdTime: number;
  }[];
};
export type Tbilling = {
  order_id: string;
  amount: number;
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

export type TInvoiceDetail = {
  title: string;
  tax: string;
  bank: string;
  type?: string;
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
  billings: InvoiceBillingItem[];
  token: string;
};

export type InvoiceBillingItem = {
  order_id: string;
  amount: number;
  regionUID: string;
  createdTime: string;
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
type InoviceStatus = 'COMPLETED' | 'PENDING' | 'REJECTED';
export type InvoicePayload = {
  id: string;
  userID: string;
  createdAt: Date;
  updatedAt: Date;
  detail: string;
  remark: unknown;
  totalAmount: number;
  status: InoviceStatus;
};
export type InvoiceListData = {
  total: number;
  totalPage: number;
  invoices: InvoicePayload[];
};

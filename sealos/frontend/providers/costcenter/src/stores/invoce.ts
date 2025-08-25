import { InvoicePayload } from '@/types';
import { create } from 'zustand';
type InvoiceState = {
  invoiceDetail: string;
  data: InvoicePayload | undefined;
  setData: (data?: InvoicePayload) => void;
  setInvoiceDetail: (invoiceDetail: string) => void;
};

const useInvoiceStore = create<InvoiceState>((set, get) => ({
  invoiceDetail: '',
  data: undefined,
  setInvoiceDetail: (invoiceDetail: string) => set({ invoiceDetail }),
  setData: (data?: InvoicePayload) => set({ data })
}));

export default useInvoiceStore;

import { PaymentData } from '@/types';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type PaymentDataState = {
  paymentData: PaymentData | undefined;
  setPaymentData: (data: PaymentData) => void;
  deletePaymentData: () => void;
};

export const usePaymentDataStore = create(
  immer<PaymentDataState>((set) => ({
    paymentData: undefined,
    setPaymentData: (data) => set({ paymentData: data }),
    deletePaymentData: () => set({ paymentData: undefined })
  }))
);

export default usePaymentDataStore;

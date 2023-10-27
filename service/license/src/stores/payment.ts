import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type PaymentDataState = {
  paymentData?: {
    orderId: string;
  };
  setPaymentData: (data: { orderId: string }) => void;
  deletePaymentData: () => void;
};

export const usePaymentDataStore = create(
  persist(
    immer<PaymentDataState>((set) => ({
      paymentData: undefined,
      setPaymentData: (data) => set({ paymentData: data }),
      deletePaymentData: () => set({ paymentData: undefined })
    })),
    {
      name: 'paymentData'
    }
  )
);

export default usePaymentDataStore;

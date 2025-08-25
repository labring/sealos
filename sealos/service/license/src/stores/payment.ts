import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type PaymentDataState = {
  paymentData?: {
    orderId: string;
    expirationTime: number;
    cpu: number;
    memory: number;
    months: string;
    clusterId?: string;
    name?: string;
    systemId?: string;
  };
  setPaymentData: (data: {
    orderId: string;
    cpu: number;
    memory: number;
    months: string;
    clusterId?: string;
    name?: string;
    systemId?: string;
  }) => void;
  deletePaymentData: () => void;
  isExpired: () => boolean;
};

export const usePaymentDataStore = create(
  persist(
    immer<PaymentDataState>((set, get) => ({
      paymentData: undefined,
      setPaymentData: (data) => {
        const currentTime = new Date().getTime();
        const expirationTime = currentTime + 5 * 60000;
        set({
          paymentData: {
            ...data,
            expirationTime: expirationTime
          }
        });
      },
      deletePaymentData: () => set({ paymentData: undefined }),
      isExpired: () => {
        const paymentData = get().paymentData;
        if (paymentData && paymentData.expirationTime) {
          const currentTime = new Date().getTime();
          return currentTime > paymentData.expirationTime;
        }
        return false;
      }
    })),
    {
      name: 'paymentData'
    }
  )
);

export default usePaymentDataStore;

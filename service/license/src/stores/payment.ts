import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type PaymentDataState = {
  paymentData?: {
    orderId: string;
    expirationTime: number;
  };
  setPaymentData: (orderId: string) => void;
  deletePaymentData: () => void;
  isExpired: () => boolean;
};

export const usePaymentDataStore = create(
  persist(
    immer<PaymentDataState>((set, get) => ({
      paymentData: undefined,
      setPaymentData: (id) => {
        const currentTime = new Date().getTime(); // 获取当前时间戳
        const expirationTime = currentTime + 5 * 60000; // 10 minutes in milliseconds
        set({
          paymentData: {
            orderId: id,
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

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
type SmsState = {
  remainTime: number;
  phoneNumber: string;
  setPhoneNumber: (phoneNumber: string) => void;
  setRemainTime: (time: number) => void;
};

const useSmsStateStore = create<SmsState>()(
  immer((set, get) => ({
    remainTime: 0,
    phoneNumber: '',
    setPhoneNumber(phoneNumber) {
      set({
        phoneNumber
      });
    },
    setRemainTime(remainTime) {
      set({
        remainTime
      });
    }
  }))
);

export default useSmsStateStore;

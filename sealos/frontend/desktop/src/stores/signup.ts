import { IPersonalInfo } from '@/schema/auth';
import { ProviderType } from 'prisma/global/generated/client';
import { create } from 'zustand';
type TSignupData = {
  providerId: string;
  providerType: ProviderType;
};
interface SignupState {
  signupData: TSignupData | null;
  // personalData: IPersonalInfo | null;
  setSignupData: (data: TSignupData) => void;
  // setPersonalData: (data: IPersonalInfo) => void;
  clearSignupData: () => void;
  // clearPersonalData: () => void;
  startTime: number;
  updateStartTime: () => void;
  // for restore
  setStartTime: (date: number) => void;
}

export const useSignupStore = create<SignupState>((set) => ({
  signupData: null,
  // personalData: {
  //   p
  // },
  startTime: new Date().getTime() - 61_000,
  setSignupData: (data) => set({ signupData: data }),
  // setPersonalData: (data) => set({ personalData: data }),
  clearSignupData: () => set({ signupData: null }),
  updateStartTime() {
    set({
      startTime: new Date().getTime()
    });
  },
  setStartTime(startTime: number) {
    set({
      startTime
    });
  }
  // clearPersonalData: () => set({ personalData: null })
}));

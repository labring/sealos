import { ProviderType } from 'prisma/global/generated/client';
import { create } from 'zustand';

type TSignupData = {
  providerId: string;
  providerType: ProviderType;
};

interface SignupState {
  signupData: TSignupData | null;
  setSignupData: (data: TSignupData) => void;
  clearSignupData: () => void;
  startTime: number;
  updateStartTime: () => void;
  // for restore
  setStartTime: (date: number) => void;
}

export const useSignupStore = create<SignupState>((set) => ({
  signupData: null,
  startTime: new Date().getTime() - 61_000,
  setSignupData: (data) => set({ signupData: data }),
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
}));

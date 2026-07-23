import { ProviderType } from 'prisma/global/generated/client';
import { create } from 'zustand';

type SigninFormData = {
  providerId: string;
  providerType: ProviderType;
};

interface SignupState {
  formValues: SigninFormData | null;
  setFormValues: (data: SigninFormData) => void;
  clearFormValues: () => void;
  captchaToken: string | null;
  setCaptchaToken: (token: string) => void;
  clearCaptchaToken: () => void;
  challengeId: string | null;
  setChallengeId: (challengeId: string) => void;
  clearChallengeId: () => void;
  startTime: number;
  updateStartTime: () => void;
  // for restore
  clearStartTime: () => void;
}

export const useSigninFormStore = create<SignupState>((set) => ({
  formValues: null,
  setFormValues: (data) => set({ formValues: data, challengeId: null }),
  clearFormValues: () => set({ formValues: null, challengeId: null }),
  captchaToken: null,
  setCaptchaToken: (token: string | null) => set({ captchaToken: token }),
  clearCaptchaToken: () => set({ captchaToken: null }),
  challengeId: null,
  setChallengeId: (challengeId) => set({ challengeId }),
  clearChallengeId: () => set({ challengeId: null }),
  startTime: 0,
  updateStartTime() {
    set({
      startTime: new Date().getTime()
    });
  },
  clearStartTime() {
    set({
      startTime: 0
    });
  }
}));

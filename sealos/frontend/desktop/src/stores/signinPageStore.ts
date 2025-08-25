import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type SigninPageAction = 'PROMPT_REAUTH_GITHUB';

interface SigninPageState {
  signinPageAction: SigninPageAction | null;
  setSigninPageAction: (action: SigninPageAction) => void;
  clearSigninPageAction: () => void;
}

const useSigninPageStore = create<SigninPageState>()(
  persist(
    immer((set) => ({
      signinPageAction: null,

      setSigninPageAction: (action) => {
        set({
          signinPageAction: action
        });
      },

      clearSigninPageAction: () => {
        set({
          signinPageAction: null
        });
      }
    })),
    {
      name: 'signinPageStore',
      storage: createJSONStorage(() => sessionStorage)
    }
  )
);

export default useSigninPageStore;

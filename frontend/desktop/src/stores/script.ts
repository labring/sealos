import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
type ScriptState = {
  captchaIsLoaded: boolean;
  captchaIsInited: boolean;
  setCaptchaIsInited: (captchaIsInited: boolean) => void;
  setCaptchaIsLoad: () => void;
};

const useScriptStore = create<ScriptState>()(
  immer((set, get) => ({
    captchaIsLoaded: false,
    captchaIsInited: false,
    setCaptchaIsLoad() {
      set({
        captchaIsLoaded: true
      });
    },
    setCaptchaIsInited(captchaIsInited: boolean) {
      set({
        captchaIsInited
      });
    }
  }))
);

export default useScriptStore;

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
type ScriptState = {
  captchaIsLoaded: boolean;
  setCaptchaIsLoad: () => void;
};

const useScriptStore = create<ScriptState>()(
  immer((set, get) => ({
    captchaIsLoaded: false,
    setCaptchaIsLoad() {
      set({
        captchaIsLoaded: true
      });
    }
  }))
);

export default useScriptStore;

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface GuideState {
  guide2: boolean;
  guideConfigDevbox: boolean;
  guideIDE: boolean;
  manageAndDeploy: boolean;
  // deleted
  guide6: boolean;
  guide7: boolean;
  guideRelease: boolean;
  currentGuideApp: string;
  isGuideEnabled: boolean;
  setGuide2: (completed: boolean) => void;
  setguideConfigDevbox: (completed: boolean) => void;
  setguideIDE: (completed: boolean) => void;
  setManageAndDeploy: (completed: boolean) => void;
  setGuide6: (completed: boolean) => void;
  setGuide7: (completed: boolean) => void;
  setguideRelease: (completed: boolean) => void;
  setGuideEnabled: (enabled: boolean) => void;
  setCurrentGuideApp: (name: string) => void;
  resetGuideState: (completed: boolean) => void;
}

export const useGuideStore = create<GuideState>()(
  persist(
    (set) => ({
      guide2: true,
      guideConfigDevbox: true,
      guideIDE: true,
      manageAndDeploy: true,
      guide6: true,
      guide7: true,
      guideRelease: true,
      currentGuideApp: '',
      isGuideEnabled: true,

      setGuide2: (completed: boolean) => set({ guide2: completed }),
      setguideConfigDevbox: (completed: boolean) => set({ guideConfigDevbox: completed }),
      setguideIDE: (completed: boolean) => set({ guideIDE: completed }),
      setManageAndDeploy: (completed: boolean) => set({ manageAndDeploy: completed }),
      setGuide6: (completed: boolean) => set({ guide6: completed }),
      setGuide7: (completed: boolean) => set({ guide7: completed }),
      setguideRelease: (completed: boolean) => set({ guideRelease: completed }),
      setGuideEnabled: (enabled) => set({ isGuideEnabled: enabled }),
      setCurrentGuideApp: (name: string) => set({ currentGuideApp: name }),
      resetGuideState: (completed: boolean) =>
        set({
          guide2: completed,
          guideConfigDevbox: completed,
          guideIDE: completed,
          manageAndDeploy: completed,
          guide6: completed,
          guide7: completed,
          guideRelease: completed
        })
    }),
    {
      name: 'user-guide',
      storage: createJSONStorage(() => sessionStorage)
    }
  )
);

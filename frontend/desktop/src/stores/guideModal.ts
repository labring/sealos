import { create } from 'zustand';

interface GuideModalState {
  isDriverActive: boolean;
  isOpen: boolean;
  selectedGuide: number | null;
  activeStep: number;
  initGuide: boolean;
  setIsDriverActive: (isDriverActive: boolean) => void;
  openGuideModal: (guideIndex?: number) => void;
  closeGuideModal: () => void;
  setSelectedGuide: (index: number | null) => void;
  setActiveStep: (step: number) => void;
  setInitGuide: (init: boolean) => void;
}

export const useGuideModalStore = create<GuideModalState>((set) => ({
  isOpen: false,
  isDriverActive: false,
  selectedGuide: null,
  activeStep: 0,
  initGuide: false,
  setIsDriverActive: (isDriverActive) => set({ isDriverActive }),
  openGuideModal: (guideIndex?: number) => set({ isOpen: true, selectedGuide: guideIndex ?? null }),
  closeGuideModal: () => set({ isOpen: false }),
  setSelectedGuide: (index) => set({ selectedGuide: index }),
  setActiveStep: (step) => set({ activeStep: step }),
  setInitGuide: (init) => set({ initGuide: init })
}));

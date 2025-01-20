import { TemplateState } from '@/constants/template';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
type TemplateModalConfig = {
  templateState: TemplateState;
  lastRoute: string;
};
type State = {
  isOpen: boolean;
  config: TemplateModalConfig;
  openTemplateModal: (config: TemplateModalConfig) => void;
  closeTemplateModal: () => void;
  updateTemplateModalConfig: (config: TemplateModalConfig) => void;
};
export const useTemplateStore = create<State>()(
  devtools(
    immer((set, get) => ({
      isOpen: false,
      config: {
        templateState: TemplateState.publicTemplate,
        lastRoute: ''
      },
      updateTemplateModalConfig(config: TemplateModalConfig) {
        set((state) => {
          state.config = config;
        });
      },
      openTemplateModal(config: TemplateModalConfig) {
        set((state) => {
          state.isOpen = true;
          state.config = config;
        });
      },
      closeTemplateModal() {
        set((state) => {
          state.isOpen = false;
        });
      }
    }))
  )
);

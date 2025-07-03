import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import { TemplateState } from '@/constants/template';

type TemplateModalConfig = {
  templateState: TemplateState;
  lastRoute: string;
};

type State = {
  config: TemplateModalConfig;
  updateTemplateModalConfig: (config: TemplateModalConfig) => void;
};

export const useTemplateStore = create<State>()(
  devtools(
    immer((set, get) => ({
      config: {
        templateState: TemplateState.publicTemplate,
        lastRoute: ''
      },
      updateTemplateModalConfig(config: TemplateModalConfig) {
        set((state) => {
          state.config = config;
        });
      }
    }))
  )
);

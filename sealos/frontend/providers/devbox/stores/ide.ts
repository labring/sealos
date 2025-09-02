import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type IDEType =
  | 'vscode'
  | 'cursor'
  | 'vscodeInsiders'
  | 'windsurf'
  | 'trae'
  | 'traeCN'
  | 'gateway'
  | 'toolbox';

type State = {
  devboxIDEList: { ide: IDEType; devboxName: string }[];
  getDevboxIDEByDevboxName: (devboxName: string) => IDEType;
  addDevboxIDE: (ide: IDEType, devboxName: string) => void;
  updateDevboxIDE: (ide: IDEType, devboxName: string) => void;
  removeDevboxIDE: (devboxName: string) => void;
};

const validIDETypes: IDEType[] = [
  'vscode',
  'cursor',
  'vscodeInsiders',
  'windsurf',
  'trae',
  'traeCN',
  'gateway',
  'toolbox'
];

const getValidIDE = (ide: string): IDEType => {
  return validIDETypes.includes(ide as IDEType) ? (ide as IDEType) : 'vscode';
};

export const useIDEStore = create<State>()(
  devtools(
    persist(
      immer((set, get) => ({
        devboxIDEList: [],
        getDevboxIDEByDevboxName(devboxName: string) {
          const foundIDE = get().devboxIDEList.find((item) => item.devboxName === devboxName)?.ide;
          return getValidIDE(foundIDE || 'vscode');
        },
        addDevboxIDE(ide: IDEType, devboxName: string) {
          set((state) => {
            state.devboxIDEList.push({ ide: getValidIDE(ide), devboxName });
          });
        },
        updateDevboxIDE(ide: IDEType, devboxName: string) {
          set((state) => {
            const item = state.devboxIDEList.find((item) => item.devboxName === devboxName);
            if (item) {
              item.ide = getValidIDE(ide);
            } else {
              state.devboxIDEList.push({ ide: getValidIDE(ide), devboxName });
            }
          });
        },
        removeDevboxIDE(devboxName: string) {
          set((state) => {
            state.devboxIDEList = state.devboxIDEList.filter(
              (item) => item.devboxName !== devboxName
            );
          });
        }
      })),
      {
        name: 'ide-list-storage'
      }
    )
  )
);

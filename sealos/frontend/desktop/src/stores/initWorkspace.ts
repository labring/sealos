import { create } from 'zustand';

interface SignupState {
  workspaceName: string;
  selectedRegionUid: string;
  setSelectedRegionUid: (uid: string) => void;
  setWorkspaceName: (n: string) => void;
}

export const useInitWorkspaceStore = create<SignupState>((set) => ({
  workspaceName: 'My Workspace',
  selectedRegionUid: '',
  setSelectedRegionUid(selectedRegionUid) {
    set({ selectedRegionUid });
  },
  setWorkspaceName(workspaceName: string) {
    set({ workspaceName });
  }
}));

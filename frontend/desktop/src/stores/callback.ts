import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type CallbackState = {
  workspaceInviteCode?: string;
  setWorkspaceInviteCode: (id?: string) => void;
};

const useCallbackStore = create<CallbackState>()(
  persist(
    immer((set, get) => ({
      workspaceInviteCode: undefined,
      setWorkspaceInviteCode: (id?: string) => {
        set((state) => ({ workspaceInviteCode: id }));
      }
    })),
    {
      name: 'callbackParam'
    }
  )
);

export default useCallbackStore;

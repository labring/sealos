import { ProviderType } from 'prisma/global/generated/client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
export enum MergeUserStatus {
  IDLE,
  CONFLICT,
  CANMERGE
}
type MergeUserData = {
  code: string;
  providerType: ProviderType;
};
type CallbackState = {
  workspaceInviteCode?: string;
  mergeUserData?: MergeUserData;
  mergeUserStatus: MergeUserStatus;
  setMergeUserData: (d?: MergeUserData) => void;
  setMergeUserStatus: (s: MergeUserStatus) => void;
  setWorkspaceInviteCode: (id?: string) => void;
};

const useCallbackStore = create<CallbackState>()(
  persist(
    immer((set, get) => ({
      workspaceInviteCode: undefined,
      mergeUserData: undefined,
      mergeUserStatus: MergeUserStatus.IDLE,
      setMergeUserData(mergeUserData) {
        set({
          mergeUserData
        });
      },
      setMergeUserStatus(mergeUserStatus) {
        set({
          mergeUserStatus
        });
      },
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

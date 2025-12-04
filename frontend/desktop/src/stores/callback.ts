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
  isForceMerge: boolean;
  setMergeUserData: (d?: MergeUserData) => void;
  setMergeUserStatus: (s: MergeUserStatus) => void;
  setForceMerge: (force: boolean) => void;
  setWorkspaceInviteCode: (id?: string) => void;
};

const useCallbackStore = create<CallbackState>()(
  persist(
    immer((set, get) => ({
      workspaceInviteCode: undefined,
      mergeUserData: undefined,
      mergeUserStatus: MergeUserStatus.IDLE,
      isForceMerge: false,
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
      setForceMerge(force) {
        set({
          isForceMerge: force
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

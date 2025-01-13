import { createStore } from 'zustand';

export type TagSelectorProps = {
  selectedTagList: Set<string>;
};
export type TagSelectorStore = {
  setSelectedTag: (tagUid: string, select: boolean) => void;
  getSelectedTagList: () => string[];
} & TagSelectorProps;

export const createTagSelectorStore = (initProps?: Partial<TagSelectorProps>) => {
  const DEFAULT_PROPS: TagSelectorProps = {
    selectedTagList: new Set()
  };
  return createStore<TagSelectorStore>()((set, get) => ({
    ...DEFAULT_PROPS,
    ...initProps,
    setSelectedTag(tagUid, select) {
      set((draft) => {
        const newSet = new Set(draft.selectedTagList);
        if (select) newSet.add(tagUid);
        else newSet.delete(tagUid);
        return {
          selectedTagList: newSet
        };
      });
    },
    getSelectedTagList() {
      return [...get().selectedTagList];
    }
  }));
};

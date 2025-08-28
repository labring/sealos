import { create } from 'zustand';

interface TagSelectorState {
  selectedTagList: Set<string>;
  setSelectedTag: (tagId: string, checked: boolean) => void;
  setSelectedTagInCategory: (tagId: string, categoryTags: string[]) => void;
  getSelectedTagList: () => string[];
  resetTags: () => void;
}

export const useTagSelectorStore = create<TagSelectorState>((set, get) => ({
  selectedTagList: new Set<string>(),
  setSelectedTag: (tagId: string, checked: boolean) =>
    set((state) => {
      const newSet = new Set(state.selectedTagList);
      if (checked) newSet.add(tagId);
      else newSet.delete(tagId);
      return { selectedTagList: newSet };
    }),
  setSelectedTagInCategory: (tagId: string, categoryTags: string[]) =>
    set((state) => {
      const newSet = new Set(state.selectedTagList);
      // Remove all tags in this category first
      categoryTags.forEach((tag) => newSet.delete(tag));
      // Add the selected tag
      newSet.add(tagId);
      return { selectedTagList: newSet };
    }),
  getSelectedTagList: () => Array.from(get().selectedTagList),
  resetTags: () => set({ selectedTagList: new Set<string>() })
}));

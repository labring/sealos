import { create } from 'zustand';

type CategoryType = 'official' | 'unofficial' | 'language' | 'framework' | 'os' | 'mcp';

interface TagSelectorState {
  selectedTagList: Set<string>;
  // Store selected tags by category to prevent cross-category interference
  selectedTagsByCategory: Record<CategoryType, string | null>;
  setSelectedTag: (tagId: string, checked: boolean) => void;
  setSelectedTagInCategory: (tagId: string, category: CategoryType) => void;
  clearCategorySelection: (category: CategoryType) => void;
  getSelectedTagList: () => string[];
  resetTags: () => void;
}

export const useTagSelectorStore = create<TagSelectorState>((set, get) => ({
  selectedTagList: new Set<string>(),
  selectedTagsByCategory: {
    official: null,
    unofficial: null,
    language: null,
    framework: null,
    os: null,
    mcp: null
  },
  setSelectedTag: (tagId: string, checked: boolean) =>
    set((state) => {
      const newSet = new Set(state.selectedTagList);
      if (checked) newSet.add(tagId);
      else newSet.delete(tagId);
      return { selectedTagList: newSet };
    }),
  setSelectedTagInCategory: (tagId: string, category: CategoryType) =>
    set((state) => {
      const newSet = new Set(state.selectedTagList);
      const newCategorySelection = { ...state.selectedTagsByCategory };

      // Remove the previous selection for this category
      const previousSelection = newCategorySelection[category];
      if (previousSelection) {
        newSet.delete(previousSelection);
      }

      // Set new selection for this category
      newCategorySelection[category] = tagId;
      newSet.add(tagId);

      return {
        selectedTagList: newSet,
        selectedTagsByCategory: newCategorySelection
      };
    }),
  clearCategorySelection: (category: CategoryType) =>
    set((state) => {
      const newSet = new Set(state.selectedTagList);
      const newCategorySelection = { ...state.selectedTagsByCategory };

      // Remove the current selection for this category
      const currentSelection = newCategorySelection[category];
      if (currentSelection) {
        newSet.delete(currentSelection);
        newCategorySelection[category] = null;
      }

      return {
        selectedTagList: newSet,
        selectedTagsByCategory: newCategorySelection
      };
    }),
  getSelectedTagList: () => Array.from(get().selectedTagList),
  resetTags: () =>
    set({
      selectedTagList: new Set<string>(),
      selectedTagsByCategory: {
        official: null,
        unofficial: null,
        language: null,
        framework: null,
        os: null,
        mcp: null
      }
    })
}));

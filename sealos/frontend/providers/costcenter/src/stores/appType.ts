import { create } from 'zustand';
import { persist, StorageValue } from 'zustand/middleware';
type AppTypeState = {
  appTypeMap: Map<string, string>;
  setAppTypeMap(appTypeMap: Map<string, string>): void;
  getAppType(appType: string): string;
};
const useAppTypeStore = create<AppTypeState>()(
  persist(
    (set, get) => ({
      appTypeMap: new Map(),
      setAppTypeMap(appTypeMap: Map<string, string>) {
        set({ appTypeMap });
      },
      getAppType(appType: string) {
        return get().appTypeMap?.get(appType) || '';
      }
    }),
    {
      name: 'appType-store',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const { state } = JSON.parse(str);
          return {
            state: {
              ...state,
              appTypeMap: new Map(state.appTypeMap)
            }
          };
        },
        setItem: (name, newValue: StorageValue<AppTypeState>) => {
          // functions cannot be JSON encoded
          const str = JSON.stringify({
            state: {
              ...newValue.state,
              appTypeMap: Array.from(newValue.state.appTypeMap.entries())
            }
          });
          localStorage.setItem(name, str);
        },
        removeItem: (name) => localStorage.removeItem(name)
      }
    }
  )
);

export default useAppTypeStore;

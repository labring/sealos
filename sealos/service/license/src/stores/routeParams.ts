import { ClusterType } from '@/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type RouteParamsState = {
  data: {
    external: string | null;
    clusterType: ClusterType | null;
  };
  setRouteParams: (isExternal: string | null, type: ClusterType | null) => void;
  clearRouteParams: () => void;
};

const useRouteParamsStore = create<RouteParamsState>()(
  persist(
    immer((set, get) => ({
      data: {
        clusterType: null,
        external: null
      },
      setRouteParams: (isExternal, type) => {
        set({
          data: {
            external: isExternal,
            clusterType: type
          }
        });
      },
      clearRouteParams: () => {
        set({
          data: {
            external: null,
            clusterType: null
          }
        });
      }
    })),
    {
      name: 'routeParams'
    }
  )
);

export default useRouteParamsStore;

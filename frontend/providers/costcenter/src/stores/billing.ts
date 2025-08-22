import { CYCLE } from '@/constants/valuation';
import { Cycle } from '@/types/cycle';
import { RegionClient } from '@/types/region';
import { formatMoney } from '@/utils/format';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type BillingState = {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
  gpu: number;
  namespaceIdx: number;
  appTypeIdx: number;
  cycleIdx: number;
  regionIdx: number;
  appNameIdx: number;
  namespaceList: [string, string][];
  appTypeList: string[];
  regionList: RegionClient[];
  appNameList: string[];
  setAppType: (appType: number) => void;
  setAppName: (appName: number) => void;
  setNamespace: (namespace: number) => void;
  setAppNameList: (appNameList: string[]) => void;
  setAppTypeList: (appTypeList: string[]) => void;
  setRegionList: (regionList: RegionClient[]) => void;
  setNamespaceList: (namespaceList: [string, string][]) => void;
  setRegion: (region: number) => void;
  setCycle: (cycle: number) => void;
  getCycle: () => Cycle;
  getAppType: () => string;
  getAppName: () => string;
  detailIsOpen: boolean;
  openBillingDetail: () => void;
  closeBillingDetail: () => void;
  // [id, name]
  getNamespace: () => [string, string] | null;
  getRegion: () => RegionClient | null;
  updateCpu: (cpu: number) => void;
  updateMemory: (memory: number) => void;
  updateStorage: (storage: number) => void;
  updateNetwork: (network: number) => void;
  updateGpu: (gpu: number) => void;
};

const useBillingStore = create<BillingState>()(
  persist(
    (set, get) => ({
      cpu: 0,
      memory: 0,
      storage: 0,
      gpu: 0,
      network: 0,
      namespaceIdx: 0,
      appTypeIdx: 0,
      cycleIdx: 0,
      regionIdx: 0,
      appNameIdx: 0,
      namespaceList: [['', 'All Workspace']],
      appTypeList: ['all_app_type'],
      regionList: [],
      appNameList: ['All APP'],
      detailIsOpen: false,
      openBillingDetail: () => set({ detailIsOpen: true }),
      closeBillingDetail: () => set({ detailIsOpen: false }),
      setAppNameList(appNameList: string[]) {
        const { getAppName } = get();
        const appName = getAppName();
        const newAppNameIdx = appNameList.findIndex((item) => item === appName);
        const appNameIdx = newAppNameIdx === -1 ? 0 : newAppNameIdx;
        set({ appNameList, appNameIdx });
      },
      setAppTypeList(appTypeList: string[]) {
        set({ appTypeList });
      },
      setRegionList(regionList: RegionClient[]) {
        const { getRegion } = get();
        const region = getRegion();
        const newRegionIdx = regionList.findIndex((item) => item.uid === region?.uid);
        const regionIdx = newRegionIdx === -1 ? 0 : newRegionIdx;
        set({ regionList, regionIdx });
      },
      setNamespaceList(namespaceList: [string, string][]) {
        const { getNamespace } = get();
        const namespace = getNamespace();
        const newNamespaceIdx = namespaceList.findIndex((item) => item[0] === namespace?.[0]);
        const namespaceIdx = newNamespaceIdx === -1 ? 0 : newNamespaceIdx;
        set({ namespaceList, namespaceIdx });
      },
      setAppType(appTypeIdx: number) {
        set({ appTypeIdx });
      },
      setAppName(appNameIdx: number) {
        set({ appNameIdx });
      },
      setNamespace(namespaceIdx: number) {
        set({ namespaceIdx });
      },
      setCycle(cycleIdx: number) {
        set({ cycleIdx });
      },
      setRegion(regionIdx: number) {
        set({ regionIdx });
      },
      getCycle() {
        if (get().cycleIdx === -1) return CYCLE[0];
        return CYCLE[get().cycleIdx];
      },
      getAppName() {
        const { appNameIdx, appNameList } = get();
        if (appNameIdx === -1 || appNameIdx === 0 || appNameList.length === 0) return '';
        return appNameList[appNameIdx];
      },
      getAppType() {
        if (get().appTypeIdx === -1 || get().appTypeIdx === 0 || get().appTypeList.length === 0)
          return '';
        return get().appTypeList[get().appTypeIdx];
      },
      getRegion() {
        if (get().regionIdx === -1 || get().regionList.length === 0) return null;
        return get().regionList[get().regionIdx];
      },
      getNamespace() {
        if (get().namespaceIdx === -1 || get().namespaceList.length === 0) return null;
        return get().namespaceList[get().namespaceIdx];
      },
      updateCpu: (cpu: number) => set({ cpu: formatMoney(cpu) }),
      updateMemory: (memory: number) => set({ memory: formatMoney(memory) }),
      updateStorage: (storage: number) => set({ storage: formatMoney(storage) }),
      updateNetwork: (network: number) => set({ network: formatMoney(network) }),
      updateGpu: (gpu: number) => set({ gpu: formatMoney(gpu) })
    }),
    {
      name: 'billing-query-store'
    }
  )
);

export default useBillingStore;

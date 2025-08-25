import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools, persist } from 'zustand/middleware';

import { getRuntime } from '@/api/platform';
import { RuntimeTypeMap, RuntimeVersionMap } from '@/types/static';

type State = {
  languageTypeList: RuntimeTypeMap[];
  frameworkTypeList: RuntimeTypeMap[];
  osTypeList: RuntimeTypeMap[];

  runtimeNamespaceMap: {
    [key: string]: string;
  };

  languageVersionMap: RuntimeVersionMap;
  frameworkVersionMap: RuntimeVersionMap;
  osVersionMap: RuntimeVersionMap;

  setRuntime: () => Promise<void>;
  getRuntimeVersionList: (runtimeType: string) => {
    value: string;
    label: string;
    defaultPorts: number[];
  }[];
  getRuntimeDetailLabel: (runtimeType: string, runtimeVersion: string) => string;
  getRuntimeVersionDefault: (runtimeType: string) => string;
  isGPURuntimeType: (runtimeType: string) => boolean;
};

export const useRuntimeStore = create<State>()(
  devtools(
    persist(
      immer((set, get) => ({
        languageTypeList: [],
        frameworkTypeList: [],
        osTypeList: [],

        runtimeNamespaceMap: {},

        languageVersionMap: {},
        frameworkVersionMap: {},
        osVersionMap: {},

        async setRuntime() {
          const res = await getRuntime();
          set((state) => {
            Object.assign(state, res);
          });
        },
        getRuntimeVersionList(runtimeType: string) {
          const { languageVersionMap, frameworkVersionMap, osVersionMap } = get();
          const versions =
            languageVersionMap[runtimeType] ||
            frameworkVersionMap[runtimeType] ||
            osVersionMap[runtimeType] ||
            [];
          return versions.map((i) => ({
            value: i.id,
            label: i.label,
            defaultPorts: i.defaultPorts
          }));
        },
        getRuntimeDetailLabel(runtimeType: string, runtimeVersion: string) {
          const { languageVersionMap, frameworkVersionMap, osVersionMap } = get();
          const versions =
            languageVersionMap[runtimeType] ||
            frameworkVersionMap[runtimeType] ||
            osVersionMap[runtimeType];

          const version = versions.find((i) => i.id === runtimeVersion);
          return `${runtimeType}-${version?.label}`;
        },
        getRuntimeVersionDefault(runtimeType: string) {
          const { languageVersionMap, frameworkVersionMap, osVersionMap } = get();
          return (
            languageVersionMap[runtimeType]?.[0]?.id ||
            frameworkVersionMap[runtimeType]?.[0]?.id ||
            osVersionMap[runtimeType]?.[0]?.id
          );
        },
        isGPURuntimeType(runtimeType: string) {
          const { languageTypeList, frameworkTypeList, osTypeList } = get();
          return (
            languageTypeList.find((i) => i.id === runtimeType)?.gpu ||
            frameworkTypeList.find((i) => i.id === runtimeType)?.gpu ||
            osTypeList.find((i) => i.id === runtimeType)?.gpu ||
            false
          );
        }
      })),
      {
        name: 'runtime-storage'
      }
    )
  )
);

import { getRuntime } from '@/api/platform'
import { RuntimeTypeMap, RuntimeVersionMap } from '@/types/static'
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

type State = {
  languageTypeList: RuntimeTypeMap[]
  frameworkTypeList: RuntimeTypeMap[]
  osTypeList: RuntimeTypeMap[]

  runtimeNamespaceMap: {
    [key: string]: string
  }

  languageVersionMap: RuntimeVersionMap
  frameworkVersionMap: RuntimeVersionMap
  osVersionMap: RuntimeVersionMap

  setRuntime: () => Promise<void>
  getRuntimeVersionList: (runtimeType: string) => {
    value: string
    label: string
    defaultPorts: number[]
  }[]
  getRuntimeDetailLabel: (runtimeType: string, runtimeVersion: string) => string
  getRuntimeVersionDefault: (runtimeType: string) => string
}

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
          const res = await getRuntime()
          set((state) => {
            state.languageTypeList = res.languageTypeList
            state.frameworkTypeList = res.frameworkTypeList
            state.osTypeList = res.osTypeList
            state.runtimeNamespaceMap = res.runtimeNamespaceMap
            state.languageVersionMap = res.languageVersionMap
            state.frameworkVersionMap = res.frameworkVersionMap
            state.osVersionMap = res.osVersionMap
          })
        },
        getRuntimeVersionList(runtimeType: string) {
          const { languageVersionMap, frameworkVersionMap, osVersionMap } = get()
          const versions =
            languageVersionMap[runtimeType] ||
            frameworkVersionMap[runtimeType] ||
            osVersionMap[runtimeType] ||
            []
          return versions.map((i) => ({
            value: i.id,
            label: i.label,
            defaultPorts: i.defaultPorts
          }))
        },
        getRuntimeDetailLabel(runtimeType: string, runtimeVersion: string) {
          const { languageVersionMap, frameworkVersionMap, osVersionMap } = get()
          const versions =
            languageVersionMap[runtimeType] ||
            frameworkVersionMap[runtimeType] ||
            osVersionMap[runtimeType]

          const version = versions.find((i) => i.id === runtimeVersion)
          return `${runtimeType}-${version?.label}`
        },
        getRuntimeVersionDefault(runtimeType: string) {
          const { languageVersionMap, frameworkVersionMap, osVersionMap } = get()
          return (
            languageVersionMap[runtimeType]?.[0]?.id ||
            frameworkVersionMap[runtimeType]?.[0]?.id ||
            osVersionMap[runtimeType]?.[0]?.id
          )
        }
      })),
      {
        name: 'runtime-storage',
        partialize: (state) => ({
          languageTypeList: state.languageTypeList,
          frameworkTypeList: state.frameworkTypeList,
          osTypeList: state.osTypeList,
          runtimeNamespaceMap: state.runtimeNamespaceMap,
          languageVersionMap: state.languageVersionMap,
          frameworkVersionMap: state.frameworkVersionMap,
          osVersionMap: state.osVersionMap
        })
      }
    )
  )
)

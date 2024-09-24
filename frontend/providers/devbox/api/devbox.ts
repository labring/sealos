import { V1Pod } from '@kubernetes/client-node'

import {
  DevboxEditType,
  DevboxListItemType,
  DevboxPatchPropsType,
  DevboxVersionListItemType,
  runtimeNamespaceMapType
} from '@/types/devbox'
import { GET, POST, DELETE } from '@/services/request'
import { KBDevboxType, KBDevboxReleaseType } from '@/types/k8s'
import { MonitorDataResult, MonitorQueryKey } from '@/types/monitor'
import { adaptDevboxListItem, adaptDevboxVersionListItem, adaptPod } from '@/utils/adapt'

export const getMyDevboxList = () =>
  GET<KBDevboxType[]>('/api/getDevboxList').then((data): DevboxListItemType[] =>
    data.map(adaptDevboxListItem)
  )

export const applyYamlList = (yamlList: string[], type: 'create' | 'replace' | 'update') =>
  POST('/api/applyYamlList', { yamlList, type })

export const createDevbox = (payload: {
  devboxForm: DevboxEditType
  runtimeNamespaceMap: runtimeNamespaceMapType
}) => POST(`/api/createDevbox`, payload)

export const updateDevbox = (payload: { patch: DevboxPatchPropsType; devboxName: string }) =>
  POST(`/api/updateDevbox`, payload)

export const delDevbox = (devboxName: string, networks: string[]) =>
  DELETE('/api/delDevbox', { devboxName, networks: JSON.stringify(networks) })

export const restartDevbox = (data: { devboxName: string }) => POST('/api/restartDevbox', data)

export const startDevbox = (data: { devboxName: string }) => POST('/api/startDevbox', data)

export const pauseDevbox = (data: { devboxName: string }) => POST('/api/pauseDevbox', data)

export const getDevboxVersionList = (devboxName: string, devboxUid: string) =>
  GET<KBDevboxReleaseType[]>('/api/getDevboxVersionList', { devboxName, devboxUid }).then(
    (data): DevboxVersionListItemType[] => data.map(adaptDevboxVersionListItem)
  )

export const releaseDevbox = (data: {
  devboxName: string
  tag: string
  releaseDes: string
  devboxUid: string
}) => POST('/api/releaseDevbox', data)

export const editDevboxVersion = (data: { name: string; releaseDes: string }) =>
  POST('/api/editDevboxVersion', data)

export const delDevboxVersionByName = (versionName: string) =>
  DELETE('/api/delDevboxVersionByName', { versionName })

export const getSSHConnectionInfo = (data: { devboxName: string; runtimeName: string }) =>
  GET('/api/getSSHConnectionInfo', data)

export const getDevboxPodsByDevboxName = (name: string) =>
  GET<V1Pod[]>('/api/getDevboxPodsByDevboxName', { name }).then((item) => item.map(adaptPod))

export const getDevboxMonitorData = (payload: {
  queryName: string
  queryKey: keyof MonitorQueryKey
  step: string
}) => GET<MonitorDataResult[]>(`/api/monitor/getMonitorData`, payload)

export const getSSHRuntimeInfo = (runtimeName: string) =>
  GET('/api/getSSHRuntimeInfo', { runtimeName })

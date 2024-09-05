import { KBDevboxType, KBDevboxVersionType } from '@/types/k8s'
import { GET, POST, DELETE } from '@/services/request'
import { adaptDevboxListItem, adaptDevboxVersionListItem } from '@/utils/adapt'
import { runtimeNamespaceMap } from '../stores/static'
import {
  DevboxEditType,
  DevboxListItemType,
  DevboxPatchPropsType,
  DevboxVersionListItemType
} from '@/types/devbox'

export const getMyDevboxList = () =>
  GET<KBDevboxType[]>('/api/getDevboxList').then((data): DevboxListItemType[] =>
    data.map(adaptDevboxListItem)
  )

// for devbox operator: restart,
export const applyYamlList = (yamlList: string[], type: 'create' | 'replace' | 'update') =>
  POST('/api/applyYamlList', { yamlList, type })

export const createDevbox = (payload: {
  devboxForm: DevboxEditType
  runtimeNamespaceMap: { [key: string]: string }
}) => POST(`/api/createDevbox`, payload)

export const updateDevbox = (payload: { patch: DevboxPatchPropsType; devboxName: string }) =>
  POST(`/api/updateDevbox`, payload)

export const delDevbox = (devboxName: string, networks: string[]) =>
  DELETE('/api/delDevbox', { devboxName, networks: JSON.stringify(networks) })

export const restartDevbox = (data: { devboxName: string }) => POST('/api/restartDevbox', data)

export const startDevbox = (data: { devboxName: string }) => POST('/api/startDevbox', data)

export const pauseDevbox = (data: { devboxName: string }) => POST('/api/pauseDevbox', data)

export const getDevboxVersionList = (devboxName: string) =>
  GET<KBDevboxVersionType[]>('/api/getDevboxVersionList', { devboxName }).then(
    (data): DevboxVersionListItemType[] => data.map(adaptDevboxVersionListItem)
  )

export const releaseDevbox = (data: { devboxName: string; tag: string; releaseDes: string }) =>
  POST('/api/releaseDevbox', data)

export const editDevboxVersion = (data: { name: string; releaseDes: string }) =>
  POST('/api/editDevboxVersion', data)

export const delDevboxVersionByName = (versionName: string) =>
  DELETE('/api/delDevboxVersionByName', { versionName })

export const getSSHConnectionInfo = (data: { devboxName: string; runtimeName: string }) =>
  GET('/api/getSSHConnectionInfo', data)

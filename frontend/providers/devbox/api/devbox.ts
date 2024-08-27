import { KBDevboxType, KBDevboxVersionType } from '@/types/k8s'
import { GET, POST, DELETE } from '@/services/request'
import { adaptDevboxListItem, adaptDevboxVersionListItem } from '@/utils/adapt'
import { DevboxEditType, DevboxListItemType, DevboxVersionListItemType } from '@/types/devbox'

export const getMyDevboxList = () =>
  GET<KBDevboxType[]>('/api/getDevboxList').then((data): DevboxListItemType[] =>
    data.map(adaptDevboxListItem)
  )

// for devbox operator: restart,
export const applyYamlList = (yamlList: string[], type: 'create' | 'replace' | 'update') =>
  POST('/api/applyYamlList', { yamlList, type })

export const createDevbox = (payload: { devboxForm: DevboxEditType; isEdit: boolean }) =>
  POST(`/api/createDevbox`, payload)

export const delDevboxByName = (devboxName: string) =>
  DELETE('/api/delDevboxByName', { devboxName })

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

export const getDevboxPassword = (data: { devboxName: string }) =>
  GET('/api/getDevboxPassword', data)
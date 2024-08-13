import { KbPgClusterType } from '@/types/cluster'
import { adaptDevboxListItem } from '@/utils/adapt'
import { GET, POST, DELETE } from '@/services/request'
import { devboxStatusMap } from '@/constants/devbox'
import { DevboxEditType } from '@/types/devbox'

export const getMyDevboxList = () =>
  GET<KbPgClusterType[]>('/api/getDevboxList').then((data) => {
    console.log('test')
    return [
      {
        id: 1,
        name: 'first-devbox',
        runtimeType: 'node',
        status: devboxStatusMap['Creating'],
        createTime: '2024-08-09 12:02',
        cpu: 2,
        memory: 4,
        usedCpu: {
          name: 'usedCpu',
          xData: [
            1691583720000, // '2024-08-09 12:02'
            1691583780000, // '2024-08-09 12:03'
            1691583840000, // '2024-08-09 12:04'
            1691583900000, // '2024-08-09 12:05'
            1691583960000 // '2024-08-09 12:06'
          ],
          yData: ['0.1', '0.2', '0.3', '0.4', '0.5']
        },
        usedMemory: {
          name: 'usedMemory',
          xData: [
            1691583720000, // '2024-08-09 12:02'
            1691583780000, // '2024-08-09 12:03'
            1691583840000, // '2024-08-09 12:04'
            1691583900000, // '2024-08-09 12:05'
            1691583960000 // '2024-08-09 12:06'
          ],
          yData: ['0.1', '0.2', '0.3', '0.4', '0.5']
        }
      }
    ]
  })

export const applyYamlList = (yamlList: string[], type: 'create' | 'replace' | 'update') =>
  POST('/api/applyYamlList', { yamlList, type })

export const createDevbox = (payload: { devboxForm: DevboxEditType }) =>
  POST(`/api/createDevbox`, payload)

import { KbPgClusterType } from '@/types/cluster'
import { adaptDevboxListItem } from '@/utils/adapt'
import { GET, POST, DELETE } from '@/services/request'
import { devboxStatusMap } from '@/constants/devbox'

export const getMyDevboxList = () =>
  GET<KbPgClusterType[]>('/api/getDevboxList').then((data) => {
    console.log('test')
    return [
      {
        id: 1,
        name: 'first-devbox',
        runtime: 'node',
        status: devboxStatusMap['Creating'],
        createTime: '2024-08-09 12:02',
        cpu: 2,
        memory: 4
      }
    ]
  })

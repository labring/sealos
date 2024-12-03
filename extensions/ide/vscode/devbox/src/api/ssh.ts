import fs from 'fs'

import { GlobalStateManager } from '../utils/globalStateManager'

export const parseSSHConfig = (filePath: string) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf-8', (err: any, data: any) => {
      if (err) {
        return reject(err)
      }

      const lines = data.split('\n')
      const devboxList = [] as any[]
      let currentHostObj = {} as any

      lines.forEach((line: string) => {
        line = line.trim()

        if (line.startsWith('Host ')) {
          if (currentHostObj.strictHostKeyChecking) {
            currentHostObj.remotePath = GlobalStateManager.getWorkDir(
              currentHostObj.host
            )
            devboxList.push(currentHostObj)
          }
          currentHostObj = { host: line.split(' ')[1] }
        } else if (line.startsWith('HostName ')) {
          currentHostObj.hostName = line.split(' ')[1]
        } else if (line.startsWith('User ')) {
          currentHostObj.user = line.split(' ')[1]
        } else if (line.startsWith('Port ')) {
          currentHostObj.port = line.split(' ')[1]
        } else if (line.startsWith('IdentityFile ')) {
          currentHostObj.identityFile = line.split(' ')[1]
        } else if (line.startsWith('IdentitiesOnly ')) {
          currentHostObj.identitiesOnly = line.split(' ')[1]
        } else if (line.startsWith('StrictHostKeyChecking ')) {
          currentHostObj.strictHostKeyChecking = line.split(' ')[1]
        }
      })

      // the last one
      if (!!currentHostObj.strictHostKeyChecking) {
        currentHostObj.remotePath = GlobalStateManager.getWorkDir(
          currentHostObj.host
        )
        devboxList.push(currentHostObj)
      }

      resolve(devboxList)
    })
  })
}

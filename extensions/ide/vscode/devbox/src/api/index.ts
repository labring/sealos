const fs = require('fs')

export const parseSSHConfig = (configFilePath: string) => {
  return new Promise((resolve, reject) => {
    fs.readFile(configFilePath, 'utf-8', (err: any, data: any) => {
      if (err) {
        return reject(err)
      }

      const lines = data.split('\n')
      const devboxList = [] as any[]
      let currentHost = {} as any
      let lastComment = ''

      lines.forEach((line: string) => {
        line = line.trim()

        if (line.startsWith('#')) {
          // 保存注释，特别是 WorkingDir 注释
          lastComment = line
          if (line.startsWith('# WorkingDir:')) {
            currentHost.remotePath = line.split(':')[1].trim()
          }
        } else if (line.startsWith('Host ')) {
          // 如果当前有主机信息且是 usw.sailos.io，则保存
          if (currentHost.hostName === 'usw.sailos.io') {
            devboxList.push(currentHost)
          }
          // 开始新的主机信息
          currentHost = { host: line.split(' ')[1] }
        } else if (line.startsWith('HostName ')) {
          currentHost.hostName = line.split(' ')[1]
        } else if (line.startsWith('User ')) {
          currentHost.user = line.split(' ')[1]
        } else if (line.startsWith('Port ')) {
          currentHost.port = line.split(' ')[1]
        } else if (line.startsWith('IdentityFile ')) {
          currentHost.identityFile = line.split(' ')[1]
        }
      })

      // 最后一个主机信息处理
      if (currentHost.hostName === 'usw.sailos.io') {
        devboxList.push(currentHost)
      }

      resolve(devboxList)
    })
  })
}

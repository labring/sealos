import * as fs from 'fs'
import { GlobalStateManager } from './globalStateManager'
import { Logger } from '../common/logger'

// 将老版本的 ssh 配置改成新版本的 ssh 配置
// # WorkingDir: /home/sealos/project
// Host bja.sealos.run-ns-wappehp7-test-t6unaf4bbob
//   HostName bja.sealos.run
//   User sealos
//   Port 40398
//   IdentityFile ~/.ssh/sealos/bja.sealos.run_ns-wappehp7_test
//   IdentitiesOnly yes
//   StrictHostKeyChecking no

// 转换为下边的：
// Host的转换，去掉随机串，然后-改为_
// 去掉WorkingDir 的注释，改为全局存储
// Host usw.sailos.io_ns-rqtny6y6_devbox
//   HostName usw.sailos.io
//   User devbox
//   Port 31328
//   IdentityFile ~/.ssh/sealos/usw.sailos.io_ns-rqtny6y6_devbox
//   IdentitiesOnly yes
//   StrictHostKeyChecking no
export function convertSSHConfigToVersion2(filePath: string) {
  const output: Record<string, Record<string, string>> = {}
  let result = ''

  const data = fs.readFileSync(filePath, 'utf8')

  if (!data.includes('# WorkingDir:')) {
    Logger.info('SSH config is already in the latest version2.')
    return
  }

  Logger.info('Converting SSH config to the latest version2.')

  const lines = data.split('\n')
  let currentWorkDir: any = null
  let formattedHostName = ''

  lines.forEach((line) => {
    line = line.trim()

    if (line.startsWith('# WorkingDir:')) {
      currentWorkDir = line.split(': ')[1].trim()
      return
    }

    const hostMatch = line.match(/^Host (.+)/)
    if (hostMatch) {
      let hostName = hostMatch[1]
      if (hostName.includes('_ns-')) {
        formattedHostName = hostName
      } else {
        hostName = hostName.replace(/-([^-\s]+)$/, '')
        const namespace = hostName.match(/ns-([a-z0-9]+)(?=-)/)
        if (namespace) {
          formattedHostName = hostName.replace(
            /^(.+)-ns-([a-z0-9]+)-(.+)$/,
            '$1_ns-$2_$3'
          )
        } else {
          formattedHostName = hostName
        }
      }

      output[formattedHostName] = {
        workDir: currentWorkDir,
      }
      return
    }

    if (line && !line.startsWith('# WorkingDir:')) {
      const keyValueMatch = line.match(/(\S+)\s+(.+)/)
      if (keyValueMatch) {
        const [_, key, value] = keyValueMatch
        output[formattedHostName][key] = value
      }
    }
  })

  for (const [host, config] of Object.entries(output)) {
    if (config.workDir) {
      GlobalStateManager.setWorkDir(host, config.workDir)
    }

    result += `Host ${host}\n`
    for (const [key, value] of Object.entries(config)) {
      if (key !== 'workDir') {
        result += `  ${key} ${value}\n`
      }
    }
    result += '\n'
  }
  result = result.trim()
  fs.writeFileSync(filePath, result, { encoding: 'utf8', flag: 'w' })

  Logger.info('SSH config converted to the latest version2.')
}

import * as os from 'os'
import * as fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { GlobalStateManager } from './globalStateManager'

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

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err)
      return
    }

    const lines = data.split('\n')
    let currentWorkDir: any = null
    let formattedHostName = ''

    lines.forEach((line) => {
      line = line.trim()

      // 处理 WorkingDir 行
      if (line.startsWith('# WorkingDir:')) {
        currentWorkDir = line.split(': ')[1].trim()
        return
      }

      // 处理 Host 行
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

        // 初始化 Host 对象
        output[formattedHostName] = {
          workDir: currentWorkDir,
        }
        return
      }

      // 处理其他配置项
      if (currentWorkDir && line) {
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
    fs.writeFileSync(filePath, result, 'utf8')
  })
}

export function ensureFileExists(filePath: string, parentDir: string) {
  if (!fs.existsSync(filePath)) {
    fs.mkdirSync(path.resolve(os.homedir(), parentDir), {
      recursive: true,
    })
    fs.writeFileSync(filePath, '', 'utf8')
    // .ssh/config authority
    if (os.platform() === 'win32') {
      // Windows
      execSync(`icacls "${filePath}" /inheritance:r`)
      execSync(`icacls "${filePath}" /grant:r ${process.env.USERNAME}:F`)
      execSync(`icacls "${filePath}" /remove:g everyone`)
    } else {
      // Unix-like system (Mac, Linux)
      execSync(`chmod 600 "${filePath}"`)
    }
  }
}

import path from 'path'
import * as os from 'os'
import * as fs from 'fs'
import * as vscode from 'vscode'
import SSHConfig from 'ssh-config'
import { Disposable } from '../common/dispose'
import { execSync } from 'child_process'
import { modifiedRemoteSSHConfig } from '../utils/remoteSSHConfig'

const defaultSSHConfigPath = path.resolve(os.homedir(), '.ssh/config')
const defaultDevboxSSHConfigPath = path.resolve(
  os.homedir(),
  '.ssh/sealos/devbox_config'
)
const defaultSSHKeyPath = path.resolve(os.homedir(), '.ssh/sealos')

export class RemoteSSHConnector extends Disposable {
  constructor(context: vscode.ExtensionContext) {
    super()
    if (context.extension.extensionKind === vscode.ExtensionKind.UI) {
      this._register(
        vscode.commands.registerCommand('devbox.connectRemoteSSH', (args) =>
          this.connectRemoteSSH(args)
        )
      )
    }
  }

  private async ensureRemoteSSHExtInstalled(): Promise<boolean> {
    const isOfficialVscode =
      vscode.env.uriScheme === 'vscode' ||
      vscode.env.uriScheme === 'vscode-insiders'
    if (!isOfficialVscode) {
      return true
    }

    const msVscodeRemoteExt = vscode.extensions.getExtension(
      'ms-vscode-remote.remote-ssh'
    )
    if (msVscodeRemoteExt) {
      return true
    }

    const install = 'Install'
    const cancel = 'Cancel'

    const action = await vscode.window.showInformationMessage(
      'Please install "Remote - SSH" extension to connect to a Gitpod workspace.',
      { modal: true },
      install,
      cancel
    )

    if (action === cancel) {
      return false
    }

    vscode.window.showInformationMessage(
      'Installing "ms-vscode-remote.remote-ssh" extension'
    )

    await vscode.commands.executeCommand(
      'extension.open',
      'ms-vscode-remote.remote-ssh'
    )
    await vscode.commands.executeCommand(
      'workbench.extensions.installExtension',
      'ms-vscode-remote.remote-ssh'
    )

    return true
  }

  private async connectRemoteSSH(args: {
    sshDomain: string
    sshPort: string
    base64PrivateKey: string
    sshHostLabel: string
    workingDir: string
  }) {
    this.ensureRemoteSSHExtInstalled()

    const { sshDomain, sshPort, base64PrivateKey, sshHostLabel, workingDir } =
      args

    const randomSuffix = Math.random().toString(36).substring(2, 15)
    const newSshHostLabel = sshHostLabel.replace(/\//g, '-')
    const suffixSSHHostLabel = `${newSshHostLabel}-${randomSuffix}`

    modifiedRemoteSSHConfig(newSshHostLabel, suffixSSHHostLabel)

    const sshUser = sshDomain.split('@')[0]
    const sshHost = sshDomain.split('@')[1]

    // sshHostLabel: usw.sailos.io/ns-admin/devbox-1
    // identityFileSSHLabel: usw.sailos.io_ns-admin_devbox-1
    const identityFileSSHLabel = sshHostLabel.replace(/\//g, '_')

    const normalPrivateKey = Buffer.from(base64PrivateKey, 'base64')

    const sshConfig = new SSHConfig().append({
      Host: suffixSSHHostLabel,
      HostName: sshHost,
      User: sshUser,
      Port: sshPort,
      IdentityFile: `~/.ssh/sealos/${identityFileSSHLabel}`,
      IdentitiesOnly: 'yes',
      StrictHostKeyChecking: 'no',
    })
    const sshConfigString = SSHConfig.stringify(sshConfig)

    try {
      // 1. ensure .ssh/config exists
      if (!fs.existsSync(defaultSSHConfigPath)) {
        fs.mkdirSync(path.resolve(os.homedir(), '.ssh'), {
          recursive: true,
        })
        fs.writeFileSync(defaultSSHConfigPath, '', 'utf8')
        // 设置 .ssh/config 文件的权限
        if (os.platform() === 'win32') {
          // Windows 系统
          execSync(`icacls "${defaultSSHConfigPath}" /inheritance:r`)
          execSync(
            `icacls "${defaultSSHConfigPath}" /grant:r ${process.env.USERNAME}:F`
          )
          execSync(`icacls "${defaultSSHConfigPath}" /remove:g everyone`)
        } else {
          // Unix-like 系统 (Mac, Linux)
          execSync(`chmod 600 "${defaultSSHConfigPath}"`)
        }
      }
      // 2. ensure .ssh/sealos/devbox_config exists and has the correct jurisdiction
      if (!fs.existsSync(defaultDevboxSSHConfigPath)) {
        fs.mkdirSync(path.resolve(os.homedir(), '.ssh/sealos'), {
          recursive: true,
        })
        fs.writeFileSync(defaultDevboxSSHConfigPath, '', 'utf8')
        // 针对mac和windows区别处理
        if (os.platform() === 'win32') {
          // 移除继承的权限
          execSync(`icacls "${defaultDevboxSSHConfigPath}" /inheritance:r`)
          // 为当前用户授予完全控制权限
          execSync(
            `icacls "${defaultDevboxSSHConfigPath}" /grant:r ${process.env.USERNAME}:F`
          )
          // 确保其他用户无法访问
          execSync(`icacls "${defaultDevboxSSHConfigPath}" /remove:g everyone`)
        } else {
          // 设置文件权限为 600（仅文件所有者可读写）
          execSync(`chmod 600 "${defaultDevboxSSHConfigPath}"`)
        }
      }

      // 3. ensure .ssh/config includes .ssh/sealos/devbox_config
      const existingSSHConfig = fs.readFileSync(defaultSSHConfigPath, 'utf8')
      if (!existingSSHConfig.includes('Include ~/.ssh/sealos/devbox_config')) {
        let existingSSHConfig = fs.readFileSync(defaultSSHConfigPath, 'utf-8')
        const newConfig =
          'Include ~/.ssh/sealos/devbox_config\n' + existingSSHConfig
        fs.writeFileSync(defaultSSHConfigPath, newConfig)
      }

      // 读取现有的 devbox 配置文件
      const existingDevboxConfigLines = fs
        .readFileSync(defaultDevboxSSHConfigPath, 'utf8')
        .split('\n')

      // 用于存储需要保留的配置行
      const newDevboxConfigLines = []
      let skipLines = false

      for (let i = 0; i < existingDevboxConfigLines.length; i++) {
        const line = existingDevboxConfigLines[i].trim()

        if (
          line.startsWith('Host') &&
          line.substring(5).trim().startsWith(newSshHostLabel)
        ) {
          // 如果当前行是要删除的 Host，开始跳过
          skipLines = true
          continue
        }

        if (skipLines) {
          // 检查是否到达下一个 Host 或文件结束
          if (
            (line.startsWith('Host') && !line.startsWith('HostName')) ||
            i === existingDevboxConfigLines.length - 1
          ) {
            skipLines = false
          }
        }

        if (!skipLines) {
          newDevboxConfigLines.push(existingDevboxConfigLines[i])
        }
      }

      // 将新的配置写回文件
      fs.writeFileSync(
        defaultDevboxSSHConfigPath,
        newDevboxConfigLines.join('\n')
      )

      // 5. write new ssh config to .ssh/sealos/devbox_config
      fs.appendFileSync(
        defaultDevboxSSHConfigPath,
        `\n# WorkingDir: ${workingDir}\n`
      )
      fs.appendFileSync(defaultDevboxSSHConfigPath, sshConfigString)
      vscode.window.showInformationMessage(
        `SSH configuration for ${sshHost} with port ${sshPort} has been added.`
      )
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to write SSH configuration: ${error}`
      )
    }

    // create sealos privateKey file in .ssh/sealos
    try {
      const sshKeyPath = defaultSSHKeyPath + `/${identityFileSSHLabel}`
      fs.writeFileSync(sshKeyPath, normalPrivateKey)

      // 针对mac和windows区别处理
      if (os.platform() === 'win32') {
        // noscan
        // 移除继承的权限
        execSync(`icacls "${sshKeyPath}" /inheritance:r`)
        // 为当前用户授予完全控制权限
        execSync(`icacls "${sshKeyPath}" /grant:r ${process.env.USERNAME}:F`)
        // 确保其他用户无法访问
        execSync(`icacls "${sshKeyPath}" /remove:g everyone`)
      } else {
        // 设置文件权限为 600（仅文件所有者可读写）
        execSync(`chmod 600 "${sshKeyPath}"`)
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to write SSH private key: ${error}`
      )
    }

    // 创建一个新的连接并打开新的窗口
    await vscode.commands.executeCommand(
      'vscode.openFolder',
      vscode.Uri.parse(
        `vscode-remote://ssh-remote+${suffixSSHHostLabel}${workingDir}`
      ),
      {
        forceNewWindow: true,
      }
    )
    await vscode.window.showInformationMessage(
      `Connected to ${sshHost} with port ${sshPort} successfully.`
    )
  }
}

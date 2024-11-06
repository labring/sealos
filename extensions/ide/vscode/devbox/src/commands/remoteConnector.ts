import * as os from 'os'
import * as fs from 'fs'
import * as vscode from 'vscode'
import SSHConfig from 'ssh-config'
import { execSync } from 'child_process'

import { Disposable } from '../common/dispose'
import { modifiedRemoteSSHConfig } from '../utils/remoteSSHConfig'
import {
  defaultSSHConfigPath,
  defaultDevboxSSHConfigPath,
  defaultSSHKeyPath,
} from '../constant/file'
import {
  convertSSHConfigToVersion2,
  ensureFileExists,
} from '../utils/sshConfig'

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
  private sshConfigPreProcess() {
    // 1. ensure .ssh/config exists
    ensureFileExists(defaultSSHConfigPath, '.ssh')
    // 2. ensure .ssh/sealos/devbox_config exists
    ensureFileExists(defaultDevboxSSHConfigPath, '.ssh/sealos')
    // 3. ensure .ssh/config includes .ssh/sealos/devbox_config
    const existingSSHConfig = fs.readFileSync(defaultSSHConfigPath, 'utf8')
    if (!existingSSHConfig.includes('Include ~/.ssh/sealos/devbox_config')) {
      let existingSSHConfig = fs.readFileSync(defaultSSHConfigPath, 'utf-8')
      const newConfig =
        'Include ~/.ssh/sealos/devbox_config\n' + existingSSHConfig
      fs.writeFileSync(defaultSSHConfigPath, newConfig)
    }
    // 4. ensure sshConfig from version1 to version2
    convertSSHConfigToVersion2(defaultDevboxSSHConfigPath)
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

    modifiedRemoteSSHConfig(sshHostLabel)

    const sshUser = sshDomain.split('@')[0]
    const sshHost = sshDomain.split('@')[1]

    // sshHostLabel: usw.sailos.io_ns-admin_devbox-1

    const normalPrivateKey = Buffer.from(base64PrivateKey, 'base64')

    const sshConfig = new SSHConfig().append({
      Host: sshHostLabel,
      HostName: sshHost,
      User: sshUser,
      Port: sshPort,
      IdentityFile: `~/.ssh/sealos/${sshHostLabel}`,
      IdentitiesOnly: 'yes',
      StrictHostKeyChecking: 'no',
    })
    const sshConfigString = SSHConfig.stringify(sshConfig)

    this.sshConfigPreProcess()

    try {
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
          line.substring(5).trim().startsWith(sshHostLabel)
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
      const sshKeyPath = defaultSSHKeyPath + `/${sshHostLabel}`
      fs.writeFileSync(sshKeyPath, normalPrivateKey)

      if (os.platform() === 'win32') {
        execSync(`icacls "${sshKeyPath}" /inheritance:r`)
        execSync(`icacls "${sshKeyPath}" /grant:r ${process.env.USERNAME}:F`)
        execSync(`icacls "${sshKeyPath}" /remove:g everyone`)
      } else {
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
        `vscode-remote://ssh-remote+${sshHostLabel}${workingDir}`
      ),
      {
        forceNewWindow: true,
      }
    )
    await vscode.window.showInformationMessage(
      `Connected to ${sshHost} with port ${sshPort} successfully.`
    )
  }

  private async ensureRemoteSSHExtInstalled(): Promise<boolean> {
    const isOfficialVscode =
      vscode.env.uriScheme === 'vscode' ||
      vscode.env.uriScheme === 'vscode-insiders' ||
      vscode.env.uriScheme === 'cursor'
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
}

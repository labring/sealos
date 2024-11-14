import * as os from 'os'
import * as fs from 'fs'
import * as vscode from 'vscode'
import SSHConfig from 'ssh-config'

import { Disposable } from '../common/dispose'
import { modifiedRemoteSSHConfig } from '../utils/remoteSSHConfig'
import {
  defaultSSHConfigPath,
  defaultDevboxSSHConfigPath,
  defaultSSHKeyPath,
} from '../constant/file'
import { convertSSHConfigToVersion2 } from '../utils/sshConfig'
import { ensureFileAccessPermission, ensureFileExists } from '../utils/file'

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

  private replaceHomePathInConfig(content: string): string {
    const includePattern = /Include ~\/.ssh\/sealos\/devbox_config/
    const includePattern2 = new RegExp(
      `Include ${os.homedir()}/.ssh/sealos/devbox_config`
    )
    const includeLine = `Include "${os.homedir()}/.ssh/sealos/devbox_config"`

    if (includePattern.test(content)) {
      return content.replace(includePattern, includeLine)
    } else if (includePattern2.test(content)) {
      return content.replace(includePattern2, includeLine)
    } else if (content.includes(includeLine)) {
      return content
    } else {
      return `${includeLine}\n${content}`
    }
  }

  private sshConfigPreProcess() {
    // 1. ensure .ssh/config exists
    ensureFileExists(defaultSSHConfigPath, '.ssh')
    // 2. ensure .ssh/sealos/devbox_config exists
    ensureFileExists(defaultDevboxSSHConfigPath, '.ssh/sealos')

    const customConfigFile = vscode.workspace
      .getConfiguration('remote.SSH')
      .get<string>('configFile', '')

    if (customConfigFile) {
      const resolvedPath = customConfigFile.replace(/^~/, os.homedir())
      try {
        const existingSSHConfig = fs.readFileSync(resolvedPath, 'utf8')
        const updatedConfig = this.replaceHomePathInConfig(existingSSHConfig)
        if (updatedConfig !== existingSSHConfig) {
          fs.writeFileSync(resolvedPath, updatedConfig)
        }
      } catch (error) {
        console.error(`Error reading/writing SSH config: ${error}`)
        this.handleDefaultSSHConfig()
      }
    } else {
      this.handleDefaultSSHConfig()
    }
    // 4. ensure sshConfig from version1 to version2
    convertSSHConfigToVersion2(defaultDevboxSSHConfigPath)
  }

  private handleDefaultSSHConfig() {
    const existingSSHConfig = fs.readFileSync(defaultSSHConfigPath, 'utf8')
    const updatedConfig = this.replaceHomePathInConfig(existingSSHConfig)
    if (updatedConfig !== existingSSHConfig) {
      fs.writeFileSync(defaultSSHConfigPath, updatedConfig)
    }
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
      const existingDevboxConfigLines = fs
        .readFileSync(defaultDevboxSSHConfigPath, 'utf8')
        .split('\n')

      //  replace the existing ssh config item
      const newDevboxConfigLines = []
      let skipLines = false

      for (let i = 0; i < existingDevboxConfigLines.length; i++) {
        const line = existingDevboxConfigLines[i].trim()

        if (
          line.startsWith('Host ') &&
          line.substring(5).trim().startsWith(sshHostLabel)
        ) {
          skipLines = true
          continue
        }

        if (skipLines) {
          if (
            line.startsWith('Host ') ||
            i === existingDevboxConfigLines.length
          ) {
            skipLines = false
          }
        }

        if (!skipLines) {
          newDevboxConfigLines.push(existingDevboxConfigLines[i])
        }
      }

      fs.writeFileSync(
        defaultDevboxSSHConfigPath,
        newDevboxConfigLines.join('\n')
      )

      // 5. write new ssh config to .ssh/sealos/devbox_config
      fs.appendFileSync(defaultDevboxSSHConfigPath, `\n${sshConfigString}\n`)
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to write SSH configuration: ${error}`
      )
    }

    // 6. create sealos privateKey file in .ssh/sealos
    try {
      const sshKeyPath = defaultSSHKeyPath + `/${sshHostLabel}`
      fs.writeFileSync(sshKeyPath, normalPrivateKey)
      ensureFileAccessPermission(sshKeyPath)
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to write SSH private key: ${error}`
      )
    }

    await vscode.commands.executeCommand(
      'vscode.openFolder',
      vscode.Uri.parse(
        `vscode-remote://ssh-remote+${sshHostLabel}${workingDir}`
      ),
      {
        forceNewWindow: true,
      }
    )

    // refresh devboxList
    await vscode.commands.executeCommand('devboxDashboard.refresh')
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

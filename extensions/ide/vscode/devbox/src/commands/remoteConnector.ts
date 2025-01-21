import * as os from 'os'
import * as fs from 'fs'
import dayjs from 'dayjs'
import * as vscode from 'vscode'
import SSHConfig from 'ssh-config'

import {
  defaultSSHConfigPath,
  defaultDevboxSSHConfigPath,
  defaultSSHKeyPath,
} from '../constant/file'
import { Logger } from '../common/logger'
import { Disposable } from '../common/dispose'
import { convertSSHConfigToVersion2 } from '../utils/sshConfig'
import { GlobalStateManager } from '../utils/globalStateManager'
import { ensureFileAccessPermission, ensureFileExists } from '../utils/file'
import { modifiedRemoteSSHConfig } from '../utils/remoteSSHConfig'

const message = {
  FailedToWriteSSHConfig: vscode.l10n.t('Failed to write SSH configuration'),
  FailedToWriteSSHPrivateKey: vscode.l10n.t('Failed to write SSH private key'),
  PleaseInstallRemoteSSH: vscode.l10n.t(
    'Please install "Remote - SSH" extension to connect to a devbox workspace.'
  ),
  Install: vscode.l10n.t('Install'),
  Cancel: vscode.l10n.t('Cancel'),
}

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
    const includePattern = new RegExp(
      `Include ${os.homedir()}/.ssh/sealos/devbox_config`,
      'g'
    )
    const includePattern2 = new RegExp(
      `Include "${os.homedir()}/.ssh/sealos/devbox_config"`,
      'g'
    )

    const includeLine = `Include ~/.ssh/sealos/devbox_config`

    if (includePattern.test(content)) {
      return content.replace(includePattern, '')
    }

    if (includePattern2.test(content)) {
      return content.replace(includePattern2, '')
    }

    if (content.includes(includeLine)) {
      return content
    }

    return `${includeLine}\n${content}`
  }

  private sshConfigPreProcess() {
    Logger.info('SSH config pre-processing')
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

    Logger.info('SSH config pre-processing completed')
  }
  // backup the devbox ssh config
  private sshConfigPostProcess() {
    Logger.info('SSH config post-processing')

    try {
      const devboxSSHConfig = fs.readFileSync(
        defaultDevboxSSHConfigPath,
        'utf8'
      )
      const backupFolderPath = defaultSSHKeyPath + '/backup/devbox_config'
      if (!fs.existsSync(backupFolderPath)) {
        fs.mkdirSync(backupFolderPath, { recursive: true })
      }
      const backFileName = dayjs().format('YYYY-MM-DD_HH-mm-ss')
      const backupFilePath = `${backupFolderPath}/${backFileName}`

      fs.writeFileSync(backupFilePath, devboxSSHConfig)
      Logger.info(`SSH config backed up to ${backupFilePath}`)
    } catch (error) {
      Logger.error(`Failed to backup SSH config: ${error}`)
    }
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
    Logger.info(`Connecting to remote SSH: ${args.sshHostLabel}`)

    await this.ensureRemoteSSHExtInstalled()

    const { sshDomain, sshPort, base64PrivateKey, sshHostLabel, workingDir } =
      args

    const sshUser = sshDomain.split('@')[0]
    const sshHost = sshDomain.split('@')[1]

    await modifiedRemoteSSHConfig(sshHostLabel)

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

    GlobalStateManager.addApiRegion(sshHost)

    this.sshConfigPreProcess()

    try {
      Logger.info('Writing SSH config to .ssh/sealos/devbox_config')

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

      Logger.info('SSH config written to .ssh/sealos/devbox_config')
    } catch (error) {
      Logger.error(`Failed to write SSH configuration: ${error}`)
      vscode.window.showErrorMessage(
        `${message.FailedToWriteSSHConfig}: ${error}`
      )
    }

    // 6. create sealos privateKey file in .ssh/sealos
    try {
      Logger.info('Creating sealos privateKey file in .ssh/sealos')
      const sshKeyPath = defaultSSHKeyPath + `/${sshHostLabel}`
      fs.writeFileSync(sshKeyPath, normalPrivateKey)
      ensureFileAccessPermission(sshKeyPath)
      Logger.info('Sealos privateKey file created in .ssh/sealos')
    } catch (error) {
      Logger.error(`Failed to write SSH private key: ${error}`)
      vscode.window.showErrorMessage(
        `${message.FailedToWriteSSHPrivateKey}: ${error}`
      )
    }

    Logger.info('Opening Devbox in VSCode')

    await vscode.commands.executeCommand(
      'vscode.openFolder',
      vscode.Uri.parse(
        `vscode-remote://ssh-remote+${sshHostLabel}${workingDir}`
      ),
      {
        forceNewWindow: true,
      }
    )

    Logger.info('Devbox opened in VSCode')

    // refresh devboxList
    await vscode.commands.executeCommand('devboxDashboard.refresh')

    this.sshConfigPostProcess()
  }

  private async ensureRemoteSSHExtInstalled(): Promise<boolean> {
    const isOfficialVscode =
      vscode.env.uriScheme === 'vscode' ||
      vscode.env.uriScheme === 'vscode-insiders' ||
      vscode.env.uriScheme === 'cursor'
    const isTrae = vscode.env.uriScheme === 'trae'

    // windsurf has remote-ssh inside already
    if (!isOfficialVscode && !isTrae) {
      return true
    }

    const remoteSSHId = isOfficialVscode
      ? 'ms-vscode-remote.remote-ssh'
      : 'labring.open-remote-ssh-for-trae'

    const msVscodeRemoteExt = vscode.extensions.getExtension(remoteSSHId)

    if (msVscodeRemoteExt) {
      return true
    }

    const install = message.Install
    const cancel = message.Cancel

    const action = await vscode.window.showInformationMessage(
      message.PleaseInstallRemoteSSH,
      { modal: true },
      install,
      cancel
    )

    if (action === cancel) {
      return false
    }

    await vscode.commands.executeCommand('extension.open', remoteSSHId)
    await vscode.commands.executeCommand(
      'workbench.extensions.installExtension',
      remoteSSHId
    )

    Logger.info(`"${remoteSSHId}" extension is installed`)

    return true
  }
}

import fs from 'fs'
import * as vscode from 'vscode'

import { Logger } from '../common/logger'
import { parseSSHConfig } from '../api/ssh'
import { Disposable } from '../common/dispose'
import { DevboxListItem } from '../types/devbox'
import { getDevboxDetail } from '../api/devbox'
import { convertSSHConfigToVersion2 } from '../utils/sshConfig'
import { GlobalStateManager } from '../utils/globalStateManager'
import { defaultDevboxSSHConfigPath, defaultSSHKeyPath } from '../constant/file'

const messages = {
  pleaseSelectARegion: vscode.l10n.t(
    'Please select a region,RegionList are added by your each connection.'
  ),
  onlyDevboxCanBeOpened: vscode.l10n.t('Only Devbox can be opened.'),
  areYouSureToDelete: vscode.l10n.t('Are you sure to delete?'),
  deleteLocalConfigOnly: vscode.l10n.t(
    'This action will only delete the devbox ssh config in the local environment.'
  ),
  deleteDevboxFailed: vscode.l10n.t('Delete Devbox failed.'),
  feedbackInGitHub: vscode.l10n.t(
    'Give us a feedback in our GitHub repository.'
  ),
  feedbackInHelpDesk: vscode.l10n.t(
    'Give us a feedback in our help desk system.'
  ),
  devboxDeleted: vscode.l10n.t(
    'This Devbox has been deleted in the cloud.Now it cannot be opened. Do you want to delete its local ssh configuration?'
  ),
}

export class DevboxListViewProvider extends Disposable {
  constructor(context: vscode.ExtensionContext) {
    super()
    Logger.info('Initializing DevboxListViewProvider')
    if (context.extension.extensionKind === vscode.ExtensionKind.UI) {
      // view
      const projectTreeDataProvider = new ProjectTreeDataProvider()
      const feedbackTreeDataProvider = new FeedbackTreeDataProvider()
      const devboxDashboardView = vscode.window.createTreeView(
        'devboxDashboard',
        {
          treeDataProvider: projectTreeDataProvider,
        }
      )
      const feedbackTreeView = vscode.window.createTreeView('devboxFeedback', {
        treeDataProvider: feedbackTreeDataProvider,
      })
      this._register(feedbackTreeView)
      this._register(devboxDashboardView)
      this._register(
        devboxDashboardView.onDidChangeVisibility(() => {
          if (devboxDashboardView.visible) {
            projectTreeDataProvider.refreshData()
          }
        })
      )
      // commands
      this._register(
        devboxDashboardView.onDidChangeVisibility(() => {
          if (devboxDashboardView.visible) {
            projectTreeDataProvider.refreshData()
          }
        })
      )
      this._register(
        vscode.commands.registerCommand('devboxDashboard.refresh', () => {
          projectTreeDataProvider.refreshData()
        })
      )
      this._register(
        vscode.commands.registerCommand(
          'devboxDashboard.createDevbox',
          (item: ProjectTreeItem) => {
            projectTreeDataProvider.create(item)
          }
        )
      )
      this._register(
        vscode.commands.registerCommand(
          'devboxDashboard.openDevbox',
          (item: ProjectTreeItem) => {
            projectTreeDataProvider.open(item)
          }
        )
      )
      this._register(
        vscode.commands.registerCommand(
          'devboxDashboard.deleteDevbox',
          (item: ProjectTreeItem) => {
            projectTreeDataProvider.delete(
              item.host,
              item.label as string,
              false
            )
          }
        )
      )
    }
  }
}

class ProjectTreeDataProvider
  implements vscode.TreeDataProvider<ProjectTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    ProjectTreeItem | undefined
  > = new vscode.EventEmitter<ProjectTreeItem | undefined>()
  readonly onDidChangeTreeData: vscode.Event<ProjectTreeItem | undefined> =
    this._onDidChangeTreeData.event
  private treeData: DevboxListItem[] = []

  constructor() {
    if (fs.existsSync(defaultDevboxSSHConfigPath)) {
      convertSSHConfigToVersion2(defaultDevboxSSHConfigPath)
    }
  }

  async refreshData(): Promise<void> {
    const data = (await parseSSHConfig(
      defaultDevboxSSHConfigPath
    )) as DevboxListItem[]

    data.forEach((item) => {
      GlobalStateManager.addApiRegion(item.hostName)
    })

    this.treeData = data

    await Promise.all(
      this.treeData.map(async (item) => {
        const token = GlobalStateManager.getToken(item.host)
        if (!token) {
          return
        }
        try {
          const data = await getDevboxDetail(token, item.hostName)
          const status = data.status.value
          switch (status) {
            case 'Running':
              item.iconPath = new vscode.ThemeIcon('debug-start')
              break
            case 'Stopped':
              item.iconPath = new vscode.ThemeIcon('debug-pause')
              break
            case 'Error':
              item.iconPath = new vscode.ThemeIcon('error')
              break
            default:
              item.iconPath = new vscode.ThemeIcon('question')
          }
        } catch (error) {
          Logger.error(`get devbox detail failed: ${error}`)
          if (
            error.toString().includes('500:secrets') &&
            error.toString().includes('not found')
          ) {
            item.iconPath = new vscode.ThemeIcon('warning')
          }
        }
      })
    )

    this._onDidChangeTreeData.fire(undefined)
  }

  getTreeItem(element: ProjectTreeItem): vscode.TreeItem {
    return element
  }

  async create(item: ProjectTreeItem) {
    const regions = GlobalStateManager.getApiRegionList()

    const selected = await vscode.window.showQuickPick(regions, {
      placeHolder: messages.pleaseSelectARegion,
    })
    if (selected) {
      const targetUrl = selected
      vscode.commands.executeCommand('devbox.openExternalLink', [
        `https://${targetUrl}/?openapp=system-devbox?${encodeURIComponent(
          'page=create'
        )}`,
      ])
    }
  }

  async open(item: ProjectTreeItem) {
    if (item.contextValue !== 'devbox') {
      vscode.window.showInformationMessage(messages.onlyDevboxCanBeOpened)
      return
    }

    if (
      item.iconPath instanceof vscode.ThemeIcon &&
      item.iconPath.id === 'warning'
    ) {
      const result = await vscode.window.showWarningMessage(
        messages.devboxDeleted,
        { modal: true },
        'Yes',
        'No'
      )
      if (result === 'Yes') {
        await this.delete(item.host, item.label as string, true)
      }
      return
    }

    vscode.commands.executeCommand(
      'vscode.openFolder',
      vscode.Uri.parse(
        `vscode-remote://ssh-remote+${item.host}${item.remotePath}`
      ),
      {
        forceNewWindow: true,
      }
    )
  }

  async delete(
    deletedHost: string,
    devboxName: string,
    isDeletedByWeb?: boolean
  ) {
    if (!isDeletedByWeb) {
      const result = await vscode.window.showWarningMessage(
        `${messages.areYouSureToDelete} ${devboxName}?\n(${messages.deleteLocalConfigOnly})`,
        { modal: true },
        'Yes',
        'No'
      )
      if (result !== 'Yes') {
        return
      }
    }

    try {
      const appName = vscode.env.appName

      // 1. remove global state
      GlobalStateManager.remove(deletedHost)

      // 2. remove remote-ssh config if app is not windsurf or Trae
      if (appName !== 'Windsurf' && appName !== 'Trae') {
        const existingSSHHostPlatforms = vscode.workspace
          .getConfiguration('remote.SSH')
          .get<{ [host: string]: string }>('remotePlatform', {})
        const newSSHHostPlatforms = Object.keys(
          existingSSHHostPlatforms
        ).reduce((acc: { [host: string]: string }, host: string) => {
          if (host.startsWith(deletedHost)) {
            return acc
          }
          acc[host] = existingSSHHostPlatforms[host]
          return acc
        }, {})
        await vscode.workspace
          .getConfiguration('remote.SSH')
          .update(
            'remotePlatform',
            newSSHHostPlatforms,
            vscode.ConfigurationTarget.Global
          )
      }

      // 3. remove ssh config
      const content = await fs.promises.readFile(
        defaultDevboxSSHConfigPath,
        'utf8'
      )
      const lines = content.split('\n')

      let newLines = []
      let skipLines = false

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()

        if (line.startsWith('Host ')) {
          const hostValue = line.split(' ')[1]
          if (hostValue === deletedHost) {
            skipLines = true
            continue
          } else {
            skipLines = false
          }
        }

        if (skipLines && line.startsWith('Host ')) {
          skipLines = false
        }

        if (!skipLines) {
          newLines.push(lines[i])
        }
      }

      await fs.promises.writeFile(
        defaultDevboxSSHConfigPath,
        newLines.join('\n')
      )

      // 4. delete private key file
      const privateKeyPath = `${defaultSSHKeyPath}/${deletedHost}`
      fs.rmSync(privateKeyPath)

      // TODO： delete known_host public key

      this.refreshData()
    } catch (error) {
      vscode.window.showErrorMessage(
        `${messages.deleteDevboxFailed}: ${error.message}`
      )
    }
  }

  getChildren(element?: ProjectTreeItem): Thenable<ProjectTreeItem[]> {
    if (!element) {
      // domain/namespace
      const domainNamespacePairs = this.treeData.reduce((acc, item) => {
        const [domain, namespace] = item.host.split('_')
        acc.add(`${domain}/${namespace}`)
        return acc
      }, new Set<string>())

      return Promise.resolve(
        Array.from(domainNamespacePairs).map((pair) => {
          const [domain, namespace] = pair.split('/')
          return new ProjectTreeItem(
            pair,
            domain,
            0,
            vscode.TreeItemCollapsibleState.Collapsed,
            namespace
          )
        })
      )
    } else {
      // devbox
      const [domain, namespace] = element.label?.toString().split('/') || []
      const devboxes = this.treeData.filter((item) => {
        const parts = item.host.split('_')
        return parts[0] === domain && parts[1] === namespace
      })

      return Promise.resolve(
        devboxes.map((devbox) => {
          const parts = devbox.host.split('_')
          const devboxName = parts.slice(2).join('_')
          const treeItem = new ProjectTreeItem(
            devboxName,
            devbox.hostName,
            devbox.port,
            vscode.TreeItemCollapsibleState.None,
            namespace,
            devboxName,
            devbox.host,
            devbox.remotePath,
            devbox.iconPath
          )
          treeItem.contextValue = 'devbox'
          return treeItem
        })
      )
    }
  }
}

class ProjectTreeItem extends vscode.TreeItem {
  domain: string
  namespace?: string
  devboxName?: string
  sshPort: number
  host: string
  remotePath: string

  constructor(
    label: string,
    domain: string,
    sshPort: number,
    collapsibleState: vscode.TreeItemCollapsibleState,
    namespace?: string,
    devboxName?: string,
    host?: string,
    remotePath?: string,
    iconPath?: vscode.ThemeIcon
  ) {
    super(label, collapsibleState)
    this.domain = domain
    this.namespace = namespace
    this.devboxName = devboxName
    this.sshPort = sshPort
    this.host = host || ''
    this.remotePath = remotePath || '/home/sealos/project'
    this.iconPath = iconPath

    this.contextValue = devboxName ? 'devbox' : undefined
  }
}

class FeedbackTreeDataProvider
  implements vscode.TreeDataProvider<FeedbackTreeItem>
{
  getTreeItem(element: FeedbackTreeItem): vscode.TreeItem {
    return element
  }
  getChildren(element?: FeedbackTreeItem): Thenable<FeedbackTreeItem[]> {
    return Promise.resolve([
      new FeedbackTreeItem(
        messages.feedbackInGitHub,
        vscode.TreeItemCollapsibleState.None,
        new vscode.ThemeIcon('github'),
        {
          command: 'devbox.openExternalLink',
          title: 'Open GitHub',
          arguments: ['https://github.com/labring/sealos/issues/new/choose'],
        }
      ),
      new FeedbackTreeItem(
        messages.feedbackInHelpDesk,
        vscode.TreeItemCollapsibleState.None,
        new vscode.ThemeIcon('comment'),
        {
          command: 'devbox.openExternalLink',
          title: 'Open Help Desk',
          arguments: ['https://hzh.sealos.run/?openapp=system-workorder'],
        }
      ),
    ])
  }
}
class FeedbackTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    iconPath?: vscode.ThemeIcon,
    command?: vscode.Command
  ) {
    super(label, collapsibleState)
    this.iconPath = iconPath
    this.contextValue = 'feedback'
    this.command = command
  }
}

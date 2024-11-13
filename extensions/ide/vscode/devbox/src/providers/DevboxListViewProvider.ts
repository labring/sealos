import * as vscode from 'vscode'
import fs from 'fs'

import { parseSSHConfig } from '../api/ssh'
import { Disposable } from '../common/dispose'
import { DevboxListItem } from '../types/devbox'
import { getDevboxDetail } from '../api/devbox'
import { defaultDevboxSSHConfigPath } from '../constant/file'
import { GlobalStateManager } from '../utils/globalStateManager'
import { convertSSHConfigToVersion2 } from '../utils/sshConfig'
import { uswUrl, hzhUrl, bjaUrl, gzgUrl } from '../constant/api'

export class DevboxListViewProvider extends Disposable {
  constructor(context: vscode.ExtensionContext) {
    super()
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
            projectTreeDataProvider.refresh()
          }
        })
      )
      // commands
      this._register(
        vscode.commands.registerCommand('devboxDashboard.refresh', () => {
          projectTreeDataProvider.refresh()
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
    this.refreshData()
    setInterval(() => {
      this.refresh()
    }, 3 * 1000)
  }

  refresh(): void {
    this.refreshData()
  }

  private async refreshData(): Promise<void> {
    convertSSHConfigToVersion2(defaultDevboxSSHConfigPath)
    const data = await parseSSHConfig(defaultDevboxSSHConfigPath)
    this.treeData = data as DevboxListItem[]

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
          console.error(`get devbox detail failed: ${error}`)
          if (
            error.toString().includes('500:secrets') &&
            error.toString().includes('not found')
          ) {
            const hostParts = item.host.split('_')
            const devboxName = hostParts.slice(2).join('_')
            if (error.toString().includes(devboxName)) {
              await this.delete(item.host, devboxName, true)

              return
            }
          }
          item.iconPath = new vscode.ThemeIcon('warning')
        }
      })
    )

    this._onDidChangeTreeData.fire(undefined)
  }

  getTreeItem(element: ProjectTreeItem): vscode.TreeItem {
    return element
  }

  async create(item: ProjectTreeItem) {
    const apiUrl = vscode.workspace.getConfiguration('devbox').get('apiUrl')
    if (apiUrl) {
      vscode.commands.executeCommand('devbox.openExternalLink', [
        `${apiUrl}/?openapp=system-devbox?${encodeURIComponent('page=create')}`,
      ])
      return
    }
    const regions = [
      { label: 'USW', url: uswUrl },
      { label: 'HZH', url: hzhUrl },
      { label: 'BJA', url: bjaUrl },
      { label: 'GZG', url: gzgUrl },
    ]

    const selected = await vscode.window.showQuickPick(
      regions.map((region) => region.label),
      {
        placeHolder:
          'Please select a region.And you can customize your API base address in the settings(devbox.apiUrl).',
      }
    )

    if (selected) {
      const targetUrl = regions.find((r) => r.label === selected)?.url
      vscode.commands.executeCommand('devbox.openExternalLink', [
        `${targetUrl}/?openapp=system-devbox?${encodeURIComponent(
          'page=create'
        )}`,
      ])
    }
  }

  async open(item: ProjectTreeItem) {
    if (item.contextValue !== 'devbox') {
      vscode.window.showInformationMessage('只能打开 Devbox 项目')
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
        `Are you sure to delete ${devboxName}?\n(This action will only delete the devbox ssh config in the local environment.)`,
        { modal: true },
        'Yes',
        'No'
      )
      if (result !== 'Yes') {
        return
      }
    }

    GlobalStateManager.remove(deletedHost)
    // TODO：抽象出一个 crud ssh 文件的模型
    try {
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

      this.refresh()
    } catch (error) {
      vscode.window.showErrorMessage(`Delete devbox failed: ${error.message}`)
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
        'Give us a feedback in our GitHub repository',
        vscode.TreeItemCollapsibleState.None,
        new vscode.ThemeIcon('github'),
        {
          command: 'devbox.openExternalLink',
          title: 'Open GitHub',
          arguments: ['https://github.com/labring/sealos/issues/new/choose'],
        }
      ),
      new FeedbackTreeItem(
        'Give us a feedback in our help desk system',
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

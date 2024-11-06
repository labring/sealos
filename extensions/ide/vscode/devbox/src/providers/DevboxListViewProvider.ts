import * as vscode from 'vscode'

import { parseSSHConfig } from '../api/ssh'
import { Disposable } from '../common/dispose'
import { DevboxListItem } from '../types/devbox'
import { defaultDevboxSSHConfigPath } from '../constant/file'

export class DevboxListViewProvider extends Disposable {
  constructor(context: vscode.ExtensionContext) {
    super()
    if (context.extension.extensionKind === vscode.ExtensionKind.UI) {
      // view
      const projectTreeDataProvider = new MyTreeDataProvider('devboxDashboard')
      // TODO： 完善 feedback部分
      const feedbackTreeDataProvider = new MyTreeDataProvider('devboxFeedback')
      const devboxDashboardView = vscode.window.createTreeView(
        'devboxDashboard',
        {
          treeDataProvider: projectTreeDataProvider,
        }
      )
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
          (item: MyTreeItem) => {
            projectTreeDataProvider.create(item)
          }
        )
      )
      this._register(
        vscode.commands.registerCommand(
          'devboxDashboard.openDevbox',
          (item: MyTreeItem) => {
            projectTreeDataProvider.open(item)
          }
        )
      )
      this._register(
        vscode.commands.registerCommand(
          'devboxDashboard.deleteDevbox',
          (item: MyTreeItem) => {
            projectTreeDataProvider.delete(item)
          }
        )
      )
    }
  }
}

class MyTreeDataProvider implements vscode.TreeDataProvider<MyTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<MyTreeItem | undefined> =
    new vscode.EventEmitter<MyTreeItem | undefined>()
  readonly onDidChangeTreeData: vscode.Event<MyTreeItem | undefined> =
    this._onDidChangeTreeData.event
  private treeData: DevboxListItem[] = []
  private treeName: string

  constructor(treeName: string) {
    this.treeName = treeName
    this.refreshData()
  }

  refresh(): void {
    this.refreshData()
  }

  private refreshData(): void {
    if (this.treeName === 'devboxDashboard') {
      parseSSHConfig(defaultDevboxSSHConfigPath).then((data) => {
        this.treeData = data as DevboxListItem[]
        this._onDidChangeTreeData.fire(undefined)
      })
    } else if (this.treeName === 'devboxFeedback') {
      this.treeData = [
        {
          hostName: 'Give me a feedback in the GitHub repository',
          host: '',
          port: 0,
        },
      ]
      this._onDidChangeTreeData.fire(undefined)
    }
  }

  getTreeItem(element: MyTreeItem): vscode.TreeItem {
    return element
  }

  // TODO: 根据不同的代理跳转到不同的页面，而且可以进行设置里的配置
  create(item: MyTreeItem) {
    vscode.commands.executeCommand('devbox.openExternalLink', [
      'https://usw.sailos.io/?openapp=system-devbox',
    ])
  }

  async open(item: MyTreeItem) {
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

  delete(item: MyTreeItem) {
    vscode.window.showInformationMessage('delete' + item.label)
  }

  getChildren(element?: MyTreeItem): Thenable<MyTreeItem[]> {
    if (!element) {
      // 第一级：显示所有域名
      const domains = [
        ...new Set(this.treeData.map((item) => item.host.split('_')[0])),
      ]
      return Promise.resolve(
        domains.map(
          (domain) =>
            new MyTreeItem(
              domain,
              domain,
              0,
              vscode.TreeItemCollapsibleState.Collapsed
            )
        )
      )
    } else if (!element.namespace) {
      // 第二级：显示指定域名下所有命名空间
      const namespaces = [
        ...new Set(
          this.treeData
            .filter((item) => item.host.startsWith(element.label as string))
            .map((item) => item.host.split('_')[1])
        ),
      ]
      return Promise.resolve(
        namespaces.map(
          (namespace) =>
            new MyTreeItem(
              namespace,
              (element.label as string) ?? '',
              0,
              vscode.TreeItemCollapsibleState.Collapsed,
              namespace
            )
        )
      )
    } else if (!element.devboxName) {
      // 第三级：显示指定命名空间下的所有 devbox
      const devboxes = this.treeData.filter((item) => {
        const parts = item.host.split('_')
        const domain = parts[0]
        const namespace = parts[1]
        return domain === element.domain && namespace === element.namespace
      })
      return Promise.resolve(
        devboxes.map((devbox) => {
          const parts = devbox.host.split('_')
          const devboxName = parts.slice(2).join('_')
          const treeItem = new MyTreeItem(
            devboxName,
            devbox.hostName,
            devbox.port,
            vscode.TreeItemCollapsibleState.None,
            element.namespace,
            devboxName,
            devbox.host,
            devbox.remotePath
          )
          treeItem.contextValue = 'devbox'
          return treeItem
        })
      )
    }
    return Promise.resolve([])
  }
}

class MyTreeItem extends vscode.TreeItem {
  domain: string
  namespace?: string
  devboxName?: string
  sshPort: number
  host: string // 添加这一行
  remotePath: string

  constructor(
    label: string,
    domain: string,
    sshPort: number,
    collapsibleState: vscode.TreeItemCollapsibleState,
    namespace?: string,
    devboxName?: string,
    host?: string,
    remotePath?: string // 添加这个参数
  ) {
    super(label, collapsibleState)
    this.domain = domain
    this.namespace = namespace
    this.devboxName = devboxName
    this.sshPort = sshPort
    this.host = host || '' // 初始化 host 属性
    this.remotePath = remotePath || '/home/sealos/project' // 设置默认值
    // ... 其余代码保持不变

    // 添加这行代码
    this.contextValue = devboxName ? 'devbox' : undefined
  }
}

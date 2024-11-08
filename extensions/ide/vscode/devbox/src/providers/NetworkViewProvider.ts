import * as vscode from 'vscode'
import { getNetworkList, NetworkResponse } from '../api/network'
import { Disposable } from '../common/dispose'

interface Network {
  address: string
  port: number
  protocol: string
}

export class NetworkViewProvider extends Disposable {
  constructor(context: vscode.ExtensionContext) {
    super()
    if (context.extension.extensionKind === vscode.ExtensionKind.UI) {
      const networkTreeDataProvider = new MyNetworkTreeDataProvider()
      const networkView = vscode.window.createTreeView('networkView', {
        treeDataProvider: networkTreeDataProvider,
      })
      this._register(networkView)

      this._register(
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
          networkTreeDataProvider.refresh()
        })
      )
      this._register(
        networkView.onDidChangeVisibility(() => {
          if (networkView.visible) {
            networkTreeDataProvider.refresh()
          }
        })
      )
      this._register(
        vscode.commands.registerCommand('devbox.refreshNetwork', () => {
          networkTreeDataProvider.refresh()
        })
      )
    }
  }
}

class MyNetworkTreeDataProvider
  implements vscode.TreeDataProvider<NetworkItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<NetworkItem | undefined> =
    new vscode.EventEmitter<NetworkItem | undefined>()
  readonly onDidChangeTreeData: vscode.Event<NetworkItem | undefined> =
    this._onDidChangeTreeData.event
  private networks: Network[] = []

  constructor() {
    this.init()
  }

  private async init() {
    this.refresh()
  }

  async refresh(): Promise<void> {
    const networks = await getNetworkList()
    this.networks = networks.map((network: NetworkResponse) => ({
      address: network.address,
      port: network.port,
      protocol: network.protocol,
    }))
    this._onDidChangeTreeData.fire(undefined)
  }

  getTreeItem(element: NetworkItem): vscode.TreeItem {
    return element
  }

  async getChildren(element?: NetworkItem): Promise<NetworkItem[]> {
    if (!element) {
      const items: NetworkItem[] = []
      const remoteName = vscode.env.remoteName

      if (!remoteName) {
        return [
          new NetworkItem(
            'Not connected to the remote environment',
            'no-remote'
          ),
        ]
      }

      items.push(
        new NetworkItem(
          `${'Port'.padEnd(40)}${'Protocol'.padEnd(60)}Address`,
          'header'
        )
      )

      this.networks.forEach((network) => {
        const label = `${network.port
          .toString()
          .padEnd(38)}${network.protocol.padEnd(60)}${network.address}`
        items.push(new NetworkItem(label, 'network'))
      })

      return items
    }
    return []
  }
}

class NetworkItem extends vscode.TreeItem {
  constructor(
    public override readonly label: string,
    public override readonly contextValue: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.None)

    if (contextValue === 'network') {
      this.command = {
        command: 'devbox.openExternalLink',
        title: 'Devbox: Open in Browser',
        arguments: [`https://${label.split(/\s+/).pop() || ''}`],
      }
    }
  }
}

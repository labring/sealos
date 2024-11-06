import * as vscode from 'vscode'
import { getNetworkList, NetworkResponse } from '../api/network'

interface Network {
  address: string
  port: number
  protocol: string
}

export class NetworkViewProvider
  implements vscode.TreeDataProvider<NetworkItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<NetworkItem | undefined> =
    new vscode.EventEmitter<NetworkItem | undefined>()
  readonly onDidChangeTreeData: vscode.Event<NetworkItem | undefined> =
    this._onDidChangeTreeData.event
  constructor() {
    this.init()
  }
  private networks: Network[] = []

  private async init() {
    const networks = await getNetworkList()
    this.networks = networks.map((network: NetworkResponse) => ({
      address: network.address,
      port: network.port,
      protocol: network.protocol,
    }))
    this.refresh()
  }

  refresh(): void {
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

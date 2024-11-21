import * as vscode from 'vscode'
import { getNetworkList, NetworkResponse } from '../api/network'
import { Disposable } from '../common/dispose'

interface Network {
  address: string
  port: number
  protocol: string
}

export class NetworkViewProvider
  extends Disposable
  implements vscode.WebviewViewProvider
{
  private _view?: vscode.WebviewView

  constructor(context: vscode.ExtensionContext) {
    super()
    if (context.extension.extensionKind === vscode.ExtensionKind.UI) {
      context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('networkView', this, {
          webviewOptions: {
            retainContextWhenHidden: true,
          },
        })
      )
      this._register(
        vscode.commands.registerCommand('devbox.refreshNetwork', () => {
          this.refreshNetworks()
        })
      )
    }
  }

  public async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ) {
    this._view = webviewView

    webviewView.webview.options = {
      enableScripts: true,
    }

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'refresh':
          await this.refreshNetworks()
          break
        case 'openExternal':
          vscode.commands.executeCommand('devbox.openExternalLink', message.url)
          break
        case 'openIntegrated':
          vscode.commands.executeCommand('simpleBrowser.show', message.url)
          break
      }
    })

    await this.refreshNetworks()
  }

  private async refreshNetworks() {
    if (!this._view) {
      return
    }

    const networks = await getNetworkList()
    const networkItems = networks.map((network: NetworkResponse) => ({
      address: network.address,
      port: network.port,
      protocol: network.protocol,
    }))

    this._view.webview.html = this.getWebviewContent(networkItems)
  }

  private getWebviewContent(networks: Network[]) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              padding: 0;
              margin: 0;
              height: 100vh;
              overflow: auto;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            th, td {
              padding: 4px 8px;
              text-align: left;
              border: 1px solid var(--vscode-panel-border);
            }
            th {
              position: sticky;
              top: 0;
              background-color: var(--vscode-editor-background);
              z-index: 1;
            }
            tr:hover {
              background-color: var(--vscode-list-hoverBackground);
            }
            .action-btn {
              padding: 2px 8px;
              background: var(--vscode-button-background);
              color: var(--vscode-button-foreground);
              border: none;
              border-radius: 2px;
              cursor: pointer;
              margin-right: 4px;
            }
            .action-btn:hover {
              background: var(--vscode-button-hoverBackground);
            }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th>Port</th>
                <th>Protocol</th>
                <th>Address</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${networks
                .map(
                  (network) => `
                <tr>
                  <td>${network.port}</td>
                  <td>${network.protocol}</td>
                  <td>${network.address}</td>
                  <td>
                    <button class="action-btn" onclick="openExternal('https://${network.address}')">
                      External
                    </button>
                    <button class="action-btn" onclick="openIntegrated('https://${network.address}')">
                      Integrated
                    </button>
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          <script>
            const vscode = acquireVsCodeApi();
            function openExternal(url) {
              vscode.postMessage({
                command: 'openExternal',
                url: url
              });
            }
            function openIntegrated(url) {
              vscode.postMessage({
                command: 'openIntegrated',
                url: url
              });
            }
          </script>
        </body>
      </html>
    `
  }
}

import * as vscode from 'vscode'
import { Logger } from '../common/logger'
import { Disposable } from '../common/dispose'
import { getNetworkList, NetworkResponse } from '../api/network'

interface Network {
  address: string
  port: number
  protocol: string
}

const messages = {
  port: vscode.l10n.t('Port'),
  protocol: vscode.l10n.t('Protocol'),
  address: vscode.l10n.t('Address'),
  openInBrowser: vscode.l10n.t('Open in Browser'),
  previewInEditor: vscode.l10n.t('Preview in Editor'),
}

export class NetworkViewProvider
  extends Disposable
  implements vscode.WebviewViewProvider
{
  private _view?: vscode.WebviewView
  private _extensionUri: vscode.Uri

  constructor(context: vscode.ExtensionContext) {
    super()
    Logger.info('Initializing NetworkViewProvider')
    this._extensionUri = context.extensionUri
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
    const codiconsUri = this._view?.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        'resources',
        'codicons',
        'codicon.css'
      )
    )

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <link rel="stylesheet" href="${codiconsUri}">
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
            }
            th, td {
              padding: 0px 8px;
              text-align: left;
              border: none;
              color: var(--vscode-foreground) !important;
              font-size: 13px;
              font-family: var(--vscode-font-family);
            }
            th {
              font-size: 14px !important;
              position: sticky;
              top: 0;
              z-index: 1;
              font-weight: 600;
            }
            tr:nth-child(even) {
              background-color: color-mix(in srgb, var(--vscode-list-hoverBackground) 30%, transparent);
            }
            td {
              padding: 0px 8px;
              text-align: left;
              border: none;
              color: var(--vscode-editor-foreground);
            }
            td:nth-child(4) {
              color: var(--vscode-textLink-foreground) !important;
              text-decoration: none;
              cursor: pointer;
            }
            td:nth-child(4):hover {
              text-decoration: underline;
            }
            .codicon {
              font-family: codicons;
              cursor: pointer;
              padding: 4px;
              color: var(--vscode-foreground) !important;
            }
            .codicon:hover {
              background-color: var(--vscode-list-hoverBackground);
              border-radius: 3px;
            }
            .actions {
              opacity: 0;
              transition: opacity 0.2s;
            }
            tr:hover .actions {
              opacity: 1;
            }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th style="width: 16px;"></th>
                <th>${messages.port}</th>
                <th>${messages.protocol}</th>
                <th>${messages.address}</th>
              </tr>
            </thead>
            <tbody>
              ${networks
                .map(
                  (network) => `
                <tr>
                  <td style="width: 16px;"></td>
                  <td>${network.port}</td>
                  <td>${network.protocol}</td>
                  <td>${network.address}</td>
                  <td class="actions">
                    <span class="codicon codicon-globe" onclick="openExternal('https://${network.address}')" title="${messages.openInBrowser}"></span>
                    <span class="codicon codicon-open-preview" onclick="openIntegrated('https://${network.address}')" title="${messages.previewInEditor}"></span>
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

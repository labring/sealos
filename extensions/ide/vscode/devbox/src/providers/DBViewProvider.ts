import * as vscode from 'vscode'
import { getDBList, DBResponse } from '../api/db'
import { Disposable } from '../common/dispose'
import { GlobalStateManager } from '../utils/globalStateManager'

interface Database {
  dbType: string
  username: string
  password: string
  host: string
  port: number
  connection: string
}

export class DBViewProvider
  extends Disposable
  implements vscode.WebviewViewProvider
{
  private _view?: vscode.WebviewView

  constructor(context: vscode.ExtensionContext) {
    super()
    if (context.extension.extensionKind === vscode.ExtensionKind.UI) {
      // view
      context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('dbView', this, {
          webviewOptions: {
            retainContextWhenHidden: true,
          },
        })
      )
      // commands
      this._register(
        vscode.commands.registerCommand('devbox.refreshDatabase', () => {
          this.refreshDatabases()
        })
      )
      let targetUrl = ''
      const workspaceFolders = vscode.workspace.workspaceFolders
      console.log('workspaceFolders', workspaceFolders)
      if (workspaceFolders && workspaceFolders.length > 0) {
        const workspaceFolder = workspaceFolders[0]
        const remoteUri = workspaceFolder.uri.authority
        const devboxId = remoteUri.replace(/^ssh-remote\+/, '') // devbox = sshHostLabel
        const region = GlobalStateManager.getRegion(devboxId)
        targetUrl = `http://${region}?openapp=system-dbprovider`
        this._register(
          vscode.commands.registerCommand('devbox.gotoDatabaseWebPage', () => {
            vscode.commands.executeCommand('devbox.openExternalLink', [
              targetUrl,
            ])
          })
        )
      }
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
          await this.refreshDatabases()
          break
        case 'copy':
          await this.copyConnectionString(message.connection)
          break
      }
    })

    await this.refreshDatabases()
  }

  private async refreshDatabases() {
    if (!this._view) {
      return
    }

    const dbList = await getDBList()
    const databases = dbList.map((db: DBResponse) => ({
      dbType: db.dbType,
      username: db.username,
      host: db.host,
      port: db.port,
      connection: db.connection,
    }))

    this._view.webview.html = this.getWebviewContent(databases)
  }

  private async copyConnectionString(connection: string) {
    await vscode.env.clipboard.writeText(connection)
    vscode.window.showInformationMessage(
      'Connection string copied to clipboard!'
    )
  }

  private getWebviewContent(databases: Database[]) {
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
            .copy-btn {
              padding: 2px 8px;
              background: var(--vscode-button-background);
              color: var(--vscode-button-foreground);
              border: none;
              border-radius: 2px;
              cursor: pointer;
            }
            .copy-btn:hover {
              background: var(--vscode-button-hoverBackground);
            }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th>DB Type</th>
                <th>Username</th>
                <th>Host</th>
                <th>Port</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${databases
                .map(
                  (db) => `
                <tr>
                  <td>${db.dbType}</td>
                  <td>${db.username}</td>
                  <td>${db.host}</td>
                  <td>${db.port}</td>
                  <td>
                    <button class="copy-btn" onclick="copyConnection('${db.connection}')">
                      Copy Connection
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
            function copyConnection(connection) {
              vscode.postMessage({
                command: 'copy',
                connection: connection
              });
            }
          </script>
        </body>
      </html>
    `
  }
}

import * as vscode from 'vscode'

import { getDBList, DBResponse } from '../api/db'
import { Disposable } from '../common/dispose'
import { GlobalStateManager } from '../utils/globalStateManager'
import { Logger } from '../common/logger'

enum DBTypeEnum {
  postgresql = 'postgresql',
  mongodb = 'mongodb',
  mysql = 'mysql',
  redis = 'redis',
  kafka = 'kafka',
  qdrant = 'qdrant',
  nebula = 'nebula',
  weaviate = 'weaviate',
  milvus = 'milvus',
}

interface Database {
  dbType: DBTypeEnum
  username: string
  password: string
  host: string
  port: number
  connection: string
}
interface Messages {
  columnDBType: string
  columnUsername: string
  columnPassword: string
  columnHost: string
  columnPort: string
  copyPassword: string
  copyConnection: string
  connectionStringCopied: string
  openWebTerminal: string
}

const messages: Messages = {
  columnDBType: vscode.l10n.t('Type'),
  columnUsername: vscode.l10n.t('Username'),
  columnPassword: vscode.l10n.t('Password'),
  columnHost: vscode.l10n.t('Host'),
  columnPort: vscode.l10n.t('Port'),
  copyPassword: vscode.l10n.t('Copy Password'),
  copyConnection: vscode.l10n.t('Copy Connection String'),
  connectionStringCopied: vscode.l10n.t(
    'Connection string copied to clipboard!'
  ),
  openWebTerminal: vscode.l10n.t('Open Database Web Terminal'),
}

export class DBViewProvider
  extends Disposable
  implements vscode.WebviewViewProvider
{
  private _view?: vscode.WebviewView
  private _extensionUri: vscode.Uri
  constructor(context: vscode.ExtensionContext) {
    super()
    Logger.info('Initializing DBViewProvider')
    this._extensionUri = context.extensionUri
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
      if (workspaceFolders && workspaceFolders.length > 0) {
        const workspaceFolder = workspaceFolders[0]
        const remoteUri = workspaceFolder.uri.authority
        const devboxId = remoteUri.replace(/^ssh-remote\+/, '') // devbox = sshHostLabel
        const region = GlobalStateManager.getRegion(devboxId)
        targetUrl = `https://${region}?openapp=system-dbprovider`
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
        case 'openWebTerminal':
          await this.openWebTerminal(message.dbInfo)
          break
      }
    })

    await this.refreshDatabases()
  }
  private async openWebTerminal(dbInfo: Database) {
    const commandMap = {
      postgresql: `psql '${dbInfo.connection}'`,
      mongodb: `mongosh '${dbInfo.connection}'`,
      mysql: `mysql -h ${dbInfo.host} -P ${dbInfo.port} -u ${dbInfo.username} -p${dbInfo.password}`,
      redis: `redis-cli -u redis://${dbInfo.username}:${dbInfo.password}@${dbInfo.host}:${dbInfo.port}`,
      kafka: ``,
      qdrant: ``,
      nebula: ``,
      weaviate: ``,
      milvus: ``,
    }
    const targetCommand = encodeURIComponent(commandMap[dbInfo.dbType])
    let targetUrl = ''
    const workspaceFolders = vscode.workspace.workspaceFolders
    if (workspaceFolders && workspaceFolders.length > 0) {
      const workspaceFolder = workspaceFolders[0]
      const remoteUri = workspaceFolder.uri.authority
      const devboxId = remoteUri.replace(/^ssh-remote\+/, '') // devbox = sshHostLabel
      const region = GlobalStateManager.getRegion(devboxId)
      targetUrl = `https://${region}?openapp=system-terminal?defaultCommand=${targetCommand}`
      vscode.commands.executeCommand('devbox.openExternalLink', [targetUrl])
    }
  }

  private async refreshDatabases() {
    if (!this._view) {
      return
    }

    const dbList = await getDBList()
    const databases = dbList.map((db: DBResponse) => ({
      dbType: db.dbType,
      username: db.username,
      password: db.password,
      host: db.host,
      port: db.port,
      connection: db.connection,
    }))

    this._view.webview.html = this.getWebviewContent(databases, messages)
  }

  private async copyConnectionString(connection: string) {
    await vscode.env.clipboard.writeText(connection)
    vscode.window.showInformationMessage(messages.connectionStringCopied)
  }

  private getWebviewContent(databases: Database[], messages: Messages) {
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
            td:nth-child(5) {
              color: var(--vscode-textLink-foreground) !important;
              text-decoration: none;
              cursor: pointer;
            }
            td:nth-child(5):hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <table>
            <thead>
              <tr>
                <th style="width: 16px;"></th>
                <th>${messages.columnDBType}</th>
                <th>${messages.columnUsername}</th>
                <th>${messages.columnPassword}</th>
                <th>${messages.columnHost}</th>
                <th>${messages.columnPort}</th>
              </tr>
            </thead>
            <tbody>
              ${databases
                .map(
                  (db) => `
                <tr>
                  <td style="width: 16px;"></td>
                  <td>${db.dbType}</td>
                  <td>${db.username}</td>
                  <td>
                    ${'*'.repeat(8)}
                    <span class="actions">
                      <span class="codicon codicon-clippy" onclick="copyPassword('${
                        db.password
                      }')" title="${messages.copyPassword}"></span>
                    </span>
                  </td>
                  <td>${db.host}</td>
                  <td>${db.port}</td>
                  <td class="actions">
                    <span class="codicon codicon-copy" onclick="copyConnection('${
                      db.connection
                    }')" title="${messages.copyConnection}"></span>
                    <span class="codicon codicon-terminal" onclick="openWebTerminal({
                      dbType: '${db.dbType}',
                      host: '${db.host}',
                      port: ${db.port},
                      password: '${db.password}',
                      username: '${db.username}',
                      connection: '${db.connection}'
                    })" title="${messages.openWebTerminal}"></span>
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
            function copyPassword(password) {
              vscode.postMessage({
                command: 'copy',
                connection: password
              });
            }
            function openWebTerminal(dbInfo) {
              vscode.postMessage({
                command: 'openWebTerminal',
                dbInfo: dbInfo,
              })
            }
          </script>
        </body>
      </html>
    `
  }
}

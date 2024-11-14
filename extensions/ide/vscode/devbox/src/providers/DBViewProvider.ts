import * as vscode from 'vscode'
import { getDBList, DBResponse } from '../api/db'
import { Disposable } from '../common/dispose'
import { isDevelopment } from '../constant/api'
import { GlobalStateManager } from '../utils/globalStateManager'

interface Database {
  dbType: string
  username: string
  password: string
  host: string
  port: number
  connection: string
}

export class DBViewProvider extends Disposable {
  constructor(context: vscode.ExtensionContext) {
    super()
    if (context.extension.extensionKind === vscode.ExtensionKind.UI) {
      // view
      const dbTreeDataProvider = new MyDbTreeDataProvider()
      const dbView = vscode.window.createTreeView('dbView', {
        treeDataProvider: dbTreeDataProvider,
      })
      this._register(dbView)

      // commands
      this._register(
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
          dbTreeDataProvider.refresh()
        })
      )
      this._register(
        dbView.onDidChangeVisibility(() => {
          if (dbView.visible) {
            dbTreeDataProvider.refresh()
          }
        })
      )
      this._register(
        vscode.commands.registerCommand('devbox.refreshDatabase', () => {
          dbTreeDataProvider.refresh()
        })
      )
      this._register(
        vscode.commands.registerCommand('devbox.copy', (item: DatabaseItem) => {
          dbTreeDataProvider.copyConnectionString(item)
        })
      )
      let targetUrl = ''
      const workspaceFolders = vscode.workspace.workspaceFolders
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
}

class MyDbTreeDataProvider implements vscode.TreeDataProvider<DatabaseItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<DatabaseItem | undefined> =
    new vscode.EventEmitter<DatabaseItem | undefined>()
  readonly onDidChangeTreeData: vscode.Event<DatabaseItem | undefined> =
    this._onDidChangeTreeData.event
  constructor() {
    this.init()
  }
  private databases: Database[] = []

  private async init() {
    this.refresh()
  }

  async refresh(): Promise<void> {
    const dbList = await getDBList()
    this.databases = dbList.map((db: DBResponse) => ({
      dbName: db.dbName,
      dbType: db.dbType,
      username: db.username,
      password: db.password,
      host: db.host,
      port: db.port,
      connection: db.connection,
    }))
    this._onDidChangeTreeData.fire(undefined)
  }

  getTreeItem(element: DatabaseItem): vscode.TreeItem {
    return element
  }
  copyConnectionString(item: DatabaseItem) {
    if (item.connectionString && item.contextValue === 'database') {
      vscode.env.clipboard.writeText(item.connectionString)
      vscode.window.showInformationMessage(
        'Connection string is copied to clipboard!'
      )
    }
  }

  async getChildren(element?: DatabaseItem): Promise<DatabaseItem[]> {
    if (!element) {
      const items: DatabaseItem[] = []
      const remoteName = vscode.env.remoteName

      if (!remoteName) {
        return [
          new DatabaseItem(
            'Not connected to the remote environment',
            'no-remote'
          ),
        ]
      }

      items.push(
        new DatabaseItem(
          `${'DBType'.padEnd(15)}${'Username'.padEnd(38)}${'Host'.padEnd(
            80
          )}${'Port'.padEnd(40)}Connection`,
          'header'
        )
      )

      this.databases.forEach((database) => {
        const label = `${database.dbType.padEnd(15)} ${database.username.padEnd(
          17
        )}${database.host.padEnd(65)} ${database.port
          .toString()
          .padEnd(34)} ${'*'.repeat(20)}`
        items.push(
          new DatabaseItem(
            label,
            'database',
            database.connection,
            database.password
          )
        )
      })

      return items
    }
    return []
  }
}

class DatabaseItem extends vscode.TreeItem {
  constructor(
    public override readonly label: string,
    public override readonly contextValue: string,
    public readonly connectionString?: string,
    public readonly password?: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.None)
  }
}

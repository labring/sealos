import * as vscode from 'vscode'
import { getDBList, DBResponse } from '../api/db'
import { Disposable } from '../common/dispose'

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
          `${'DBType'.padEnd(15)}${'Username'.padEnd(15)}${'Password'.padEnd(
            15
          )}${'Host'.padEnd(80)}${'Port'.padEnd(40)}Connection`,
          'header'
        )
      )

      this.databases.forEach((database) => {
        const label = `${database.dbType.padEnd(15)} ${database.username.padEnd(
          15
        )}${database.password.padEnd(15)} ${database.host.padEnd(
          45
        )} ${database.port.toString().padEnd(10)} ${database.connection}`
        items.push(new DatabaseItem(label, 'database', database.connection))
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
    public readonly connection?: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.None)

    if (connection) {
      this.command = {
        title: 'Copy Connection String',
        command: 'devbox.copy',
        arguments: [connection],
      }
    }
  }
}

import * as vscode from 'vscode'

import { Webview } from './commands/webview'
import { RemoteSSHConnector } from './commands/remoteConnector'
import { DevboxListViewProvider } from './providers/DevboxListViewProvider'
import { UriHandler } from './utils/handleUri'
import { NetworkViewProvider } from './providers/NetworkViewProvider'
import { DBViewProvider } from './providers/DBViewProvider'
import { GlobalStateManager } from './utils/globalStateManager'
import { ToolCommands } from './commands/tools'

export async function activate(context: vscode.ExtensionContext) {
  // webview
  const webview = new Webview(context)
  context.subscriptions.push(webview)

  // tools
  const tools = new ToolCommands(context)
  context.subscriptions.push(tools)

  // remote connector
  const remoteConnector = new RemoteSSHConnector(context)
  context.subscriptions.push(remoteConnector)

  // devboxList view
  const devboxListViewProvider = new DevboxListViewProvider(context)
  context.subscriptions.push(devboxListViewProvider)

  // token manager
  GlobalStateManager.init(context)

  // network view
  const networkViewProvider = new NetworkViewProvider()
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('networkView', networkViewProvider)
  )
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      networkViewProvider.refresh()
    })
  )

  // db view
  const dbViewProvider = new DBViewProvider()
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('dbView', dbViewProvider)
  )
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      dbViewProvider.refresh()
    })
  )

  // handle uri
  const uriHandler = new UriHandler()

  context.subscriptions.push(
    vscode.window.registerUriHandler({
      handleUri: (uri) => uriHandler.handle(uri),
    })
  )
}

export function deactivate() {}

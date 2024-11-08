import * as vscode from 'vscode'

import { updateBaseUrl } from './api'
import { UriHandler } from './utils/handleUri'
import { isDevelopment } from './constant/api'
import { ToolCommands } from './commands/tools'
import { RemoteSSHConnector } from './commands/remoteConnector'
import { DevboxListViewProvider } from './providers/DevboxListViewProvider'
import { NetworkViewProvider } from './providers/NetworkViewProvider'
import { DBViewProvider } from './providers/DBViewProvider'
import { GlobalStateManager } from './utils/globalStateManager'

export async function activate(context: vscode.ExtensionContext) {
  // tools
  const tools = new ToolCommands(context)
  context.subscriptions.push(tools)

  // remote connector
  const remoteConnector = new RemoteSSHConnector(context)
  context.subscriptions.push(remoteConnector)

  // devboxList view
  const devboxListViewProvider = new DevboxListViewProvider(context)
  context.subscriptions.push(devboxListViewProvider)

  // globalState manager
  GlobalStateManager.init(context)

  // update api base url
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (workspaceFolders && workspaceFolders.length > 0 && !isDevelopment) {
    const workspaceFolder = workspaceFolders[0]
    const remoteUri = workspaceFolder.uri.authority
    const devboxId = remoteUri.replace(/^ssh-remote\+/, '') // devbox = sshHostLabel
    const region = GlobalStateManager.getRegion(devboxId)
    updateBaseUrl(`http://devbox.${region}`)
  }

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

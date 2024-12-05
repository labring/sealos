import * as vscode from 'vscode'

import { updateBaseUrl } from './api'
import { Logger } from './common/logger'
import { UriHandler } from './utils/handleUri'
import { isDevelopment } from './constant/api'
import { ToolCommands } from './commands/tools'
import { RemoteSSHConnector } from './commands/remoteConnector'
import { DevboxListViewProvider } from './providers/DevboxListViewProvider'
import { NetworkViewProvider } from './providers/NetworkViewProvider'
import { DBViewProvider } from './providers/DBViewProvider'
import { GlobalStateManager } from './utils/globalStateManager'

export async function activate(context: vscode.ExtensionContext) {
  // Logger
  Logger.init(context)

  // tools
  const tools = new ToolCommands(context)
  context.subscriptions.push(tools)

  // globalState manager
  GlobalStateManager.init(context)

  // remote connector
  const remoteConnector = new RemoteSSHConnector(context)
  context.subscriptions.push(remoteConnector)

  // devboxList view
  const devboxListViewProvider = new DevboxListViewProvider(context)
  context.subscriptions.push(devboxListViewProvider)

  // update api base url and set auto save
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (workspaceFolders && workspaceFolders.length > 0 && !isDevelopment) {
    const workspaceFolder = workspaceFolders[0]
    const remoteUri = workspaceFolder.uri.authority
    if (remoteUri && remoteUri.startsWith('ssh-remote+')) {
      const devboxId = remoteUri.replace(/^ssh-remote\+/, '') // devboxId = sshHostLabel
      const region = GlobalStateManager.getRegion(devboxId)
      updateBaseUrl(`http://devbox.${region}`)

      Logger.info(`Update api base url to http://devbox.${region}`)

      // only devbox workspace will be set
      if (region) {
        const config = vscode.workspace.getConfiguration()
        await config.update(
          'files.autoSave',
          'afterDelay',
          vscode.ConfigurationTarget.Workspace
        )
      }
    }
  }

  // network view
  const networkViewProvider = new NetworkViewProvider(context)
  context.subscriptions.push(networkViewProvider)

  // db view
  const dbViewProvider = new DBViewProvider(context)
  context.subscriptions.push(dbViewProvider)

  // handle uri
  const uriHandler = new UriHandler()

  context.subscriptions.push(
    vscode.window.registerUriHandler({
      handleUri: (uri) => uriHandler.handle(uri),
    })
  )
  console.log('Your extension "devbox" is now active!')
}

export function deactivate() {}

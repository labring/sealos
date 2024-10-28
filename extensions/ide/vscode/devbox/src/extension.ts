import * as vscode from 'vscode'

import { Webview } from './commands/webview'
import { RemoteSSHConnector } from './commands/remoteConnector'
import { TreeView } from './commands/treeview'

export async function activate(context: vscode.ExtensionContext) {
  // webview
  const webview = new Webview(context)
  context.subscriptions.push(webview)

  // remote connector
  const remoteConnector = new RemoteSSHConnector(context)
  context.subscriptions.push(remoteConnector)

  // tree view
  const treeView = new TreeView(context)
  context.subscriptions.push(treeView)

  const handleUri = (uri: vscode.Uri) => {
    console.log('uri', uri)

    if (
      uri.scheme !== 'vscode' &&
      uri.scheme !== 'cursor' &&
      uri.scheme !== 'vscode-insiders'
    ) {
      return
    }

    const queryParams = new URLSearchParams(uri.query)

    const sshDomain = queryParams.get('sshDomain')
    const sshPort = queryParams.get('sshPort')
    const base64PrivateKey = queryParams.get('base64PrivateKey')
    const workingDir = queryParams.get('workingDir')
    const sshHostLabel = queryParams.get('sshHostLabel')

    if (sshPort === '0') {
      vscode.window.showInformationMessage(
        `SSH Port is not correct,maybe your devbox's nodeport is over the limit`
      )
      return
    }

    {
      if (
        sshDomain &&
        sshPort &&
        base64PrivateKey &&
        sshHostLabel &&
        workingDir
      ) {
        vscode.commands.executeCommand('devbox.connectRemoteSSH', {
          sshDomain,
          sshPort,
          base64PrivateKey,
          sshHostLabel,
          workingDir,
        })
      }
    }
  }

  context.subscriptions.push(
    vscode.window.registerUriHandler({
      handleUri,
    })
  )
}

export function deactivate() {}

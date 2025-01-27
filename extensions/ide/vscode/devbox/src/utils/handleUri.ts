import * as vscode from 'vscode'
import { GlobalStateManager } from './globalStateManager'
import { Logger } from '../common/logger'

const message = {
  cursorDevboxNotLatest: vscode.l10n.t(
    "Cursor's Devbox is often not the latest. If there are any issues, please manually install the [plugin](https://marketplace.visualstudio.com/items?itemName=labring.devbox-aio&ssr=false#overview) referenced this [URI](https://www.cursor.com/how-to-install-extension)."
  ),
  sshPortNotCorrect: vscode.l10n.t(
    `SSH Port is not correct,maybe your devbox's nodeport is over the limit`
  ),
}

export class UriHandler {
  constructor() {}

  public handle(uri: vscode.Uri): void {
    Logger.info(`Handling URI: ${uri.toString()}`)
    if (
      uri.scheme !== 'vscode' &&
      uri.scheme !== 'cursor' &&
      uri.scheme !== 'vscode-insiders' &&
      uri.scheme !== 'windsurf' &&
      uri.scheme !== 'trae'
    ) {
      return
    }

    if (uri.scheme === 'cursor') {
      vscode.window.showInformationMessage(message.cursorDevboxNotLatest)
    }

    const queryParams = new URLSearchParams(uri.query)
    const params = this.extractParams(queryParams)

    if (params.token && params.sshHostLabel) {
      GlobalStateManager.setToken(params.sshHostLabel, params.token)
    }

    if (params.workingDir && params.sshHostLabel) {
      GlobalStateManager.setWorkDir(params.sshHostLabel, params.workingDir)
    }

    if (params.sshDomain && params.sshHostLabel) {
      const region = params.sshDomain.split('@')[1]
      GlobalStateManager.setRegion(params.sshHostLabel, region)
    }

    if (params.sshPort === '0') {
      vscode.window.showInformationMessage(message.sshPortNotCorrect)
      return
    }

    if (this.validateParams(params)) {
      vscode.commands.executeCommand('devbox.connectRemoteSSH', params)
    }
  }

  private extractParams(queryParams: URLSearchParams) {
    return {
      sshDomain: queryParams.get('sshDomain'),
      sshPort: queryParams.get('sshPort'),
      base64PrivateKey: queryParams.get('base64PrivateKey'),
      workingDir: queryParams.get('workingDir'),
      sshHostLabel: queryParams.get('sshHostLabel'), // usw.sailos.io_ns-admin_devbox-1
      token: queryParams.get('token'),
    }
  }

  private validateParams(params: any): boolean {
    return !!(
      params.sshDomain &&
      params.sshPort &&
      params.base64PrivateKey &&
      params.sshHostLabel &&
      params.workingDir &&
      params.token
    )
  }
}

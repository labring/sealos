import path from 'path'
import * as vscode from 'vscode'

import { Disposable } from '../common/dispose'

export class Webview extends Disposable {
  constructor(context: vscode.ExtensionContext) {
    super()
    if (context.extension.extensionKind === vscode.ExtensionKind.UI) {
      this._register(
        vscode.commands.registerCommand(
          'devbox.openWebview',
          this.openWebview.bind(this, context)
        )
      )
    }
  }

  private async openWebview(context: vscode.ExtensionContext) {
    const panel = vscode.window.createWebviewPanel(
      'react',
      'Create Devbox',
      vscode.ViewColumn.One,
      {
        retainContextWhenHidden: true,
        enableScripts: true,
      }
    )
    let srcUrl = ''

    const isProduction =
      context.extensionMode === vscode.ExtensionMode.Production
    if (isProduction) {
      /* semgrep-ignore-start */
      const filePath = vscode.Uri.file(
        path.join(context.extensionPath, 'dist', 'static/js/main.js')
      )
      srcUrl = panel.webview.asWebviewUri(filePath).toString()
    } else {
      srcUrl = 'http://localhost:3001/static/js/main.js'
    }
    /* semgrep-ignore-end */
    panel.webview.html = this.getWebviewContent(srcUrl)

    const updateWebview = () => {
      panel.webview.html = this.getWebviewContent(srcUrl)
    }

    updateWebview()

    const interval = setInterval(updateWebview, 1000)

    panel.onDidDispose(
      () => {
        clearInterval(interval)
      },
      null,
      context.subscriptions
    )
  }
  private getWebviewContent(srcUri: string) {
    return `<!doctype html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta http-equiv="X-UA-Compatible" content="IE=edge">
              <meta name="viewport" content="width=device-width,initial-scale=1">
              <title>webview-react</title>
              <script defer="defer" src="${srcUri}"></script>
            </head>
            <body>
              <div id="root"></div>
            </body>
            </html>`
  }
}

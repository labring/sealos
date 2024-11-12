import * as vscode from 'vscode'

import { Disposable } from '../common/dispose'

export class ToolCommands extends Disposable {
  constructor(context: vscode.ExtensionContext) {
    super()
    if (context.extension.extensionKind === vscode.ExtensionKind.UI) {
      // open external link
      this._register(
        vscode.commands.registerCommand('devbox.openExternalLink', (args) => {
          vscode.env.openExternal(vscode.Uri.parse(args))
        })
      )
    }
  }
}

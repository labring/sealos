import * as vscode from 'vscode'

export interface DevboxListItem {
  hostName: string
  host: string
  user?: string
  port: number
  identityFile?: string
  status?: string
  remotePath?: string
  iconPath?: vscode.ThemeIcon
}

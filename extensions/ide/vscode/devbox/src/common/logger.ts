import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as vscode from 'vscode'

export class Logger {
  private static outputChannel: vscode.OutputChannel
  private static logFile: string

  static init(context: vscode.ExtensionContext) {
    this.outputChannel = vscode.window.createOutputChannel('Devbox')

    const logDir = path.join(os.homedir(), '.vscode', 'devbox', 'logs')
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
    this.logFile = path.join(logDir, 'devbox.log')
  }

  static info(message: string) {
    const log = `[INFO] ${new Date().toISOString()} ${message}`
    this.outputChannel.appendLine(log)
    this.writeToFile(log)
  }

  static error(message: string, error?: any) {
    const errorMessage = error ? `${message}: ${error.toString()}` : message
    const log = `[ERROR] ${new Date().toISOString()} ${errorMessage}`
    this.outputChannel.appendLine(log)
    this.writeToFile(log)
  }

  static debug(message: string) {
    if (process.env.NODE_ENV === 'development') {
      const log = `[DEBUG] ${new Date().toISOString()} ${message}`
      this.outputChannel.appendLine(log)
      this.writeToFile(log)
    }
  }

  private static writeToFile(message: string) {
    fs.appendFileSync(this.logFile, message + '\n')
  }

  static show() {
    this.outputChannel.show()
  }
}

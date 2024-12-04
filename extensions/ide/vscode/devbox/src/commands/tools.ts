import * as vscode from 'vscode'
import Rsync from 'rsync'

import { Disposable } from '../common/dispose'
import { Logger } from '../common/logger'
import { execa } from 'execa'

const message = {
  downloadProject: vscode.l10n.t('Downloading project from remote server...'),
  uploadProject: vscode.l10n.t('Uploading project to remote server...'),
  chooseFolderToStoreDownloadedFolder: vscode.l10n.t(
    'Choose a folder to store the downloaded folder'
  ),
  chooseFolderToUpload: vscode.l10n.t('Choose a folder to upload'),
  uploadCompleted: vscode.l10n.t('Upload completed!'),
  uploadFailed: vscode.l10n.t('Upload failed!'),
  downloadCompleted: vscode.l10n.t('Download completed!'),
  downloadFailed: vscode.l10n.t('Download failed!'),
}

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
      // download project folder from remote server
      this._register(
        vscode.commands.registerCommand('devbox.downloadProject', async () => {
          Logger.info(message.downloadProject)

          // remote are source
          let remoteHost = ''
          let remotePath = ''
          const workspaceFolders = vscode.workspace.workspaceFolders
          if (workspaceFolders && workspaceFolders.length > 0) {
            const workspaceFolder = workspaceFolders[0]
            const remoteUri = workspaceFolder.uri.authority
            remoteHost = remoteUri.replace(/^ssh-remote\+/, '')
            remotePath = workspaceFolder.uri.path
          }

          // check remote server has rsync
          try {
            await execa('ssh', [remoteHost, 'which rsync'])
          } catch (error) {
            await execa('ssh', [remoteHost, 'sudo apt install -y rsync'])
          }

          // local are destination
          const destinationPath = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            title: '',
            defaultUri: vscode.Uri.file('/'),
          })

          if (!destinationPath || destinationPath.length === 0) {
            return
          }

          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: message.downloadProject,
              cancellable: true,
            },
            async (progress, token) => {
              return new Promise((resolve, reject) => {
                const rsync = new Rsync()
                  .shell('ssh')
                  .flags('avz')
                  .source(`${remoteHost}:${remotePath}`)
                  .destination(destinationPath[0].fsPath)

                rsync.output(
                  (data) => {
                    Logger.info(data.toString())
                  },
                  (data) => {
                    Logger.error('ERROR: ' + data.toString())
                  }
                )

                const rsyPid = rsync.execute((error, code, cmd) => {
                  if (error) {
                    Logger.error('Error: ' + error.toString())
                    vscode.window.showErrorMessage(
                      message.downloadFailed + error.toString()
                    )
                    reject(error)
                  } else {
                    Logger.info('Download completed!')
                    vscode.window.showInformationMessage(
                      message.downloadCompleted
                    )
                    resolve(true)
                  }
                })

                token.onCancellationRequested(() => {
                  rsyPid.kill()
                  Logger.info('Download cancelled!')
                  resolve(true)
                })
              })
            }
          )
        })
      )
      // upload folder to remote server
      this._register(
        vscode.commands.registerCommand('devbox.uploadProject', async () => {
          Logger.info(message.uploadProject)

          // remote are destination
          let remoteHost = ''
          let remotePath = ''
          const workspaceFolders = vscode.workspace.workspaceFolders
          if (workspaceFolders && workspaceFolders.length > 0) {
            const workspaceFolder = workspaceFolders[0]
            const remoteUri = workspaceFolder.uri.authority
            remoteHost = remoteUri.replace(/^ssh-remote\+/, '')
            remotePath = workspaceFolder.uri.path
          }

          // check remote server has rsync
          try {
            await execa('ssh', [remoteHost, 'which rsync'])
          } catch (error) {
            await execa('ssh', [remoteHost, 'sudo apt install -y rsync'])
          }

          // local are source
          const sourcePath = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: true,
            canSelectMany: false,
            title: 'Choose a folder to upload',
            defaultUri: vscode.Uri.file('/'),
          })

          if (!sourcePath || sourcePath.length === 0) {
            return
          }

          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: message.uploadProject,
              cancellable: true,
            },
            async (progress, token) => {
              return new Promise((resolve, reject) => {
                const rsync = new Rsync()
                  .shell('ssh')
                  .flags('avz')
                  .source(sourcePath[0].fsPath)
                  .destination(`${remoteHost}:${remotePath}`)

                rsync.output(
                  (data) => {
                    Logger.info(data.toString())
                  },
                  (data) => {
                    Logger.error('ERROR: ' + data.toString())
                  }
                )

                const rsyPid = rsync.execute((error, code, cmd) => {
                  if (error) {
                    Logger.error('Error: ' + error.toString())
                    vscode.window.showErrorMessage(
                      message.uploadFailed + error.toString()
                    )
                    reject(error)
                  } else {
                    Logger.info('Upload completed!')
                    vscode.window.showInformationMessage(
                      message.uploadCompleted
                    )
                    resolve(true)
                  }
                })

                token.onCancellationRequested(() => {
                  rsyPid.kill()
                  Logger.info('Upload cancelled!')
                  resolve(true)
                })
              })
            }
          )
        })
      )
    }
  }
}

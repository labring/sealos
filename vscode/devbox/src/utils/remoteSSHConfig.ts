import * as vscode from 'vscode'

// update Remote-SSH config
export const modifiedRemoteSSHConfig = async (
  sshHostLabel: string,
  suffixSshHostLabel: string
) => {
  const existingSSHHostPlatforms = vscode.workspace
    .getConfiguration('remote.SSH')
    .get<{ [host: string]: string }>('remotePlatform', {})

  console.log('existingSSHHostPlatforms', existingSSHHostPlatforms)
  // delete repeated remotePlatform by sshDomain/namespace/devboxName
  const newSSHHostPlatforms = Object.keys(existingSSHHostPlatforms).reduce(
    (acc: { [host: string]: string }, host: string) => {
      if (host.startsWith(sshHostLabel)) {
        return acc
      }
      acc[host] = existingSSHHostPlatforms[host]
      return acc
    },
    {}
  )
  // add new ssh host label
  newSSHHostPlatforms[suffixSshHostLabel] = 'linux'

  await vscode.workspace
    .getConfiguration('remote.SSH')
    .update(
      'remotePlatform',
      newSSHHostPlatforms,
      vscode.ConfigurationTarget.Global
    )

  await vscode.workspace
    .getConfiguration('remote.SSH')
    .update('useExecServer', false, vscode.ConfigurationTarget.Global)
  await vscode.workspace
    .getConfiguration('remote.SSH')
    .update('localServerDownload', 'off', vscode.ConfigurationTarget.Global)
}

import * as vscode from "vscode";
import { Logger } from "../common/logger";

// update Remote-SSH config
export const modifiedRemoteSSHConfig = async (sshHostLabel: string) => {
  Logger.info(`Modifying Remote-SSH config for ${sshHostLabel}`);

  const existingSSHHostPlatforms = vscode.workspace
    .getConfiguration("remote.SSH")
    .get<{ [host: string]: string }>("remotePlatform", {});

  // delete repeated remotePlatform by sshDomain_namespace_devboxName
  const newSSHHostPlatforms = Object.keys(existingSSHHostPlatforms).reduce(
    (acc: { [host: string]: string }, host: string) => {
      if (host.startsWith(sshHostLabel)) {
        return acc;
      }
      acc[host] = existingSSHHostPlatforms[host];
      return acc;
    },
    {}
  );
  // add new ssh host label
  newSSHHostPlatforms[sshHostLabel] = "linux";

  const appName = vscode.env.appName;
  if (appName !== "Windsurf" && appName !== "Trae") {
    await vscode.workspace
      .getConfiguration("remote.SSH")
      .update(
        "remotePlatform",
        newSSHHostPlatforms,
        vscode.ConfigurationTarget.Global
      );
  }

  // await vscode.workspace
  //   .getConfiguration('remote.SSH')
  //   .update('useExecServer', false, vscode.ConfigurationTarget.Global)
  // await vscode.workspace
  //   .getConfiguration('remote.SSH')
  //   .update('localServerDownload', 'off', vscode.ConfigurationTarget.Global)
  // await vscode.workspace
  //   .getConfiguration('remote.SSH')
  //   .update('useLocalServer', true, vscode.ConfigurationTarget.Global)

  Logger.info(`Modified Remote-SSH config for ${sshHostLabel}`);
};

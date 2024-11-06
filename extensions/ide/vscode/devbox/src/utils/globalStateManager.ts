import * as vscode from 'vscode'

interface DevboxGlobalState {
  token: string
  workDir: string
}

export class GlobalStateManager {
  private static context: vscode.ExtensionContext

  static init(context: vscode.ExtensionContext) {
    GlobalStateManager.context = context
  }

  // devboxId = `sshDomain_namespace_devboxName` = sshHostLabel

  // devboxId:{
  //   token: string
  //   workDir: string
  // }
  static getToken(devboxId: string): string | undefined {
    const state = (GlobalStateManager.context.globalState.get(
      devboxId
    ) as DevboxGlobalState) || {
      token: '',
      workDir: '',
    }
    return state.token
  }
  static getWorkDir(devboxId: string): string | undefined {
    const state = (GlobalStateManager.context.globalState.get(
      devboxId
    ) as DevboxGlobalState) || {
      token: '',
      workDir: '',
    }
    return state.workDir
  }

  static setToken(devboxId: string, token: string) {
    const state =
      (GlobalStateManager.context.globalState.get(
        devboxId
      ) as DevboxGlobalState) || {}
    const newState = {
      ...state,
      token,
    }
    GlobalStateManager.context.globalState.update(devboxId, newState)
  }

  static setWorkDir(devboxId: string, workDir: string) {
    const state =
      (GlobalStateManager.context.globalState.get(
        devboxId
      ) as DevboxGlobalState) || {}
    const newState = {
      ...state,
      workDir,
    }
    GlobalStateManager.context.globalState.update(devboxId, newState)
  }

  static remove(devboxId: string) {
    GlobalStateManager.context.globalState.update(devboxId, undefined)
  }
}

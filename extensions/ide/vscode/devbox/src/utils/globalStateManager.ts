import * as vscode from 'vscode'

interface DevboxGlobalState {
  token: string
  workDir: string
  region: string
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
  //   region: string
  // }
  static getToken(devboxId: string): string | undefined {
    const state = (GlobalStateManager.context.globalState.get(
      devboxId
    ) as DevboxGlobalState) || {
      token: '',
      workDir: '',
      region: '',
    }
    return state.token
  }
  static getWorkDir(devboxId: string): string | undefined {
    const state = (GlobalStateManager.context.globalState.get(
      devboxId
    ) as DevboxGlobalState) || {
      token: '',
      workDir: '',
      region: '',
    }
    return state.workDir
  }

  static getRegion(devboxId: string): string | undefined {
    const state = (GlobalStateManager.context.globalState.get(
      devboxId
    ) as DevboxGlobalState) || {
      token: '',
      workDir: '',
      region: '',
    }
    return state.region
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

  static setRegion(devboxId: string, region: string) {
    const state =
      (GlobalStateManager.context.globalState.get(
        devboxId
      ) as DevboxGlobalState) || {}
    const newState = {
      ...state,
      region,
    }
    GlobalStateManager.context.globalState.update(devboxId, newState)
  }

  static getApiRegionList(): string[] {
    const state =
      (GlobalStateManager.context.globalState.get(
        'api-region-list'
      ) as string[]) || []
    return state
  }
  static addApiRegion(region: string) {
    const state = GlobalStateManager.getApiRegionList()
    if (!state.includes(region)) {
      const newState = [...state, region]
      GlobalStateManager.context.globalState.update('api-region-list', newState)
    }
  }

  static remove(devboxId: string) {
    GlobalStateManager.context.globalState.update(devboxId, undefined)
  }
}

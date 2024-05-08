import type { TApp } from '@/types';
let _id = 0;
const counter = () => _id++;

class AppRunningState {
  state: 'running' | 'suspend';
  pid: number = -1;
  key: string;
  constructor(key: TApp['key']) {
    this.pid = counter();
    this.state = 'suspend';
    this.key = key;
  }
}

export default class AppStateManager {
  allApps!: Set<string>;
  openedApps: AppRunningState[];
  // currentPid: Pid;
  constructor(apps: string[]) {
    this.loadApps(apps || []);
    this.openedApps = [];
    // this.currentPid = -1;
  }
  suspendApp(pid: number) {
    const _state = this.findState(pid);
    if (!_state) return;
    _state.state = 'suspend';
  }
  closeApp(pid: number) {
    const idx = this.openedApps.findIndex((app) => app.pid === pid);
    this.openedApps.splice(idx, 1);
  }
  closeAppAll() {
    this.openedApps = [];
  }
  loadApps(appKeys: string[]) {
    this.allApps = new Set(appKeys);
  }
  loadApp(appKey: string) {
    this.allApps.add(appKey);
  }
  unloadApp(appKey: string) {
    this.allApps.delete(appKey);
    /// remove all apps
    const goal: number[] = [];
    this.openedApps.forEach((app) => {
      if (app.key === app.key) {
        goal.push(app.pid);
      }
    });
    this.openedApps = this.openedApps.filter((x) => goal.includes(x.pid));
  }
  // open app
  openApp(key: string) {
    const appRunningState = new AppRunningState(key as `user-${string}` | `system-${string}`);
    appRunningState.state = 'running';
    this.openedApps.push(appRunningState);
    return appRunningState;
  }
  findState(pid: number) {
    return this.openedApps.find((x) => x.pid === pid);
  }
}

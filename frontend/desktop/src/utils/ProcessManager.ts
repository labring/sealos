import type { TApp, Pid } from '@/types';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
let _id = 0;
const counter = () => _id++;

class AppRunningState {
  // 'closed' is not equal to be closed
  state: 'running' | 'Suspend';
  pid: Pid = -1;
  key: string;
  constructor(key: TApp['key']) {
    this.pid = counter();
    this.state = 'Suspend';
    this.key = key;
  }
}

export default class AppStateManager<T = string> {
  allApps!: Set<T>;
  openedApps: AppRunningState[];
  // currentPid: Pid;
  constructor(apps: T[]) {
    this.loadApps(apps || []);
    this.openedApps = [];
    // this.currentPid = -1;
  }
  suspendApp(pid: number) {
    let _state = this.findState(pid);
    if (!_state) return;
    _state.state = 'Suspend';
  }
  closeApp(pid: number) {
    let idx = this.openedApps.findIndex((app) => app.pid === pid);
    this.openedApps.splice(idx, 1);
  }
  loadApps(appKeys: T[]) {
    this.allApps = new Set(appKeys);
  }
  loadApp(appKey: T) {
    this.allApps.add(appKey);
  }
  unloadApp(appKey: T) {
    this.allApps.delete(appKey);
    /// remove all apps
    const goal: Pid[] = [];
    this.openedApps.forEach((app) => {
      if (app.key === app.key) {
        goal.push(app.pid);
      }
    });
    this.openedApps = this.openedApps.filter((x) => goal.includes(x.pid));
  }
  // open app
  openApp(key: string) {
    const appRunningState = new AppRunningState(key);
    appRunningState.state = 'running';
    this.openedApps.push(appRunningState);
    return appRunningState;
  }
  findState(pid: Pid) {
    return this.openedApps.find((x) => x.pid === pid);
  }
}

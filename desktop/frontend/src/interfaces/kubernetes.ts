import * as k8s from '@kubernetes/client-node';
import { UserInfo } from './session';

enum BuildInAction {
  Install = 'install',
  Start = 'start',
  Running = 'running',
  Close = 'close',
  Uninstall = 'uninstall'
}
enum ApplicationType {
  IFrame = 'iframe',
  App = 'app'
}

export type ApplyReq = {
  name: string;
  action: BuildInAction;
};

export type StartResp = {
  status: number;
  application_type: ApplicationType;
  iframe_page?: string;
  extra?: any;
};

export { BuildInAction, ApplicationType };

export type ApplicationTemplate = {
  name: string;
  description: string;
  icon: string;
  application_type: ApplicationType;
  startTemplate: string;
};

// TODO: add more actions and more user customized variables
export type RunApplication = ApplicationTemplate & {
  doStart(kc: k8s.KubeConfig): Promise<StartResp>;
};

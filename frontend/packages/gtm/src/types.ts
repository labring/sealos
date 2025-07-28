export type GTMModule =
  | 'desktop'
  | 'devbox'
  | 'database'
  | 'applaunchpad'
  | 'appstore'
  | 'aiproxy'
  | 'kubepanel'
  | 'objectstorage'
  | 'cronjob'
  | 'terminal'
  | 'costcenter'
  | 'workspace'
  | 'guide'
  | 'dashboard'
  | 'auth';

export type GTMContext = 'app' | 'website';

export interface BaseGTMEvent {
  event: string;
  context: GTMContext;
  module: GTMModule;
  method?: string;
}

export interface ModuleOpenEvent extends BaseGTMEvent {
  event: 'module_open';
  trigger?: 'manual' | 'onboarding';
}

export interface ModuleViewEvent extends BaseGTMEvent {
  event: 'module_view';
  view_name: string;
  app_name?: string;
}

export interface AppLaunchEvent extends BaseGTMEvent {
  event: 'app_launch';
  module: 'desktop';
  app_name: string;
  source: 'appstore' | 'devbox';
}

export interface DeploymentStartEvent extends BaseGTMEvent {
  event: 'deployment_start';
}

export interface DeploymentCreateEvent extends BaseGTMEvent {
  event: 'deployment_create';
  method?: 'custom' | 'devbox';
  app_name?: string;
  config?: {
    template_name?: string;
    template_version?: string;
    template_type?: 'public' | 'private';
  };
  resources?: {
    cpu_cores?: number;
    ram_mb?: number;
    replicas?: number;
    storage?: number;
    scaling?: {
      method: 'CPU' | 'RAM';
      value: number;
    };
  };
  backups?: {
    enabled: boolean;
  };
}

export interface DeploymentActionEvent extends BaseGTMEvent {
  event: 'deployment_update' | 'deployment_delete' | 'deployment_details';
}

export interface DeploymentShutdownEvent extends BaseGTMEvent {
  event: 'deployment_shutdown';
  type: 'normal' | 'cost_saving';
}

export interface IDEOpenEvent extends BaseGTMEvent {
  event: 'ide_open';
  module: 'devbox';
  method: string;
}

export interface ReleaseCreateEvent extends BaseGTMEvent {
  event: 'release_create';
  module: 'devbox';
  release_number: number;
}

export interface PaywallTriggeredEvent extends BaseGTMEvent {
  event: 'paywall_triggered';
  type: 'insufficient_balance' | string;
}

export interface ErrorOccurredEvent extends BaseGTMEvent {
  event: 'error_occurred';
  error_code: string;
}

export interface GuideStartEvent extends BaseGTMEvent {
  event: 'guide_start';
  module: 'guide';
  guide_name: string;
}

export interface GuideCompleteEvent extends BaseGTMEvent {
  event: 'guide_complete';
  module: 'guide';
  guide_name: string;
  duration_seconds: number;
}

export interface GuideExitEvent extends BaseGTMEvent {
  event: 'guide_exit';
  module: 'guide';
  guide_name?: string;
  progress_step?: number;
  duration_seconds?: number;
}

export interface AnnouncementClickEvent extends BaseGTMEvent {
  event: 'announcement_click';
  module: 'dashboard';
  announcement_id: string;
}

export interface WorkspaceCreateEvent extends BaseGTMEvent {
  event: 'workspace_create';
  module: 'workspace';
}

export interface WorkspaceDeleteEvent extends BaseGTMEvent {
  event: 'workspace_delete';
  module: 'workspace';
}

export interface WorkspaceSwitchEvent extends BaseGTMEvent {
  event: 'workspace_switch';
  module: 'workspace';
}

export interface WorkspaceInviteEvent extends BaseGTMEvent {
  event: 'workspace_invite';
  module: 'workspace';
  invite_role: 'developer' | 'manager';
}

export interface WorkspaceJoinEvent extends BaseGTMEvent {
  event: 'workspace_join';
  module: 'workspace';
  trigger: 'invite';
  role: 'developer' | 'manager';
}

export interface LoginStartEvent extends BaseGTMEvent {
  event: 'login_start';
  module: 'auth';
}

export interface LoginSuccessEvent extends BaseGTMEvent {
  event: 'login_success';
  module: 'auth';
  method: 'phone' | 'email' | 'oauth2';
  oauth2_provider?: string;
  user_type: 'new' | 'existing';
}

export type GTMEvent =
  | ModuleOpenEvent
  | ModuleViewEvent
  | AppLaunchEvent
  | DeploymentStartEvent
  | DeploymentCreateEvent
  | DeploymentActionEvent
  | DeploymentShutdownEvent
  | IDEOpenEvent
  | ReleaseCreateEvent
  | PaywallTriggeredEvent
  | ErrorOccurredEvent
  | GuideStartEvent
  | GuideCompleteEvent
  | GuideExitEvent
  | AnnouncementClickEvent
  | WorkspaceCreateEvent
  | WorkspaceDeleteEvent
  | WorkspaceSwitchEvent
  | WorkspaceInviteEvent
  | WorkspaceJoinEvent
  | LoginStartEvent
  | LoginSuccessEvent;

export type GTMEventType = GTMEvent['event'];

declare global {
  interface Window {
    dataLayer: any[];
  }
}

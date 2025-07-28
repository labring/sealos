import { track } from './track';
import type { GTMModule, DeploymentCreateEvent, LoginSuccessEvent } from './types';

export const trackModuleOpen = (
  module: GTMModule,
  options?: { trigger?: 'manual' | 'onboarding' }
) => {
  track({
    event: 'module_open',
    context: 'app',
    module,
    ...options
  });
};

export const trackModuleView = (
  module: GTMModule,
  viewName: string,
  options?: { app_name?: string }
) => {
  track({
    event: 'module_view',
    context: 'app',
    module,
    view_name: viewName,
    ...options
  });
};

export const trackAppLaunch = (appName: string, source: 'appstore' | 'devbox' = 'appstore') => {
  track({
    event: 'app_launch',
    context: 'app',
    module: 'desktop',
    app_name: appName,
    source
  });
};

export const trackDeploymentStart = (module: GTMModule) => {
  track({
    event: 'deployment_start',
    context: 'app',
    module
  });
};

export const trackDeploymentCreate = (
  module: GTMModule,
  config?: Omit<DeploymentCreateEvent, 'event' | 'context' | 'module'>
) => {
  track({
    event: 'deployment_create',
    context: 'app',
    module,
    ...config
  });
};

export const trackDeploymentUpdate = (module: GTMModule) => {
  track({
    event: 'deployment_update',
    context: 'app',
    module
  });
};

export const trackDeploymentDelete = (module: GTMModule) => {
  track({
    event: 'deployment_delete',
    context: 'app',
    module
  });
};

export const trackDeploymentDetails = (module: GTMModule) => {
  track({
    event: 'deployment_details',
    context: 'app',
    module
  });
};

export const trackDeploymentShutdown = (
  module: GTMModule,
  type: 'normal' | 'cost_saving' = 'normal'
) => {
  track({
    event: 'deployment_shutdown',
    context: 'app',
    module,
    type
  });
};

export const trackIDEOpen = (method: string) => {
  track({
    event: 'ide_open',
    context: 'app',
    module: 'devbox',
    method
  });
};

export const trackReleaseCreate = (releaseNumber: number) => {
  track({
    event: 'release_create',
    context: 'app',
    module: 'devbox',
    release_number: releaseNumber
  });
};

export const trackError = (module: GTMModule, errorCode: string) => {
  track({
    event: 'error_occurred',
    context: 'app',
    module,
    error_code: errorCode
  });
};

export const trackPaywall = (module: GTMModule, type: string = 'insufficient_balance') => {
  track({
    event: 'paywall_triggered',
    context: 'app',
    module,
    type
  });
};

export const trackGuideStart = (guideName: string) => {
  track({
    event: 'guide_start',
    context: 'app',
    module: 'guide',
    guide_name: guideName
  });
};

export const trackGuideComplete = (guideName: string, durationSeconds: number) => {
  track({
    event: 'guide_complete',
    context: 'app',
    module: 'guide',
    guide_name: guideName,
    duration_seconds: durationSeconds
  });
};

export const trackGuideExit = (options?: {
  guide_name?: string;
  progress_step?: number;
  duration_seconds?: number;
}) => {
  track({
    event: 'guide_exit',
    context: 'app',
    module: 'guide',
    ...options
  });
};

export const trackAnnouncementClick = (announcementId: string) => {
  track({
    event: 'announcement_click',
    context: 'app',
    module: 'dashboard',
    announcement_id: announcementId
  });
};

export const trackWorkspaceCreate = () => {
  track({
    event: 'workspace_create',
    context: 'app',
    module: 'workspace'
  });
};

export const trackWorkspaceDelete = () => {
  track({
    event: 'workspace_delete',
    context: 'app',
    module: 'workspace'
  });
};

export const trackWorkspaceSwitch = () => {
  track({
    event: 'workspace_switch',
    context: 'app',
    module: 'workspace'
  });
};

export const trackWorkspaceInvite = (inviteRole: 'developer' | 'manager') => {
  track({
    event: 'workspace_invite',
    context: 'app',
    module: 'workspace',
    invite_role: inviteRole
  });
};

export const trackWorkspaceJoin = (role: 'developer' | 'manager') => {
  track({
    event: 'workspace_join',
    context: 'app',
    module: 'workspace',
    trigger: 'invite',
    role
  });
};

export const trackLoginStart = () => {
  track('login_start', {
    module: 'auth'
  });
};

export const trackLoginSuccess = (
  config: Omit<LoginSuccessEvent, 'event' | 'context' | 'module'>
) => {
  track('login_success', {
    module: 'auth',
    ...config
  });
};

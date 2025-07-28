import type {
  GTMEvent,
  GTMEventType,
  GTMModule,
  ModuleOpenEvent,
  ModuleViewEvent,
  AppLaunchEvent,
  DeploymentStartEvent,
  DeploymentCreateEvent,
  DeploymentActionEvent,
  DeploymentShutdownEvent,
  IDEOpenEvent,
  ReleaseCreateEvent,
  PaywallTriggeredEvent,
  ErrorOccurredEvent,
  GuideStartEvent,
  GuideCompleteEvent,
  GuideExitEvent,
  AnnouncementClickEvent,
  WorkspaceCreateEvent,
  WorkspaceDeleteEvent,
  WorkspaceSwitchEvent,
  WorkspaceInviteEvent,
  WorkspaceJoinEvent,
  LoginStartEvent,
  LoginSuccessEvent
} from './types';

interface GTMConfig {
  enabled?: boolean;
  debug?: boolean;
}

type EventPropertiesMap = {
  module_open: Omit<ModuleOpenEvent, 'event' | 'context'>;
  module_view: Omit<ModuleViewEvent, 'event' | 'context'>;
  app_launch: Omit<AppLaunchEvent, 'event' | 'context'>;
  deployment_start: Omit<DeploymentStartEvent, 'event' | 'context'>;
  deployment_create: Omit<DeploymentCreateEvent, 'event' | 'context'>;
  deployment_update: Omit<DeploymentActionEvent, 'event' | 'context'>;
  deployment_delete: Omit<DeploymentActionEvent, 'event' | 'context'>;
  deployment_details: Omit<DeploymentActionEvent, 'event' | 'context'>;
  deployment_shutdown: Omit<DeploymentShutdownEvent, 'event' | 'context'>;
  ide_open: Omit<IDEOpenEvent, 'event' | 'context'>;
  release_create: Omit<ReleaseCreateEvent, 'event' | 'context'>;
  paywall_triggered: Omit<PaywallTriggeredEvent, 'event' | 'context'>;
  error_occurred: Omit<ErrorOccurredEvent, 'event' | 'context'>;
  guide_start: Omit<GuideStartEvent, 'event' | 'context'>;
  guide_complete: Omit<GuideCompleteEvent, 'event' | 'context'>;
  guide_exit: Omit<GuideExitEvent, 'event' | 'context'>;
  announcement_click: Omit<AnnouncementClickEvent, 'event' | 'context'>;
  workspace_create: Omit<WorkspaceCreateEvent, 'event' | 'context'>;
  workspace_delete: Omit<WorkspaceDeleteEvent, 'event' | 'context'>;
  workspace_switch: Omit<WorkspaceSwitchEvent, 'event' | 'context'>;
  workspace_invite: Omit<WorkspaceInviteEvent, 'event' | 'context'>;
  workspace_join: Omit<WorkspaceJoinEvent, 'event' | 'context'>;
  login_start: Omit<LoginStartEvent, 'event' | 'context'>;
  login_success: Omit<LoginSuccessEvent, 'event' | 'context'>;
};

class GTMTracker {
  private config: GTMConfig = {
    enabled: true,
    debug: false
  };

  configure(config: GTMConfig) {
    this.config = { ...this.config, ...config };
    return this;
  }

  track(event: GTMEvent): void;
  track<T extends GTMEventType>(eventType: T, properties: EventPropertiesMap[T]): void;
  track<T extends GTMEventType>(
    eventOrType: GTMEvent | T,
    properties?: EventPropertiesMap[T]
  ): void {
    if (!this.config.enabled) return;

    let gtmEvent: GTMEvent;

    if (typeof eventOrType === 'string') {
      gtmEvent = {
        event: eventOrType,
        context: 'app',
        ...properties
      } as GTMEvent;
    } else {
      gtmEvent = {
        ...eventOrType,
        context: eventOrType.context || 'app'
      };
    }

    if (this.config.debug) {
      console.log('[Sealos GTM]', gtmEvent);
    }

    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push(gtmEvent);
    } else if (this.config.debug) {
      console.warn('[Sealos GTM] dataLayer not found');
    }
  }
}

export const gtmTracker = new GTMTracker();
export const track = gtmTracker.track.bind(gtmTracker);
export const configureGTM = gtmTracker.configure.bind(gtmTracker);

import { APPTYPE, displayType } from './app';
import { LicenseFrontendKey } from '@/constants/account';

export type CRDMeta = {
  group: string; // group
  version: string; // version
  namespace: string; // namespace
  plural: string; // type
};

export const userCRD = {
  Group: 'user.sealos.io',
  Version: 'v1',
  Resource: 'users'
};
export type UserCR = {
  apiVersion: 'user.sealos.io/v1';
  kind: 'User';
  metadata: {
    annotations: object;
    creationTimestamp: string;
    finalizers: string[];
    generation: number;
    labels: {
      uid: string;
      updateTime: string;
    };
    managedFields: object[];
    name: string;
    resourceVersion: string;
    uid: string;
  };
  spec: {
    csrExpirationSeconds: 7200;
  };
  status: {
    conditions: {
      lastHeartbeatTime: string;
      lastTransitionTime: string;
      message: string;
      reason: string;
      status: string;
      type: string;
    }[];
    kubeConfig: string;
    observedCSRExpirationSeconds: number;
    observedGeneration: number;
    phase: string;
  };
};
export type StatusCR = {
  kind: 'Status';
  apiVersion: 'v1';
  metadata: object;
  status: string;
  message: string;
  reason: string;
  details: {
    name: string;
    group: 'user.sealos.io';
    kind: 'users';
  };
  code: 404;
};
export type TAppCR = {
  apiVersion: 'app.sealos.io/v1';
  kind: 'App';
  metadata: {
    annotations: any;
    creationTimestamp: string;
    generation: number;
    labels: Record<string, string>;
    name: string;
    namespace: 'app-system';
    resourceVersion: string;
    uid: string;
  };
  spec: {
    data: Record<'url' | 'desc', string>;
    displayType: displayType;
    i18n: Record<'zh' | 'zh-Hans', { name: string }>;
    icon: string;
    menuData?: {
      nameColor: string;
      helpDropDown: boolean;
      helpDocs: boolean | string;
    };
    name: string;
    type: APPTYPE;
  };
};

export type TAppCRList = {
  apiVersion: 'app.sealos.io/v1';
  items: TAppCR[];
  kind: 'AppList';
  metadata: { continue: string; resourceVersion: string };
};

export type NotificationItem = {
  metadata: {
    creationTimestamp: string;
    labels: {
      isRead: string;
      [LicenseFrontendKey]?: string;
    };
    name: string;
    namespace: string;
    uid: string;
  };
  spec: {
    from: string;
    message: string;
    timestamp: number;
    title: string;
    desktopPopup?: boolean;
    i18ns?: {
      zh?: {
        from: string;
        message: string;
        title: string;
      };
    };
  };
};

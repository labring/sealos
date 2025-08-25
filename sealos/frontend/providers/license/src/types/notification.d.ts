import * as k8s from '@kubernetes/client-node';

export type NotificationCR = k8s.KubernetesObject & {
  apiVersion: 'notification.sealos.io/v1';
  kind: 'Notification';
  metadata: {
    creationTimestamp?: string;
    labels: {
      isRead: string;
    };
    name: string;
    namespace: string;
    uid?: string;
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

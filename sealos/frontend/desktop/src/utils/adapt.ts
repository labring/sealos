import { LicenseFrontendKey } from '@/constants/account';
import { NotificationCR, TNotification } from '@/types';

export const adaptNotification = (item: NotificationCR): TNotification => {
  const defaultLanguage = {
    from: item.spec.from,
    message: item.spec.message,
    title: item.spec.title
  };

  return {
    uid: item.metadata.uid,
    name: item.metadata.name,
    namespace: item.metadata.namespace,
    creationTimestamp: item.metadata.creationTimestamp,
    isRead: item.metadata.labels?.isRead === 'true',
    licenseFrontend: item.metadata.labels?.[LicenseFrontendKey],
    timestamp: item.spec.timestamp,
    desktopPopup: item.spec.desktopPopup || false,
    i18n: {
      en: defaultLanguage,
      zh: item.spec.i18ns?.zh || defaultLanguage
    }
  };
};

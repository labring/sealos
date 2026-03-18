import type { WorkspaceQuotaItemType } from '../types/workspace';

export type QuotaDialogI18nConfig = {
  title: string;
  alertTitle: string;
  cancel: string;
  confirm: string;
  pleaseUpgradePlan: {
    prefix: string;
    link: string;
    suffix: string;
  };
  pleaseSubmitTicket: {
    prefix: string;
    link: string;
    suffix: string;
  };
  quotaTotal: string;
  quotaInUse: string;
  quotaAvailable: string;
  quotaRequired: string;
  resourceLabels: Record<WorkspaceQuotaItemType, string>;
};

export type SupportedLang = 'zh' | 'en';

export const quotaDialogI18n: Record<SupportedLang, QuotaDialogI18nConfig> = {
  zh: {
    title: '资源不足',
    alertTitle: '现在无法创建应用，您已经用尽了全部资源。',
    cancel: '取消',
    confirm: '确认',
    pleaseUpgradePlan: {
      prefix: '请 ',
      link: '升级您的计划',
      suffix: ' 或删除使用上述资源的应用。'
    },
    pleaseSubmitTicket: {
      prefix: '请',
      link: '点击此处',
      suffix: '提交工单以申请更多资源。'
    },
    quotaTotal: '总计: ',
    quotaInUse: '使用中: ',
    quotaAvailable: '可用: ',
    quotaRequired: '需要: ',
    resourceLabels: {
      cpu: 'CPU',
      memory: '内存',
      storage: '存储卷',
      gpu: 'GPU',
      traffic: '流量',
      nodeport: '端口'
    }
  },
  en: {
    title: 'Insufficient Resources',
    alertTitle: "We can't create your app right now. You've used all of your available resources.",
    cancel: 'Cancel',
    confirm: 'Confirm',
    pleaseUpgradePlan: {
      prefix: 'Please ',
      link: 'upgrade your plan',
      suffix: ' or delete unused apps occupying resources.'
    },
    pleaseSubmitTicket: {
      prefix: 'Please ',
      link: 'click here',
      suffix: ' to submit a ticket to request more resources.'
    },
    quotaTotal: 'Total: ',
    quotaInUse: 'In use: ',
    quotaAvailable: 'Available: ',
    quotaRequired: 'Required: ',
    resourceLabels: {
      cpu: 'CPU',
      memory: 'Memory',
      storage: 'Storage',
      gpu: 'GPU',
      traffic: 'Traffic',
      nodeport: 'Port'
    }
  }
};

/**
 * Get i18n config for quota dialog by language.
 *
 * @param lang - Language code
 * @returns I18n configuration
 */
export function getQuotaDialogI18n(lang: SupportedLang): QuotaDialogI18nConfig {
  return quotaDialogI18n[lang] ?? quotaDialogI18n.en;
}

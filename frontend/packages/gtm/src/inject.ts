export interface GTMConfig {
  gtmId: string;
  enabled?: boolean;
  debug?: boolean;
}
export const getGTMScripts = (config: GTMConfig) => {
  if (!config.enabled || !config.gtmId) {
    return { scripts: [], noscripts: [] };
  }

  return {
    scripts: [
      {
        src: `https://www.googletagmanager.com/gtm.js?id=${config.gtmId}`,
        strategy: 'beforeInteractive' as const,
        id: 'gtm-script'
      }
    ],
    noscripts: [
      {
        dangerouslySetInnerHTML: {
          __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${config.gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`
        }
      }
    ]
  };
};

export const initDataLayer = () => {
  if (typeof window !== 'undefined' && !window.dataLayer) {
    window.dataLayer = [];
  }
};
export const getDataLayerScript = () => {
  return 'window.dataLayer = window.dataLayer || [];';
};

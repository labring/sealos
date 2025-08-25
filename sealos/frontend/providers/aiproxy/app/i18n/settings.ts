export const fallbackLng = 'zh';
export const languages = [fallbackLng, 'en'];
export const defaultNS = 'common';

interface I18nextOptions {
  supportedLngs: string[];
  fallbackLng: string;
  lng: string;
  fallbackNS: string;
  defaultNS: string;
  ns: string | string[];
}

export function getOptions(lng = fallbackLng, ns: string | string[] = defaultNS): I18nextOptions {
  return {
    // debug: true,
    supportedLngs: languages,
    // preload: languages,
    fallbackLng,
    lng,
    fallbackNS: defaultNS,
    defaultNS,
    ns
    // backend: {
    //   projectId: '01b2e5e8-6243-47d1-b36f-963dbb8bcae3'
    // }
  };
}

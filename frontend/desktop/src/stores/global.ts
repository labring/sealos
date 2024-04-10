import { getSystemEnv } from '@/api/platform';
import { SystemEnv } from '@/types';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type GlobalState = {
  systemEnv: SystemEnv;
  initSystemEnv: () => void;
};

export const useGlobalStore = create<GlobalState>()(
  immer((set, get) => ({
    systemEnv: {
      callback_url: '',
      cf_sitekey: '',
      service_protocol_en: '',
      service_protocol_zh: '',
      private_protocol_en: '',
      private_protocol_zh: '',
      github_client_id: '',
      google_client_id: '',
      wechat_client_id: '',
      licenseEnabled: false,
      needGithub: false,
      needGoogle: false,
      needPassword: false,
      needSms: false,
      needWechat: false,
      private_protocol: '',
      service_protocol: '',
      stripeEnabled: false,
      oauth_proxy: '',
      guideEnabled: false,
      wechatEnabledRecharge: false,
      SEALOS_CLOUD_DOMAIN: 'cloud.sealos.io',
      rechargeEnabled: false,
      openWechatEnabled: false,
      oauth2_client_id: '',
      oauth2_auth_url: '',
      needOAuth2: false
    },
    async initSystemEnv() {
      const data = await getSystemEnv();
      set((state) => {
        state.systemEnv = data.data;
      });
    }
  }))
);

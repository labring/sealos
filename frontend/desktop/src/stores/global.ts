import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Session, SystemEnv, sessionKey } from '@/types';

type GlobalState = SystemEnv & {
  setEnv: <T extends keyof SystemEnv>(env: T, val: SystemEnv[T]) => void;
};

export const useGlobalStore = create<GlobalState>()(
  persist(
    immer((set) => ({
      callback_url: '',
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
      wechatEnabledRecharge: false,
      SEALOS_CLOUD_DOMAIN: 'cloud.sealos.io',
      rechargeEnabled: false,
      setEnv(env, val) {
        set({ [env]: val });
      }
    })),
    {
      name: 'sealos-desktop-global'
    }
  )
);

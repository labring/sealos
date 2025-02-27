import request from '@/services/request';
import { useConfigStore } from '@/stores/config';
import useScriptStore from '@/stores/script';
import { ApiResp } from '@/types';
import { Box, Button, ButtonProps, Link, LinkProps } from '@chakra-ui/react';
import { delay } from 'lodash';
import React, { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { v4 } from 'uuid';
import useSms from '../auth/useSms';
import useSmsStateStore from '@/stores/captcha';
import useCustomError from '../auth/useCustomError';
import { useTranslation } from 'next-i18next';
import { I18nCommonKey } from '@/types/i18next';
import { jsonRes } from '@/services/backend/response';
export type TCaptchaInstance = {
  invoke: () => void;
};
type Props = {
  showError: (errorMessage: I18nCommonKey, duration?: number) => void;
};
const HiddenCaptchaComponent = forwardRef(function HiddenCaptchaComponent(
  { showError }: Props,
  ref
) {
  const captchaElementRef = useRef<HTMLDivElement>(null);
  const captchaInstanceRef = useRef(null);
  const tokenRef = useRef('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { authConfig } = useConfigStore();
  useImperativeHandle<any, TCaptchaInstance>(
    ref,
    () => {
      return {
        invoke() {
          buttonRef.current?.click();
        }
      };
    },
    []
  );
  const { captchaIsLoaded } = useScriptStore();
  const [buttonId] = useState('captcha_button_pop');
  const [captchaId] = useState('captcha_' + v4().slice(0, 8));
  const { i18n, t } = useTranslation();
  // @ts-ignore
  const getInstance = (instance) => {
    captchaInstanceRef.current = instance;
  };

  useEffect(() => {
    if (!captchaIsLoaded) return;
    const initAliyunCaptchaOptions = {
      SceneId: authConfig?.captcha.ali.sceneId,
      prefix: authConfig?.captcha.ali.prefix,
      mode: 'popup',
      element: '#' + captchaId,
      button: '#' + buttonId,
      async captchaVerifyCallback(captchaVerifyParam: string) {
        try {
          const state = useSmsStateStore.getState();
          const id = state.phoneNumber;
          const res = await request.post<
            any,
            ApiResp<
              | {
                  result: boolean;
                  code: string;
                }
              | undefined
            >
          >('/api/auth/phone/sms', {
            id,
            captchaVerifyParam
          });
          console.log(res);
          if (res.code === 200) {
            if (res.message !== 'successfully') {
              return {
                captchaResult: true,
                bizResult: false
              };
            } else {
              return {
                captchaResult: true,
                bizResult: true
              };
            }
          } else {
            // boolean | undefined
            if (res.data?.result !== true)
              return {
                captchaResult: false
              };
            else
              return {
                captchaResult: true,
                bizResult: false
              };
          }
        } catch (err) {
          // @ts-ignore
          if (err?.code === 409 && err?.data?.result === false) {
            return {
              captchaResult: false,
              bizResult: false
            };
          } else {
            return {
              captchaResult: true,
              bizResult: false
            };
          }
          return;
        }
      },
      onBizResultCallback(bizResult: boolean) {
        if (bizResult) {
          const state = useSmsStateStore.getState();
          state.setRemainTime(60);
        } else {
          const message = i18n.t('common:get_code_failed') || 'Get code failed';
          showError(message);
        }
      },
      getInstance,
      slideStyle: {
        width: 360,
        height: 40
      },
      immediate: false,
      language: i18n.language === 'en' ? 'en' : 'cn',
      region: 'cn'
    };

    // @ts-ignore
    window.initAliyunCaptcha(initAliyunCaptchaOptions);

    return () => {
      captchaInstanceRef.current = null;
    };
  }, [captchaIsLoaded, t, i18n.language]);
  return (
    <>
      <Button ref={buttonRef} variant={'unstyled'} hidden id={buttonId} />
      <div ref={captchaElementRef} id={captchaId} />
    </>
  );
});

export { HiddenCaptchaComponent };

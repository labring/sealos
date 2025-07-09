import { useConfigStore } from '@/stores/config';
import useScriptStore from '@/stores/script';
import { Button, useToast } from '@chakra-ui/react';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { v4 } from 'uuid';
import { useTranslation } from 'next-i18next';
export type TCaptchaInstance = {
  invoke: () => void;
};
type Props = {
  onCaptchaComplete: (captchaVerifyParam: string) => Promise<{
    captchaValid: boolean;
    success: boolean;
  }>;
  onCallbackComplete: (success: boolean) => void;
  onInitError?: () => void;
};
const HiddenCaptchaComponent = forwardRef(function HiddenCaptchaComponent(
  { onCaptchaComplete, onCallbackComplete, onInitError }: Props,
  ref
) {
  const captchaElementRef = useRef<HTMLDivElement>(null);
  const captchaInstanceRef = useRef(null);
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
  const [buttonId] = useState('captcha_button_pop');
  const [captchaId] = useState('captcha_' + v4().slice(0, 8));
  const { captchaIsLoaded } = useScriptStore();
  const { i18n, t } = useTranslation();
  const toast = useToast();

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
        const result = await onCaptchaComplete(captchaVerifyParam);
        return {
          captchaResult: result.captchaValid,
          bizResult: result.success
        };
      },
      onBizResultCallback(bizResult: boolean) {
        onCallbackComplete(bizResult);
      },
      onError(error: any) {
        if (onInitError) {
          onInitError();
        } else {
          toast({
            title: t('common:captcha_init_failed'),
            status: 'error',
            duration: 3000,
            isClosable: true,
            position: 'top'
          });
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

    console.log('initializing captcha');

    // @ts-ignore
    window.initAliyunCaptcha(initAliyunCaptchaOptions);
    // console.log('inited success', captchaIsInited);
    // setCaptchaIsInited(true);
    // console.log('inited success2', captchaIsInited);
    return () => {
      captchaInstanceRef.current = null;
      // setCaptchaIsInited(false);
    };
  }, [i18n.language]);

  return (
    <>
      <Button ref={buttonRef} variant={'unstyled'} hidden id={buttonId} />
      <div ref={captchaElementRef} id={captchaId} />
    </>
  );
});

export { HiddenCaptchaComponent };

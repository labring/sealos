import { useConfigStore } from '@/stores/config';
import useScriptStore from '@/stores/script';
import { Box, Button, useToast } from '@chakra-ui/react';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef
} from 'react';
import { useTranslation } from 'next-i18next';
export type AliyunCaptchaHandles = {
  invoke: () => void;
  show: () => void;
  hide: () => void;
  init: () => void;
};

type Props = {
  onSuccess: (captchaVerifyParam: string) => void;
  onFail?: (result: any) => void;
  onInitError?: (error: any) => void;
};

const HiddenCaptchaComponent = forwardRef(function HiddenCaptchaComponent(
  { onSuccess, onFail, onInitError }: Props,
  ref
) {
  const captchaInitializedRef = useRef(false);

  const captchaElementRef = useRef<HTMLDivElement>(null);
  const captchaInstanceRef = useRef<any>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { authConfig } = useConfigStore();

  const buttonId = useId();
  const captchaId = useId();
  const { captchaIsLoaded } = useScriptStore();
  const { i18n, t } = useTranslation();
  const toast = useToast();

  const getInstance = (instance: any) => {
    captchaInstanceRef.current = instance;
  };

  const initAliyunCaptcha = useCallback(() => {
    const initAliyunCaptchaOptions = {
      SceneId: authConfig?.captcha.ali.sceneId,
      prefix: authConfig?.captcha.ali.prefix,
      mode: 'embed',
      element: '#' + CSS.escape(captchaId),
      button: '#' + CSS.escape(buttonId),
      async success(captchaVerifyParam: string) {
        onSuccess(captchaVerifyParam);
      },
      async fail(result: any) {
        if (onFail) {
          onFail(result);
        }
      },
      onError(error: any) {
        if (onInitError) {
          onInitError(error);
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
        width: 328,
        height: 40
      },
      immediate: false,
      language: i18n.language === 'en' ? 'en' : 'cn',
      captchaLogoImg: '/icons/favicon-32x32.png',
      region: 'cn'
    };

    // @ts-expect-error
    window.initAliyunCaptcha(initAliyunCaptchaOptions);
  }, [authConfig, buttonId, captchaId, i18n.language, onFail, onInitError, onSuccess, toast, t]);

  useEffect(() => {
    if (!captchaIsLoaded) return;

    if (captchaInitializedRef.current) return;
    console.log('[Aliyun Captcha] Try initialing the captcha.');

    initAliyunCaptcha();
    captchaInitializedRef.current = true;

    return () => {
      captchaInstanceRef.current = null;
    };
  }, [i18n.language, captchaIsLoaded, initAliyunCaptcha]);

  useImperativeHandle<any, AliyunCaptchaHandles>(ref, () => {
    return {
      invoke() {
        buttonRef.current?.click();
      },
      show() {
        captchaInstanceRef.current?.show();
      },
      hide() {
        captchaInstanceRef.current?.hide();
      },
      init() {
        initAliyunCaptcha();
      }
    };
  }, [initAliyunCaptcha]);

  return (
    <Box h={'40px'}>
      <Button ref={buttonRef} id={buttonId} hidden />
      <div ref={captchaElementRef} id={captchaId} />
    </Box>
  );
});

export { HiddenCaptchaComponent };

import request from '@/services/request';
import { useConfigStore } from '@/stores/config';
import useScriptStore from '@/stores/script';
import { Box, Button, ButtonProps, Link, LinkProps } from '@chakra-ui/react';
import { delay } from 'lodash';
import React, {
  ReactElement,
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState
} from 'react';
import { v4 } from 'uuid';
export type TCaptchaInstance = {
  getToken: () => Promise<string>;
  reset: () => void;
};

const HiddenCaptchaComponent = forwardRef(function HiddenCaptchaComponent(props, ref) {
  const captchaElementRef = useRef<HTMLDivElement>(null);
  const captchaInstanceRef = useRef(null);
  const tokenRef = useRef('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { authConfig } = useConfigStore();
  useImperativeHandle<any, TCaptchaInstance>(
    ref,
    () => {
      return {
        getToken: async () => {
          buttonRef.current?.click();
          await new Promise((res) => {
            setTimeout(res, 1000);
          });
          const token = tokenRef.current;
          return token;
        },
        reset() {
          tokenRef.current = '';
        }
      };
    },
    []
  );
  const { captchaIsLoaded } = useScriptStore();
  const [buttonId] = useState('captcha_button_pop');
  const [captchaId] = useState('captcha_' + v4().slice(0, 8));

  // @ts-ignore
  const getInstance = (instance) => {
    captchaInstanceRef.current = instance;
  };

  const onBizResultCallback = () => {};
  useEffect(() => {
    if (!captchaIsLoaded) return;
    const initAliyunCaptchaOptions = {
      SceneId: authConfig?.captcha.ali.sceneId,
      prefix: authConfig?.captcha.ali.prefix,
      mode: 'popup',
      element: '#' + captchaId,
      button: '#' + buttonId,
      async captchaVerifyCallback(captchaToken: string) {
        try {
          tokenRef.current = captchaToken;
          return {
            captchaResult: true
          };
        } catch (err) {
          tokenRef.current = '';
          return {
            captchaResult: false
          };
        }
      },
      onBizResultCallback: onBizResultCallback,
      getInstance,
      slideStyle: {
        width: 360,
        height: 40
      },
      immediate: false,
      language: 'cn',
      region: 'cn'
    };

    // @ts-ignore
    window.initAliyunCaptcha(initAliyunCaptchaOptions);

    return () => {
      captchaInstanceRef.current = null;
    };
  }, [captchaIsLoaded]);
  return (
    <>
      <Button
        ref={buttonRef}
        variant={'unstyled'}
        hidden
        id={buttonId}
        {...(props as ButtonProps)}
      />
      <div ref={captchaElementRef} id={captchaId} />
    </>
  );
});

export { HiddenCaptchaComponent };

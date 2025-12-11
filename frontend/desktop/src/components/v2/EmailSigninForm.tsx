import { useCustomToast } from '@/hooks/useCustomToast';
import request from '@/services/request';
import { useConfigStore } from '@/stores/config';
import { useSigninFormStore } from '@/stores/signinForm';
import { ApiResp } from '@/types';
import { gtmLoginStart } from '@/utils/gtm';
import { Button, Input } from '@chakra-ui/react';
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

export function EmailSigninForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useCustomToast();

  const { authConfig } = useConfigStore();
  const {
    formValues,
    setFormValues,
    captchaToken,
    setCaptchaToken,
    clearCaptchaToken,
    startTime,
    updateStartTime,
    clearStartTime
  } = useSigninFormStore();

  const [captchaSolved, setCaptchaSolved] = useState(false);

  // Countdown
  const getRemainingTime = useCallback(
    () => Math.max(0, 60000 - (new Date().getTime() - startTime)),
    [startTime]
  );
  const [remainingTime, setRemainingTime] = useState(getRemainingTime());

  // If captcha is disabled, automatically set captchaSolved to true
  useEffect(() => {
    if (!authConfig?.captcha.turnstile.enabled) {
      setCaptchaSolved(true);
    } else {
      setCaptchaSolved(false);
    }
  }, [authConfig?.captcha.turnstile.enabled]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newRemainingTime = getRemainingTime();

      if (newRemainingTime <= 0) {
        clearInterval(interval);
      }

      setRemainingTime(newRemainingTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, getRemainingTime]);

  const emailValid = useMemo(() => {
    const schema = z.string().email();
    return formValues?.providerType === 'EMAIL' && schema.safeParse(formValues?.providerId).success;
  }, [formValues]);

  const turnstileRef = useRef<TurnstileInstance>(null);
  const handleCaptchaSuccess = (token: string) => {
    setCaptchaSolved(true);
    setCaptchaToken(token);
  };
  const handleCaptchaError = () => {
    setCaptchaSolved(false);
    clearCaptchaToken();
  };

  const sendCodeMutation = useMutation(({ id, cfToken }: { id: string; cfToken: string | null }) =>
    request.post<any, ApiResp<any>>('/api/auth/email/sms', {
      id,
      cfToken: cfToken ?? undefined
    })
  );

  const sendCode = async (cfToken: string | null) => {
    try {
      if (!formValues || formValues.providerType !== 'EMAIL') {
        throw new Error('No signup data found');
      }

      const result = await sendCodeMutation.mutateAsync({
        id: formValues.providerId,
        cfToken
      });
      if (result.code !== 200) {
        throw Error(result.message);
      } else {
        return true;
      }
    } catch (error) {
      console.error('Failed to send verification phone:', error);
      toast({
        title: t('common:get_code_failed'),
        description: (error as Error)?.message || t('v2:unknown_error'),
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top'
      });

      return false;
    }
  };

  const handleSignin = async () => {
    if (!emailValid) {
      toast({
        title: t('common:invalid_email'),
        status: 'error'
      });
      return;
    }

    gtmLoginStart();
    const codeSent = await sendCode(captchaToken);

    if (codeSent) {
      updateStartTime();
      router.push('/emailCheck');
    } else {
      clearStartTime();
      handleCaptchaError();
      turnstileRef.current?.reset();
    }
  };

  return (
    <>
      <Input
        boxSize="border-box"
        display="flex"
        flexDirection="row"
        alignItems="center"
        padding="8px 12px"
        gap="4px"
        height="40px"
        background="#FFFFFF"
        border="1px solid #E4E4E7"
        borderRadius="8px"
        flex="none"
        order="0"
        placeholder={t('v2:email')}
        alignSelf="stretch"
        flexGrow="0"
        value={formValues?.providerId || ''}
        onChange={(e) => {
          setFormValues({
            providerId: e.target.value,
            providerType: 'EMAIL'
          });
        }}
      />

      {!!authConfig?.captcha.turnstile.enabled && (
        <Turnstile
          options={{
            size: 'flexible',
            refreshExpired: 'manual',
            refreshTimeout: 'manual'
          }}
          ref={turnstileRef}
          siteKey={authConfig?.captcha.turnstile.siteKey}
          onSuccess={handleCaptchaSuccess}
          onExpire={handleCaptchaError}
          onTimeout={handleCaptchaError}
          onError={handleCaptchaError}
        />
      )}

      <Button
        onClick={handleSignin}
        isDisabled={!(emailValid && captchaSolved) || remainingTime > 0}
        isLoading={sendCodeMutation.isLoading}
        bgColor={'#0A0A0A'}
        borderRadius={'8px'}
        variant={'solid'}
        px={'0'}
        rightIcon={remainingTime <= 0 ? <ArrowRight size={'16px'}></ArrowRight> : <></>}
      >
        {remainingTime > 0
          ? t('v2:can_request_new_link', { countdown: Math.floor(remainingTime / 1000) })
          : t('v2:email_sign_in')}
      </Button>
    </>
  );
}

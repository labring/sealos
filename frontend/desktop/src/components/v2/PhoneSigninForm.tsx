import { useCustomToast } from '@/hooks/useCustomToast';
import request from '@/services/request';
import { useConfigStore } from '@/stores/config';
import { useSigninFormStore } from '@/stores/signinForm';
import { ApiResp } from '@/types';
import { gtmLoginStart } from '@/utils/gtm';
import { Button, Input, InputGroup, InputLeftElement, Text } from '@chakra-ui/react';
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { HiddenCaptchaComponent, AliyunCaptchaHandles } from '../signin/Captcha';

export function PhoneSigninForm() {
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

  const phoneValid = useMemo(() => {
    const schema = z.string().regex(/^1[3-9]\d{9}$/);
    return formValues?.providerType === 'PHONE' && schema.safeParse(formValues?.providerId).success;
  }, [formValues]);

  const aliCaptchaRef = useRef<AliyunCaptchaHandles>(null);

  const handleCaptchaSuccess = (token: string) => {
    setCaptchaSolved(true);
    setCaptchaToken(token);
  };
  const handleCaptchaError = () => {
    setCaptchaSolved(false);
    clearCaptchaToken();
  };

  const sendCodeMutation = useMutation(
    ({ id, captchaVerifyParam }: { id: string; captchaVerifyParam?: string }) =>
      request.post<
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
      })
  );

  const sendCode = async (captchaVerifyParam: string | null) => {
    try {
      if (!formValues || formValues.providerType !== 'PHONE') {
        throw new Error('No signup data found');
      }

      const result = await sendCodeMutation.mutateAsync({
        id: formValues.providerId,
        captchaVerifyParam: captchaVerifyParam ?? undefined
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
    if (!phoneValid) {
      toast({
        title: t('common:invalid_phone_number'),
        status: 'error'
      });
      return;
    }

    gtmLoginStart();
    const codeSent = await sendCode(captchaToken);

    if (codeSent) {
      updateStartTime();

      router.push('/phoneCheck');
    } else {
      clearStartTime();
      aliCaptchaRef.current?.init();
    }
  };

  return (
    <>
      <InputGroup width={'full'}>
        <InputLeftElement color={'#71717A'} left={'12px'} h={'40px'}>
          <Text
            pl="10px"
            pr="8px"
            height={'20px'}
            borderRight={'1px'}
            fontSize={'14px'}
            borderColor={'#E4E4E7'}
          >
            +86
          </Text>
        </InputLeftElement>
        <Input
          height="40px"
          w="full"
          fontSize={'14px'}
          background="#FFFFFF"
          border="1px solid #E4E4E7"
          borderRadius="8px"
          placeholder={t('common:phone')}
          py="10px"
          pr={'12px'}
          pl={'60px'}
          color={'#71717A'}
          value={formValues?.providerId || ''}
          onChange={(e) => {
            setFormValues({
              providerId: e.target.value,
              providerType: 'PHONE'
            });
          }}
        />
      </InputGroup>

      {authConfig?.captcha.ali.enabled && (
        <HiddenCaptchaComponent
          ref={aliCaptchaRef}
          onSuccess={handleCaptchaSuccess}
          onFail={handleCaptchaError}
        />
      )}

      <Button
        onClick={handleSignin}
        isDisabled={!(phoneValid && captchaSolved) || remainingTime > 0}
        isLoading={sendCodeMutation.isLoading}
        bgColor={'#0A0A0A'}
        borderRadius={'8px'}
        variant={'solid'}
        px={'0'}
        rightIcon={remainingTime <= 0 ? <ArrowRight size={'16px'}></ArrowRight> : <></>}
      >
        {remainingTime > 0
          ? t('v2:can_request_new_link', { countdown: Math.floor(remainingTime / 1000) })
          : t('v2:sign_in')}
      </Button>
    </>
  );
}

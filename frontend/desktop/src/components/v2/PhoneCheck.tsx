import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Stack,
  Text,
  useToast,
  useColorModeValue,
  PinInput,
  PinInputField,
  Center
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { ArrowLeft, MailCheck, OctagonAlertIcon } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'next-i18next';

import { useSignupStore } from '@/stores/signup';
import { getRegionToken } from '@/api/auth';
import useSessionStore from '@/stores/session';
import { useMutation } from '@tanstack/react-query';
import request from '@/services/request';
import { ApiResp } from '@/types';
import { getAdClickData, getInviterId, getUserSemData, sessionConfig } from '@/utils/sessionConfig';
import { HiddenCaptchaComponent, TCaptchaInstance } from '../signin/Captcha';
import { useConfigStore } from '@/stores/config';
import useCustomError from '../signin/auth/useCustomError';
import useScriptStore from '@/stores/script';
import { gtmLoginSuccess } from '@/utils/gtm';

export default function PhoneCheckComponent() {
  const router = useRouter();
  const { t } = useTranslation();
  const toast = useToast();
  const conf = useConfigStore();
  const [isLoading, setIsLoading] = useState(false);
  const { captchaIsLoaded } = useScriptStore();
  const { signupData, clearSignupData, startTime, updateStartTime } = useSignupStore();
  const [pinValue, setPinValue] = useState('');
  const { setToken } = useSessionStore();

  const getRemainTime = () => 60000 - new Date().getTime() + startTime;

  const [canResend, setCanResend] = useState(getRemainTime() < 0);

  const [remainTime, setRemainTime] = useState(getRemainTime());

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

  const handleCaptchaComplete = async (captchaVerifyParam: string) => {
    try {
      if (!signupData || signupData.providerType !== 'PHONE')
        return {
          captchaValid: false,
          success: false
        };

      const res = await sendCodeMutation.mutateAsync({
        id: signupData.providerId,
        captchaVerifyParam
      });

      if (res.code === 200) {
        if (res.message !== 'successfully') {
          return {
            captchaValid: true,
            success: false
          };
        } else {
          return {
            captchaValid: true,
            success: true
          };
        }
      } else {
        // boolean | undefined
        if (res.data?.result !== true)
          return {
            captchaValid: false,
            success: false
          };
        else
          return {
            captchaValid: true,
            success: false
          };
      }
    } catch (err) {
      // @ts-ignore
      if (err?.code === 409 && err?.data?.result === false) {
        return {
          captchaValid: false,
          success: false
        };
      } else {
        return {
          captchaValid: true,
          success: false
        };
      }
    }
  };

  const handleCaptchaCallbackComplete = (success: boolean) => {
    if (success) {
      // Start countdown
      setCanResend(false);
      updateStartTime();
    } else {
      toast({
        title: t('common:get_code_failed'),
        status: 'error',
        duration: 3000,
        isClosable: true,
        position: 'top'
      });
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const newRemainTime = getRemainTime();

      if (newRemainTime <= 0) {
        setCanResend(true);
        clearInterval(interval);
      }
      setRemainTime(newRemainTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const verifyMutation = useMutation({
    mutationFn: (data: { id: string; code: string }) =>
      request.post<any, ApiResp<{ token: string; needInit: boolean }>>('/api/auth/phone/verify', {
        id: data.id,
        code: data.code,
        inviterId: getInviterId(),
        semData: getUserSemData(),
        adClickData: getAdClickData()
      }),
    async onSuccess(result) {
      const globalToken = result.data?.token;
      if (!globalToken) throw Error();
      setToken(globalToken);
      if (result.data?.needInit) {
        gtmLoginSuccess({
          user_type: 'new',
          method: 'phone'
        });
        await router.push('/workspace');
      } else {
        gtmLoginSuccess({
          user_type: 'existing',
          method: 'phone'
        });
        const regionTokenRes = await getRegionToken();
        if (regionTokenRes?.data) {
          await sessionConfig(regionTokenRes.data);
          await router.replace('/');
        }
      }
    }
  });

  const captchaRef = useRef<TCaptchaInstance>(null);

  const onSubmit = async (force = false) => {
    if ((!canResend || isLoading) && !force) return;

    // Clear error state
    verifyMutation.reset();
    // Clear input field
    setPinValue('');

    setIsLoading(true);
    try {
      if (!signupData || signupData.providerType !== 'PHONE') {
        throw new Error('No signup data found');
      }

      if (conf.authConfig?.captcha.enabled) {
        console.log('onsubmit', captchaRef.current);
        if (!captchaRef.current) {
          setIsLoading(false);
          return;
        }
        captchaRef.current.invoke();
      } else {
        const result = await sendCodeMutation.mutateAsync({
          id: signupData.providerId
        });
        if (result.code !== 200) {
          throw Error(result.message);
        } else {
          // Start countdown
          setCanResend(false);
          updateStartTime();
        }
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (captchaIsLoaded && startTime + 60_000 <= new Date().getTime()) {
      timeout = setTimeout(() => onSubmit(true), 2000);
    }

    return () => {
      clearTimeout(timeout);
    };
  }, [captchaIsLoaded, startTime]);

  const handleBack = () => {
    router.back();
  };
  const bg = useColorModeValue('white', 'gray.700');

  useEffect(() => {
    if (!signupData || signupData.providerType !== 'PHONE') {
      router.push('/');
    }
  }, []);

  return (
    <Flex minH="100vh" align="center" justify="center" bg={bg} direction={'column'}>
      <Stack spacing={8} mx="auto" maxW="lg" px={4} h={'60%'}>
        <Flex rounded="lg" p={8} gap={'16px'} flexDirection={'column'}>
          <Box>
            <MailCheck size={'32px'} color="#ADBDCE"></MailCheck>
          </Box>
          <Text fontWeight="600" fontSize="24px" lineHeight="31px" color="#000000" mt={'8px'}>
            {t('v2:check_your_phone')}
          </Text>
          {remainTime > 0 && (
            <Text fontWeight="400" fontSize="14px" lineHeight="20px" color="#18181B" mb="4px">
              {t('v2:phone_verification_message', { phone: signupData?.providerId || '' })}
            </Text>
          )}
          <FormControl id="verificationCode">
            <FormLabel></FormLabel>
            <PinInput
              placeholder=""
              focusBorderColor="#18181B"
              autoFocus
              value={pinValue}
              onChange={setPinValue}
              isDisabled={verifyMutation.isLoading}
              onComplete={(value) => {
                verifyMutation.mutate({ code: value, id: signupData?.providerId || '' });
              }}
            >
              {Array.from({ length: 6 }, (_, index) => (
                <PinInputField
                  key={index}
                  placeholder=""
                  mr={{ base: '4px', lg: '8px' }}
                  boxSize={{ base: '40px', lg: '56px' }}
                  fontSize={{ base: '16px', lg: '20px' }}
                  borderRadius={'12px'}
                />
              ))}
            </PinInput>
          </FormControl>

          {sendCodeMutation.isLoading && (
            <Text
              style={{
                fontWeight: 400,
                fontSize: '14px',
                lineHeight: '20px'
              }}
            >
              {t('v2:sending_code')}
            </Text>
          )}

          {verifyMutation.isLoading ? (
            <Text
              style={{
                fontWeight: 400,
                fontSize: '14px',
                lineHeight: '20px'
              }}
            >
              {t('v2:verifying')}
            </Text>
          ) : (
            <Flex>
              {verifyMutation.isError && (
                <Center boxSize={'20px'} mr={'2px'}>
                  <OctagonAlertIcon size={14} color="#DC2626"></OctagonAlertIcon>
                </Center>
              )}
              <Box>
                {verifyMutation.isError && (
                  <Text
                    style={{
                      fontWeight: 400,
                      fontSize: '14px',
                      lineHeight: '20px'
                    }}
                    color={'#DC2626'}
                  >
                    {t('common:invalid_verification_code')}
                  </Text>
                )}
                {canResend ? (
                  <Text
                    as="a"
                    fontWeight="400"
                    fontSize="14px"
                    lineHeight="20px"
                    color="#2563EB"
                    flex="none"
                    alignSelf="stretch"
                    flexGrow={0}
                    cursor="pointer"
                    onClick={() => onSubmit()}
                    _hover={{ textDecoration: 'underline' }}
                  >
                    {t('v2:request_new_link')}
                  </Text>
                ) : remainTime > 0 ? (
                  <Text
                    fontWeight="400"
                    fontSize="14px"
                    lineHeight="20px"
                    color="#18181B"
                    flex="none"
                    alignSelf="stretch"
                    flexGrow={0}
                  >
                    {t('v2:can_request_new_link', { countdown: Math.floor(remainTime / 1000) })}
                  </Text>
                ) : (
                  <></>
                )}
              </Box>
            </Flex>
          )}
          <Flex justifyContent={'space-between'} mt={'16px'}>
            <Button
              bg={'white'}
              color={'#18181B'}
              borderWidth={1}
              borderColor={'grayModern.200'}
              _hover={{ bg: 'grayModern.50' }}
              leftIcon={<ArrowLeft size={'16px'} />}
              onClick={handleBack}
              borderRadius={'8px'}
              type="button"
            >
              {t('v2:back')}
            </Button>
          </Flex>
          {conf.authConfig?.captcha.enabled && (
            <HiddenCaptchaComponent
              ref={captchaRef}
              onCallbackComplete={handleCaptchaCallbackComplete}
              onCaptchaComplete={handleCaptchaComplete}
            />
          )}
        </Flex>
      </Stack>
    </Flex>
  );
}

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
import { ApiResp } from '@/types';
import request from '@/services/request';
import { sessionConfig } from '@/utils/sessionConfig';
import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile';
import { useConfigStore } from '@/stores/config';
import { gtmLoginSuccess } from '@/utils/gtm';

export default function EmailCheckComponent() {
  const router = useRouter();
  const { t } = useTranslation();
  const { commonConfig, authConfig } = useConfigStore();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { signupData, clearSignupData, startTime, updateStartTime, setStartTime } =
    useSignupStore();
  const { setToken } = useSessionStore();
  const [pinValue, setPinValue] = useState('');
  useEffect(() => {
    if (!signupData) {
      router.push('/signin');
    }
  }, [signupData, router]);

  const getRemainTime = () => 60000 - new Date().getTime() + startTime;

  const [canResend, setCanResend] = useState(getRemainTime() < 0);

  const [remainTime, setRemainTime] = useState(getRemainTime());
  const turnstileRef = useRef<TurnstileInstance>(null);
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
      request.post<any, ApiResp<{ token: string; needInit: boolean }>>('/api/auth/email/verify', {
        id: data.id,
        code: data.code
        // inviterId: getInviterId(),
        // semData: getUserSemData(),
        // bdVid: getBaiduId()
      }),
    async onSuccess(result) {
      const globalToken = result.data?.token;
      if (!globalToken) throw Error();
      setToken(globalToken);
      if (result.data?.needInit) {
        gtmLoginSuccess({
          user_type: 'new',
          method: 'email'
        });
        await router.push('/workspace');
      } else {
        const regionTokenRes = await getRegionToken();
        if (regionTokenRes?.data) {
          gtmLoginSuccess({
            user_type: 'existing',
            method: 'email'
          });
          await sessionConfig(regionTokenRes.data);
          await router.replace('/');
        }
      }
    }
  });

  const sendCodeMutation = useMutation(
    ({ id, cfToken }: { id: string; cfToken: string | undefined }) =>
      request.post<any, ApiResp<any>>('/api/auth/email/sms', {
        id,
        cfToken
      })
  );

  const sendCode = async (cfToken?: string) => {
    setIsLoading(true);
    const oldTime = startTime;
    setCanResend(false);

    try {
      if (!signupData || signupData.providerType !== 'EMAIL') {
        throw new Error('No signup data found');
      }

      const result = await sendCodeMutation.mutateAsync({
        id: signupData.providerId,
        cfToken
      });
      if (result.code !== 200) {
        throw Error(result.message);
      } else {
        updateStartTime();
      }
    } catch (error) {
      // rollout
      setStartTime(oldTime);
      setCanResend(true);
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

  const onSubmit = async (force = false) => {
    if ((!canResend || isLoading) && !force) return;

    // Clear error state
    verifyMutation.reset();
    // Clear input field
    setPinValue('');

    if (authConfig?.turnstile.enabled) {
      turnstileRef.current?.reset();
    } else {
      sendCode();
    }
  };

  const onTurnstileSuccess = (cfToken: string) => {
    if (startTime + 60_000 <= new Date().getTime()) {
      sendCode(cfToken);
    }
  };

  // Trigger code send when page loaded.
  // If turnstile is enabled, it will be triggered by onSuccess callback and we do not need to manually trigger it.
  useEffect(() => {
    if (startTime + 60_000 <= new Date().getTime() && !authConfig?.turnstile.enabled) {
      onSubmit(true);
    }
  }, []);

  const handleBack = () => {
    router.back();
  };
  const bg = useColorModeValue('white', 'gray.700');

  return (
    <Flex minH="100vh" align="center" justify="center" bg={bg} direction={'column'}>
      <Stack spacing={8} mx="auto" maxW="lg" px={4} h={'60%'}>
        <Flex rounded="lg" p={8} gap={'16px'} flexDirection={'column'}>
          <Box>
            <MailCheck size={'32px'} color="#ADBDCE"></MailCheck>
          </Box>
          <Text fontWeight="600" fontSize="24px" lineHeight="31px" color="#000000" mt={'8px'}>
            {t('v2:check_your_email')}
          </Text>

          {!!authConfig?.turnstile.enabled && (
            <Turnstile
              options={{
                size: 'normal',
                refreshExpired: 'never',
                refreshTimeout: 'never'
              }}
              ref={turnstileRef}
              siteKey={authConfig?.turnstile.cloudflare.siteKey}
              onSuccess={onTurnstileSuccess}
            />
          )}

          {remainTime > 0 && (
            <Text fontWeight="400" fontSize="14px" lineHeight="20px" color="#18181B" mb="4px">
              {t('v2:verification_message', { email: signupData?.providerId || '' })}
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
                console.log('Verification code:', value);
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

          {isLoading && (
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
        </Flex>
      </Stack>
    </Flex>
  );
}

import { getRegionToken, autoInitRegionToken } from '@/api/auth';
import request from '@/services/request';
import useSessionStore from '@/stores/session';
import { useSigninFormStore } from '@/stores/signinForm';
import { ApiResp } from '@/types';
import { gtmLoginSuccess } from '@/utils/gtm';
import { sessionConfig } from '@/utils/sessionConfig';
import { consumePendingOauth2RedirectPath } from '@/utils/oauth2';
import { useGuideModalStore } from '@/stores/guideModal';
import {
  Flex,
  Stack,
  FormControl,
  FormLabel,
  PinInput,
  PinInputField,
  Center,
  Button,
  useColorModeValue,
  Text,
  Box
} from '@chakra-ui/react';
import { useMutation } from '@tanstack/react-query';
import { MailCheck, OctagonAlertIcon, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface EmailCheckFormProps {
  isModal?: boolean;
  onBack?: () => void;
}

type VerificationErrorType = 'invalid_code' | 'attempts_exhausted' | 'expired_code' | 'unknown';

interface VerificationRequestError {
  code?: number;
  message?: string;
  data?: {
    error?: string;
    remainingAttempts?: number;
    retryAfter?: number;
  };
}

interface VerificationErrorState {
  type: VerificationErrorType;
  remainingAttempts?: number;
}

export function EmailCheckForm({ isModal = false, onBack }: EmailCheckFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { setGlobalToken } = useSessionStore();

  const [pinValue, setPinValue] = useState('');
  const [verificationError, setVerificationError] = useState<VerificationErrorState | null>(null);
  const [retryUntil, setRetryUntil] = useState<number | null>(null);
  const [retryRemainingTime, setRetryRemainingTime] = useState(0);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const { formValues, startTime, challengeId } = useSigninFormStore();

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

  useEffect(() => {
    if (retryUntil === null) return;

    setRetryRemainingTime(Math.max(0, retryUntil - Date.now()));
    const interval = window.setInterval(() => {
      const nextRemainingTime = Math.max(0, retryUntil - Date.now());
      setRetryRemainingTime(nextRemainingTime);
      if (nextRemainingTime <= 0) window.clearInterval(interval);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [retryUntil]);

  const verifyMutation = useMutation<
    ApiResp<{ token: string; needInit: boolean }>,
    VerificationRequestError,
    { id: string; code: string }
  >({
    mutationFn: (data: { id: string; code: string }) =>
      request.post<any, ApiResp<{ token: string; needInit: boolean }>>('/api/auth/email/verify', {
        id: data.id,
        code: data.code,
        challengeId
      }),
    async onSuccess(result) {
      const oauth2RedirectPath = consumePendingOauth2RedirectPath();
      const postLoginRedirect = oauth2RedirectPath || '/';
      const globalToken = result.data?.token;
      if (!globalToken) throw Error();
      setGlobalToken(globalToken); // Sets global token and cookie
      if (result.data?.needInit) {
        try {
          // 自动初始化工作空间
          const initResult = await autoInitRegionToken();

          if (initResult?.data) {
            const productUserTraits = await sessionConfig(initResult.data);
            gtmLoginSuccess({
              user_type: 'new',
              method: 'email',
              productUserTraits
            });
            const { setInitGuide } = useGuideModalStore.getState();
            setInitGuide(true);
            window.location.href = postLoginRedirect;
          }
        } catch (error) {
          console.error('Auto init failed, fallback to manual:', error);
          gtmLoginSuccess({
            user_type: 'new',
            method: 'email'
          });
          window.location.href = oauth2RedirectPath || '/workspace';
        }
      } else {
        const regionTokenRes = await getRegionToken();
        if (regionTokenRes?.data) {
          const productUserTraits = await sessionConfig(regionTokenRes.data);
          gtmLoginSuccess({
            user_type: 'existing',
            method: 'email',
            productUserTraits
          });
          window.location.href = postLoginRedirect;
        }
      }
    },
    onError(error) {
      const errorType = error.data?.error;
      const remainingAttempts = error.data?.remainingAttempts;

      if (errorType === 'attempts_exhausted') {
        const retryAfter =
          typeof error.data?.retryAfter === 'number' ? Math.max(0, error.data.retryAfter) : 0;
        setRetryRemainingTime(retryAfter * 1000);
        setRetryUntil(Date.now() + retryAfter * 1000);
        setVerificationError({ type: 'attempts_exhausted', remainingAttempts: 0 });
        return;
      }

      if (errorType === 'expired_code') {
        setVerificationError({ type: 'expired_code' });
        return;
      }

      setVerificationError({
        type: errorType === 'invalid_code' ? 'invalid_code' : 'unknown',
        remainingAttempts
      });
      setPinValue('');
      window.setTimeout(() => firstInputRef.current?.focus(), 0);
    }
  });

  const handleBack = () => {
    if (isModal && onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const isVerificationLocked =
    verificationError?.type === 'attempts_exhausted' || verificationError?.type === 'expired_code';
  const retryCountdown = Math.ceil(retryRemainingTime / 1000);
  const getVerificationErrorMessage = () => {
    if (
      verificationError?.type === 'invalid_code' &&
      typeof verificationError.remainingAttempts === 'number'
    ) {
      return t('common:invalid_verification_code_with_attempts', {
        count: verificationError.remainingAttempts
      });
    }
    if (verificationError?.type === 'attempts_exhausted') {
      return retryCountdown > 0
        ? t('common:verification_attempts_exhausted_with_retry', {
            countdown: retryCountdown
          })
        : t('common:verification_attempts_exhausted');
    }
    if (verificationError?.type === 'expired_code') {
      return t('common:verification_code_expired');
    }
    return t('common:invalid_verification_code');
  };

  const bg = useColorModeValue('white', 'gray.700');
  return (
    <Flex
      minH={isModal ? 'auto' : '100vh'}
      align="center"
      justify="center"
      bg={isModal ? 'transparent' : bg}
      direction={'column'}
    >
      <Stack spacing={8} mx="auto" maxW="lg" px={isModal ? 0 : 4} h={'60%'}>
        <Flex rounded="lg" p={isModal ? 0 : 8} gap={'16px'} flexDirection={'column'}>
          <Box>
            <MailCheck size={'32px'} color="#ADBDCE"></MailCheck>
          </Box>
          <Text fontWeight="600" fontSize="24px" lineHeight="31px" color="#000000" mt={'8px'}>
            {t('v2:check_your_email')}
          </Text>

          {remainingTime > 0 && (
            <Text fontWeight="400" fontSize="14px" lineHeight="20px" color="#18181B" mb="4px">
              {t('v2:verification_message', { email: formValues?.providerId || '' })}
            </Text>
          )}

          <FormControl id="verificationCode">
            <FormLabel></FormLabel>
            <PinInput
              placeholder=""
              focusBorderColor="#18181B"
              autoFocus
              value={pinValue}
              onChange={(value) => {
                setPinValue(value);
                if (!isVerificationLocked && verificationError) {
                  setVerificationError(null);
                  verifyMutation.reset();
                }
              }}
              isDisabled={verifyMutation.isLoading || isVerificationLocked}
              onComplete={(value) => {
                if (!isVerificationLocked) {
                  verifyMutation.mutate({ code: value, id: formValues?.providerId || '' });
                }
              }}
            >
              {Array.from({ length: 6 }, (_, index) => (
                <PinInputField
                  key={index}
                  ref={index === 0 ? firstInputRef : undefined}
                  placeholder=""
                  mr={{ base: '4px', lg: '8px' }}
                  boxSize={{ base: '40px', lg: '56px' }}
                  fontSize={{ base: '16px', lg: '20px' }}
                  borderRadius={'12px'}
                />
              ))}
            </PinInput>
          </FormControl>

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
              {verificationError && (
                <Center boxSize={'20px'} mr={'2px'}>
                  <OctagonAlertIcon size={14} color="#DC2626"></OctagonAlertIcon>
                </Center>
              )}
              <Box>
                {verificationError && (
                  <Text
                    style={{
                      fontWeight: 400,
                      fontSize: '14px',
                      lineHeight: '20px'
                    }}
                    color={'#DC2626'}
                  >
                    {getVerificationErrorMessage()}
                  </Text>
                )}

                {!isVerificationLocked && remainingTime > 0 ? (
                  <Text
                    fontWeight="400"
                    fontSize="14px"
                    lineHeight="20px"
                    color="#18181B"
                    flex="none"
                    alignSelf="stretch"
                    flexGrow={0}
                  >
                    {t('v2:can_request_new_link', { countdown: Math.floor(remainingTime / 1000) })}
                  </Text>
                ) : retryRemainingTime <= 0 ? (
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
                    onClick={handleBack}
                    _hover={{ textDecoration: 'underline' }}
                  >
                    {t('v2:request_new_link')}
                  </Text>
                ) : null}
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

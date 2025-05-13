import {
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Heading,
  Input,
  Stack,
  Text,
  useToast,
  useColorModeValue,
  Link,
  Image,
  PinInput,
  PinInputField,
  Icon,
  Center
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { ArrowLeft, MailCheck, OctagonAlertIcon } from 'lucide-react';
import { useForm, useFormContext, Controller } from 'react-hook-form';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'next-i18next';
import { zodResolver } from '@hookform/resolvers/zod';

import { useSignupStore } from '@/stores/signup';
import { ccEmailSignUp, getRegionToken, initRegionToken } from '@/api/auth';
import useSessionStore from '@/stores/session';
import { useMutation } from '@tanstack/react-query';
import request from '@/services/request';
import { ApiResp } from '@/types';
import { getBaiduId, getInviterId, getUserSemData, sessionConfig } from '@/utils/sessionConfig';
import { HiddenCaptchaComponent, TCaptchaInstance } from '../signin/Captcha';
import { useConfigStore } from '@/stores/config';
import force from '@/pages/api/auth/delete/force';
import useCustomError from '../signin/auth/useCustomError';
import useSmsStateStore from '@/stores/captcha';

export default function PhoneCheckComponent() {
  const router = useRouter();
  const { t } = useTranslation();
  const toast = useToast();
  const conf = useConfigStore();
  const [isLoading, setIsLoading] = useState(false);
  const { signupData, clearSignupData } = useSignupStore();
  const { setToken } = useSessionStore();
  useEffect(() => {
    if (!signupData) {
      router.push('/signin');
    }
  }, [signupData, router]);

  const [canResend, setCanResend] = useState(false);
  // const [countdown, setCountdown] = useState(60);
  const { remainTime, setRemainTime, setPhoneNumber } = useSmsStateStore();
  useEffect(() => {
    if (remainTime <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => {
      setRemainTime(remainTime - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [remainTime]);
  const verifyMutation = useMutation({
    mutationFn: (data: { id: string; code: string }) =>
      request.post<any, ApiResp<{ token: string; needInit: boolean }>>('/api/auth/phone/verify', {
        id: data.id,
        code: data.code,
        inviterId: getInviterId(),
        semData: getUserSemData(),
        bdVid: getBaiduId()
      }),
    async onSuccess(result) {
      const globalToken = result.data?.token;
      if (!globalToken) throw Error();
      setToken(globalToken);
      if (result.data?.needInit) {
        await router.push('/workspace');
      } else {
        const regionTokenRes = await getRegionToken();
        if (regionTokenRes?.data) {
          await sessionConfig(regionTokenRes.data);
          await router.replace('/');
        }
      }
    }
  });

  const sendCodeMutation = useMutation(({ id }: { id: string }) =>
    request.post<any, ApiResp<any>>('/api/auth/phone/sms', {
      id
    })
  );
  // mutation.mutateAsync({
  //   providerId: signupData.providerId,
  //   code: data.verificationCode,
  //   providerType: signupData.providerType
  // });
  const captchaRef = useRef<TCaptchaInstance>(null);
  const onSubmit = async (force = false) => {
    if ((!canResend || isLoading) && !force) return;

    setIsLoading(true);
    try {
      if (!signupData || signupData.providerType !== 'PHONE') {
        throw new Error('No signup data found');
      }
      if (conf.authConfig?.captcha.enabled) {
        captchaRef.current?.invoke();
      } else {
        const result = await sendCodeMutation.mutateAsync({
          id: signupData.providerId
        });
        if (result.code !== 200) {
          throw Error(result.message);
        }
      }
      // const result = await sendCodeMutation.mutateAsync({
      //   id: signupData.providerId
      // });
      // if (result.code !== 200) {
      //   throw Error(result.message);
      // }
      // Start countdown
      setCanResend(false);
      setRemainTime(60);
    } catch (error) {
      console.error('Failed to send verification phone:', error);
      toast({
        title: t('v2:sign_up_failed'),
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
    onSubmit(true);
  }, []);
  const handleBack = () => {
    router.back();
  };
  const bg = useColorModeValue('white', 'gray.700');
  const { ErrorComponent, showError } = useCustomError();
  if (!signupData) {
    router.back();
    return null;
  }
  return (
    <Flex minH="100vh" align="center" justify="center" bg={bg} w={'50%'} direction={'column'}>
      <Stack spacing={8} mx="auto" maxW="lg" px={4} h={'60%'}>
        <Flex rounded="lg" p={8} w={'480px'} gap={'16px'} flexDirection={'column'}>
          <Box>
            <MailCheck size={'32px'} color="#ADBDCE"></MailCheck>
          </Box>
          <Text fontWeight="600" fontSize="24px" lineHeight="31px" color="#000000" mt={'8px'}>
            {t('v2:check_your_phone')}
          </Text>
          <Text fontWeight="400" fontSize="14px" lineHeight="20px" color="#18181B" mb="4px">
            {t('v2:phone_verification_message', { phone: signupData.providerId })}
          </Text>
          <FormControl id="verificationCode">
            <FormLabel></FormLabel>
            <PinInput
              placeholder=""
              focusBorderColor="#18181B"
              autoFocus
              isDisabled={verifyMutation.isLoading}
              onComplete={(value) => {
                // 处理验证码输入完成后的逻辑
                console.log('Verification code:', value);
                verifyMutation.mutate({ code: value, id: signupData.providerId });
              }}
            >
              {Array.from({ length: 6 }, (_, index) => (
                <PinInputField
                  key={index}
                  placeholder=""
                  mr="8px"
                  boxSize={'56px'}
                  fontSize={'20px'}
                  borderRadius={'12px'}
                />
              ))}
            </PinInput>
          </FormControl>

          {verifyMutation.isLoading ? (
            <Text>{t('v2:verifying')}</Text>
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
                ) : (
                  <Text
                    fontWeight="400"
                    fontSize="14px"
                    lineHeight="20px"
                    color="#18181B"
                    flex="none"
                    alignSelf="stretch"
                    flexGrow={0}
                  >
                    {t('v2:can_request_new_link', { countdown: remainTime })}
                  </Text>
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
            <HiddenCaptchaComponent ref={captchaRef} showError={showError} />
          )}
        </Flex>
      </Stack>
    </Flex>
  );
}

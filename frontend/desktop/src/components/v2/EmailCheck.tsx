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
  PinInputField
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { useForm, useFormContext, Controller } from 'react-hook-form';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import { zodResolver } from '@hookform/resolvers/zod';

import { useSignupStore } from '@/stores/signup';
import { ccEmailSignUp, initRegionToken } from '@/api/auth';
import useSessionStore from '@/stores/session';
import { useMutation } from '@tanstack/react-query';

export default function EmailCheckComponent() {
  const router = useRouter();
  const { t } = useTranslation();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { signupData, clearSignupData } = useSignupStore();
  const { setToken } = useSessionStore();
  useEffect(() => {
    if (!signupData) {
      router.push('/signin');
    }
  }, [signupData, router]);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);
  // const {
  //   register,
  //   formState: { errors },
  //   handleSubmit,
  //   watch
  // } = useForm();
  // const verificationCode = watch('verificationCode');
  const mutation = useMutation(ccEmailSignUp);
  const onSubmit = useCallback(
    async (data: { verificationCode: string }, force = false) => {
      if ((!canResend || isLoading) && !force) return;
      setIsLoading(true);

      try {
        if (!signupData) {
          throw new Error('No signup data found');
        }

        const result = await mutation.mutateAsync({
          providerId: signupData.providerId,
          code: data.verificationCode,
          providerType: signupData.providerType
        });
        if (result.code !== 200) {
          throw Error(result.message);
        }
        // Start countdown
        setCanResend(false);
        setCountdown(60);
      } catch (error) {
        console.error('Failed to send verification email:', error);
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
    },
    [canResend, isLoading]
  );

  const handleBack = () => {
    router.back();
  };
  const bg = useColorModeValue('white', 'gray.700');

  if (!signupData) {
    return null;
  }
  return (
    <Flex minH="100vh" align="center" justify="center" bg={bg} w={'50%'} direction={'column'}>
      <Stack spacing={8} mx="auto" maxW="lg" px={4} h={'60%'}>
        <Flex rounded="lg" p={8} w={'480px'} gap={'16px'} flexDirection={'column'}>
          <Box>
            <MailCheck size={'32px'} color="#ADBDCE"></MailCheck>
          </Box>
          <Box
            display="flex"
            flexDirection="column"
            alignItems="flex-start"
            p={0}
            gap="8px"
            flex="none"
            alignSelf="stretch"
            flexGrow={0}
            mb={'4px'}
          >
            <Text
              fontWeight="600"
              fontSize="24px"
              lineHeight="31px"
              color="#000000"
              flex="none"
              order={0}
              alignSelf="stretch"
              flexGrow={0}
            >
              {t('v2:check_your_email')}
            </Text>
            <Box
              display="flex"
              flexDirection="column"
              alignItems="flex-start"
              p={0}
              gap="16px"
              flex="none"
              order={2}
              alignSelf="stretch"
              flexGrow={0}
            >
              <Text
                fontWeight="400"
                fontSize="14px"
                lineHeight="20px"
                color="#18181B"
                flex="none"
                order={0}
                alignSelf="stretch"
                flexGrow={0}
              >
                {t('v2:verification_message', { email: signupData.providerId })}
              </Text>
            </Box>
          </Box>
          <FormControl id="verificationCode">
            <FormLabel></FormLabel>
            <PinInput
              placeholder=""
              focusBorderColor="#18181B"
              autoFocus
              onComplete={(value) => {
                // 处理验证码输入完成后的逻辑
                console.log('Verification code:', value);
              }}
            >
              {Array.from({ length: 6 }, (_, index) => (
                <PinInputField key={index} placeholder="" mr="8px" boxSize={'56px'} />
              ))}
            </PinInput>
          </FormControl>

          {mutation.isLoading ? (
            <Text>{t('v2:verifying')}</Text>
          ) : canResend ? (
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
              onClick={() => onSubmit({ verificationCode: '' })}
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
              {t('v2:can_request_new_link', { countdown })}
            </Text>
          )}
          <Flex justifyContent={'space-between'} mt={4}>
            <Button
              bg={'white'}
              color={'#18181B'}
              borderWidth={1}
              borderColor={'grayModern.200'}
              _hover={{ bg: 'grayModern.50' }}
              leftIcon={<ArrowLeft size={'16px'} />}
              onClick={handleBack}
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

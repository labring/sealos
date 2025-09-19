import { getRegionToken } from '@/api/auth';
import request from '@/services/request';
import useSessionStore from '@/stores/session';
import { useSigninFormStore } from '@/stores/signinForm';
import { ApiResp } from '@/types';
import { gtmLoginSuccess } from '@/utils/gtm';
import { getAdClickData, getInviterId, getUserSemData, sessionConfig } from '@/utils/sessionConfig';
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
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function PhoneCheckForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setToken } = useSessionStore();

  const [pinValue, setPinValue] = useState('');
  const { formValues, startTime } = useSigninFormStore();

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
        const regionTokenRes = await getRegionToken();
        if (regionTokenRes?.data) {
          gtmLoginSuccess({
            user_type: 'existing',
            method: 'phone'
          });
          await sessionConfig(regionTokenRes.data);
          await router.replace('/');
        }
      }
    }
  });

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
            {t('v2:check_your_phone')}
          </Text>

          {remainingTime > 0 && (
            <Text fontWeight="400" fontSize="14px" lineHeight="20px" color="#18181B" mb="4px">
              {t('v2:phone_verification_message', { phone: formValues?.providerId || '' })}
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
                verifyMutation.mutate({ code: value, id: formValues?.providerId || '' });
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

                {remainingTime > 0 ? (
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
                ) : (
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

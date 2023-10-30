import { sendCodeByPhone, signInByPhone } from '@/api/user';
import { CodeDoneIcon, SafetyIcon } from '@/components/Icon';
import useSessionStore from '@/stores/session';
import { Input, InputGroup, InputLeftAddon, InputRightAddon, Link, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { MouseEventHandler, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

export default function useSms({
  showError
}: {
  showError: (errorMessage: string, duration?: number) => void;
}) {
  const { t } = useTranslation();
  const _remainTime = useRef(0);
  const router = useRouter();
  const { setSession } = useSessionStore();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, trigger, getValues } = useForm<{
    phoneNumber: string;
    verifyCode: string;
  }>();

  const login = async () => {
    const deepSearch = (obj: any): string => {
      if (!obj || typeof obj !== 'object') return t('Submit Error');
      if (!!obj.message) {
        return obj.message;
      }
      return deepSearch(Object.values(obj)[0]);
    };

    handleSubmit(
      async (data) => {
        try {
          setIsLoading(true);
          const result = await signInByPhone(data.phoneNumber, data.verifyCode);
          setSession(result);
          router.replace('/pricing');
        } catch (error) {
          console.log(error);
          showError(t('Invalid verification code') || 'Invalid verification code');
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        showError(deepSearch(err));
      }
    )();
  };

  const SmsModal = () => {
    const [remainTime, setRemainTime] = useState(_remainTime.current);

    useEffect(() => {
      if (remainTime <= 0) return;
      const interval = setInterval(() => {
        setRemainTime(remainTime - 1);
      }, 1000);
      return () => clearInterval(interval);
    }, [remainTime]);

    const getCode: MouseEventHandler = async (e) => {
      e.preventDefault();

      if (!(await trigger('phoneNumber'))) {
        showError(t('Invalid phone number') || 'Invalid phone number');
        return;
      }
      setRemainTime(60);
      _remainTime.current = 60;

      try {
        await sendCodeByPhone(getValues('phoneNumber'));
      } catch (err) {
        showError(t('Get code failed') || 'Get code failed');
        setRemainTime(0);
        _remainTime.current = 0;
      }
    };

    return (
      <>
        <InputGroup
          variant={'unstyled'}
          bg="rgba(255, 255, 255, 0.65)"
          mt={'20px'}
          width="266px"
          minH="42px"
          mb="14px"
          borderRadius="4px"
          p="10px"
          border="1px solid #E5E5E5"
        >
          <InputLeftAddon>
            <Text pr={'7px'} borderRight="1px solid rgba(0, 0, 0, 0.4)">
              +86
            </Text>
          </InputLeftAddon>

          <Input
            type="tel"
            placeholder={t('phone number tips') || ''}
            mx={'12px'}
            variant={'unstyled'}
            bg={'transparent'}
            id="phoneNumber"
            fontSize="14px"
            fontWeight="400"
            _autofill={{
              bg: 'transparent'
            }}
            {...register('phoneNumber', {
              pattern: {
                value: /^1[3-9]\d{9}$/,
                message: 'Invalid mobile number'
              },
              required: 'Phone number can not be blank'
            })}
          />
          <InputRightAddon
            fontStyle="normal"
            fontWeight="500"
            fontSize="10px"
            lineHeight="20px"
            color="#219BF4"
          >
            {remainTime <= 0 ? (
              <Link as={NextLink} href="" onClick={getCode}>
                {t('Get Code')}
              </Link>
            ) : (
              <Text>{remainTime} s</Text>
            )}
          </InputRightAddon>
        </InputGroup>

        <InputGroup
          variant={'unstyled'}
          bg="rgba(255, 255, 255, 0.65)"
          width="266px"
          minH="42px"
          mb="14px"
          borderRadius="4px"
          p="10px"
          border="1px solid #E5E5E5"
        >
          <InputLeftAddon>
            <SafetyIcon />
          </InputLeftAddon>
          <Input
            type="text"
            placeholder={t('verify code tips') || ''}
            pl={'12px'}
            variant={'unstyled'}
            id="verifyCode"
            fontSize="14px"
            fontWeight="400"
            _autofill={{
              backgroundColor: 'transparent !important',
              backgroundImage: 'none !important'
            }}
            {...register('verifyCode', {
              required: 'verify code can not be blank',
              pattern: {
                value: /^[0-9]{6}$/,
                message: 'Invalid verification code'
              }
            })}
          />
          <InputRightAddon>
            {getValues('verifyCode')?.length === 6 && <CodeDoneIcon />}
          </InputRightAddon>
        </InputGroup>
      </>
    );
  };

  return {
    SmsModal,
    login,
    isLoading
  };
}

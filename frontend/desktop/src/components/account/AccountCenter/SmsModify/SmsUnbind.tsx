import {
  Button,
  FormControl,
  FormLabel,
  HStack,
  Spinner,
  VStack,
  Text,
  Link
} from '@chakra-ui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCustomToast } from '@/hooks/useCustomToast';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { getSmsUnbindCodeRequest, verifySmsUnbindRequest } from '@/api/auth';
import { SettingInput } from '../SettingInput';
import { MouseEventHandler } from 'react';

import { SettingInputGroup } from '../SettingInputGroup';
import { SettingInputRightElement } from '../SettingInputRightElement';
import { useTimer } from '@/hooks/useTimer';
import { ApiResp } from '@/types';
import { SmsType } from '@/services/backend/db/verifyCode';
import { smsIdValid } from './utils';

const smsUnBindGen = (smsType: SmsType) =>
  function UnBindCore({ onClose }: { onClose: () => void }) {
    const { t } = useTranslation();
    const { toast } = useCustomToast({ status: 'error' });

    const { register, handleSubmit, trigger, getValues, reset, formState } = useForm<{
      id: string;
      verifyCode: string;
    }>();
    const { seconds, startTimer, isRunning } = useTimer({
      duration: 60,
      step: 1
    });

    const getCodeMutation = useMutation({
      mutationFn({ id, smsType }: { id: string; smsType: SmsType }) {
        return getSmsUnbindCodeRequest(smsType)({ id });
      },
      onSuccess(data) {
        startTimer();
        toast({
          status: 'success',
          title: t('Already Sent Code')
        });
      },
      onError(err) {
        getCodeMutation.reset();
        toast({
          status: 'error',
          title: t('Get code failed')
        });
      }
    });
    const remainTime = 60 - seconds;
    const getCode: MouseEventHandler = async (e) => {
      e.preventDefault();
      if (isRunning) {
        toast({
          status: 'error',
          title: t('Already Sent Code')
        });
        return;
      }
      if (!(await trigger('id'))) {
        toast({
          status: 'error',
          title: t('Get code failed')
        });
        return;
      }
      const id = getValues('id');
      getCodeMutation.mutate({
        id,
        smsType
      });
    };
    const queryClient = useQueryClient();
    const mutation = useMutation({
      mutationFn({ smsType, ...data }: { id: string; smsType: SmsType; code: string }) {
        return verifySmsUnbindRequest(smsType)(data);
      },
      async onSuccess(data) {
        if (data.code === 200) {
          toast({
            status: 'success',
            title: t('Unbind Success')
          });
          reset();
          await queryClient.invalidateQueries();
          onClose?.();
        }
      },
      onError(error) {
        toast({ title: (error as ApiResp).message });
      }
    });

    return mutation.isLoading ? (
      <Spinner mx={'auto'} my={'auto'} />
    ) : (
      <>
        <form
          onSubmit={handleSubmit(
            (data) => {
              mutation.mutate({
                id: data.id,
                code: data.verifyCode,
                smsType
              });
            },
            (errors) => {
              if (errors.id) {
                if (smsType === 'email') return toast({ title: t('Invalid Email') });
                else return toast({ title: t('Invalid phone number') });
              }
              if (errors.verifyCode) return toast({ title: t('verify code tips') });
            }
          )}
        >
          <VStack
            w={'420px'}
            alignItems={'stretch'}
            fontSize={'14px'}
            fontWeight={500}
            gap={'30px'}
            color={'grayModern.900'}
          >
            <FormControl isInvalid={!!formState.errors.id}>
              <HStack>
                <FormLabel w={'120px'}>{smsType === 'phone' ? t('Phone') : t('Email')}</FormLabel>
                <SettingInputGroup>
                  <SettingInput
                    {...register('id', smsIdValid(smsType))}
                    flex={'1'}
                    type={smsType === 'phone' ? 'tel' : 'email'}
                    autoComplete={smsType}
                  ></SettingInput>
                  <SettingInputRightElement>
                    {
                      <Link
                        onClick={getCode}
                        color={'brightBlue.600'}
                        marginY={'auto'}
                        fontSize={'11px'}
                        w={'60px'}
                      >
                        {t('Get Code')}
                      </Link>
                    }
                  </SettingInputRightElement>
                </SettingInputGroup>
              </HStack>
            </FormControl>
            <FormControl isInvalid={!!formState.errors.verifyCode}>
              <HStack>
                <FormLabel w={'120px'}>{t('verifyCode')}</FormLabel>
                <SettingInputGroup>
                  <SettingInput
                    {...register('verifyCode', {
                      required: true,
                      validate: (v) => v.length === 6
                    })}
                    autoComplete="one-time-code"
                    flex={'1'}
                    type="text"
                  ></SettingInput>
                  <SettingInputRightElement>
                    {isRunning && <Text>{remainTime} s</Text>}
                  </SettingInputRightElement>
                </SettingInputGroup>
              </HStack>
            </FormControl>
            <Button variant={'primary'} ml="auto" type="submit" maxW={'72px'}>
              {t('Confirm')}
            </Button>
          </VStack>
        </form>
      </>
    );
  };
export const PhoneUnBind = smsUnBindGen('phone');
export const EmailUnBind = smsUnBindGen('email');

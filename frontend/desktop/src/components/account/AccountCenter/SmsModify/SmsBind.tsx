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
import { getSmsBindCodeRequest, verifySmsBindRequest } from '@/api/auth';
import { SettingInput } from '../SettingInput';
import { MouseEventHandler } from 'react';

import { SettingInputGroup } from '../SettingInputGroup';
import { SettingInputRightElement } from '../SettingInputRightElement';
import { useTimer } from '@/hooks/useTimer';
import { ApiResp } from '@/types';
import useCallbackStore, { MergeUserStatus } from '@/stores/callback';
import { ProviderType } from 'prisma/global/generated/client';
import { SmsType } from '@/services/backend/db/verifyCode';
import { smsIdValid } from './utils';
import { MERGE_USER_READY } from '@/types/response/utils';

const smsBindGen = (smsType: SmsType) =>
  function SmsBindCore({ onClose }: { onClose: () => void }) {
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
    const { setMergeUserData, setMergeUserStatus } = useCallbackStore();
    const getCodeMutation = useMutation({
      mutationFn({ id, smsType }: { id: string; smsType: SmsType }) {
        return getSmsBindCodeRequest(smsType)({ id });
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
      console.log(isRunning, seconds);
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
          title: smsType === 'phone' ? t('Invalid phone number') : t('Invalid Email')
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
      async mutationFn({ smsType, ...data }: { id: string; code: string; smsType: SmsType }) {
        return verifySmsBindRequest(smsType)(data);
      },
      async onSuccess(data) {
        const status = data.message || '';
        if (data.code === 200) {
          toast({
            status: 'success',
            title: t('Bind Success')
          });
          reset();
          await queryClient.invalidateQueries();
          onClose?.();
        } else if (Object.values(MERGE_USER_READY).includes(status as MERGE_USER_READY)) {
          if (status === MERGE_USER_READY.MERGE_USER_CONTINUE) {
            const code = data.data?.code;
            if (!code) return;
            setMergeUserStatus(MergeUserStatus.CANMERGE);
            setMergeUserData({
              code,
              providerType: ProviderType.PHONE
            });
          } else {
            setMergeUserStatus(MergeUserStatus.CONFLICT);
          }
          onClose?.();
        }
      },
      onError(error) {
        toast({ title: (error as ApiResp).message, status: 'error' });
      }
    });

    return mutation.isLoading ? (
      <Spinner mx={'auto'} />
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
                    type={smsType === 'email' ? 'email' : 'phone'}
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
export const PhoneBind = smsBindGen('phone');
export const EmailBind = smsBindGen('email');

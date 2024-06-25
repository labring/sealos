import {
  Button,
  FlexProps,
  FormControl,
  FormLabel,
  HStack,
  Spinner,
  VStack,
  Text,
  Link
} from '@chakra-ui/react';
import { useMutation } from '@tanstack/react-query';
import { useCustomToast } from '@/hooks/useCustomToast';
import { ApiResp } from '@/types';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { SettingInput } from '../SettingInput';
import { MouseEventHandler, useState } from 'react';

import { SettingInputGroup } from '../SettingInputGroup';
import { SettingInputRightElement } from '../SettingInputRightElement';
import { useTimer } from '@/hooks/useTimer';
import {
  getNewSmsCodeRequest,
  getOldSmsCodeRequest,
  verifyNewSmsRequest,
  verifyOldSmsRequest
} from '@/api/auth';
import useCallbackStore, { MergeUserStatus } from '@/stores/callback';
import { ProviderType } from 'prisma/global/generated/client';
import { SmsType } from '@/services/backend/db/verifyCode';
import { smsIdValid } from './utils';
import { MERGE_USER_READY } from '@/types/response/utils';
enum PageState {
  VERIFY_OLD,
  VERIFY_NEW
}
function OldSms({ smsType, onSuccess }: { smsType: SmsType; onSuccess?: (uid: string) => void }) {
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
    mutationFn({ smsType, id }: { id: string; smsType: SmsType }) {
      return getOldSmsCodeRequest(smsType)({ id });
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
    getCodeMutation.mutate({ id, smsType });
  };
  const mutation = useMutation({
    mutationFn({ smsType, ...data }: { smsType: SmsType; id: string; code: string }) {
      return verifyOldSmsRequest(smsType)(data);
    },
    onSuccess(data) {
      const status = data.message || '';
      if (data.code === 200) {
        reset();
        onSuccess?.(data?.data?.uid || '');
      }
    },
    onError(error) {
      toast({ title: (error as ApiResp).message });
    }
  });

  return mutation.isLoading ? (
    <Spinner mx={'auto'} />
  ) : (
    <form
      onSubmit={handleSubmit(
        async (data) => {
          mutation.mutate({
            id: data.id,
            code: data.verifyCode,
            smsType
          });
        },
        (errors) => {
          if (errors.id) {
            if (smsType === 'phone') return toast({ title: t('Invalid phone number') });
            else return toast({ title: t('Invalid Email') });
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
            <FormLabel w={'120px'}>
              {smsType === 'phone' ? t('Old Phone') : t('Old Email')}
            </FormLabel>
            <SettingInputGroup>
              <SettingInput
                {...register('id', smsIdValid(smsType))}
                flex={'1'}
                type={smsType === 'email' ? 'email' : 'tel'}
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
          {t('Next')}
        </Button>
      </VStack>
    </form>
  );
}
function NewSms({
  smsType = 'phone',
  uid,
  onSuccess: onClose,
  onError
}: {
  uid: string;
  smsType?: SmsType;
  onSuccess?: () => void;
  onError?: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useCustomToast({ status: 'error' });
  const { setMergeUserData, setMergeUserStatus } = useCallbackStore();
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
      return getNewSmsCodeRequest(smsType)({ id, uid });
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
  const mutation = useMutation(verifyNewSmsRequest(smsType), {
    onSuccess(data) {
      const status = data.message || '';
      if (data.code === 200) {
        toast({
          status: 'success',
          title: smsType === 'phone' ? t('phoneChangeSuccess') : t('emailChangeSuccess')
        });
        reset();
        onClose?.();
      } else if (Object.values(MERGE_USER_READY).includes(status as MERGE_USER_READY)) {
        // onSuccess?.()
        if (status === MERGE_USER_READY.MERGE_USER_CONTINUE) {
          setMergeUserStatus(MergeUserStatus.CANMERGE);
          setMergeUserData({
            code: data.data.code,
            providerType: ProviderType.PHONE
          });
        } else {
          setMergeUserStatus(MergeUserStatus.CONFLICT);
        }
      }
    },
    onError(error) {
      toast({ title: (error as ApiResp).message });
    }
  });

  return mutation.isLoading ? (
    <Spinner mx={'auto'} />
  ) : (
    <form
      onSubmit={handleSubmit(
        async (data) => {
          mutation.mutate({
            id: data.id,
            code: data.verifyCode,
            uid
          });
        },
        (errors) => {
          if (errors.id) {
            if (smsType === 'phone') return toast({ title: t('Invalid phone number') });
            else return toast({ title: t('Invalid Email') });
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
            <FormLabel w={'120px'}>
              {smsType === 'phone' ? t('New Phone') : t('New Email')}
            </FormLabel>
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
  );
}
const smsChangeGen = (smsType: SmsType) =>
  function SmsChangeCore({ onClose }: { onClose: () => void }) {
    const [pageState, setPageState] = useState<PageState>(PageState.VERIFY_OLD);
    const [codeUid, setCodeUid] = useState('');
    return pageState === PageState.VERIFY_OLD ? (
      <OldSms
        smsType={smsType}
        onSuccess={(uid) => {
          setCodeUid(uid);
          setPageState(PageState.VERIFY_NEW);
        }}
      />
    ) : (
      <NewSms
        smsType={smsType}
        uid={codeUid}
        onSuccess={() => {
          setPageState(PageState.VERIFY_OLD);
          onClose();
        }}
      />
    );
  };

export const PhoneChange = smsChangeGen('phone');
export const EmailChange = smsChangeGen('email');

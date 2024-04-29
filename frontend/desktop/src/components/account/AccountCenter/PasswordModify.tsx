import {
  Button,
  FlexProps,
  FormControl,
  FormLabel,
  HStack,
  Spinner,
  VStack
} from '@chakra-ui/react';
import { useMutation } from '@tanstack/react-query';
import { useCustomToast } from '@/hooks/useCustomToast';
import { ApiResp } from '@/types';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { strongPassword } from '@/utils/crypto';
import { passwordModifyRequest } from '@/api/auth';
import { SettingInput } from './SettingInput';
import { SettingInputGroup } from './SettingInputGroup';

export default function PasswordModify(
  props: FlexProps & {
    onClose: () => void;
  }
) {
  const { t } = useTranslation();
  const { toast } = useCustomToast({ status: 'error' });
  const { register, handleSubmit, reset, formState } = useForm<{
    oldPassword: string;
    newPassword: string;
    againPassword: string;
  }>();
  const mutation = useMutation(passwordModifyRequest, {
    onSuccess(data) {
      if (data.code === 200) {
        toast({
          status: 'success',
          title: t('passwordChangeSuccess')
        });
        reset();
        props.onClose?.();
      }
    },
    onError(error) {
      toast({ title: (error as ApiResp).message });
    }
  });

  return mutation.isLoading ? (
    <Spinner mx={'auto'} />
  ) : (
    <>
      <form
        onSubmit={handleSubmit(
          ({ oldPassword, newPassword }) => {
            mutation.mutate({ oldPassword, newPassword });
          },
          (errors) => {
            console.log(formState);
            console.log(errors);
            if (errors.oldPassword) return toast({ title: t('currentPasswordRequired') });
            if (errors.newPassword) return toast({ title: t('password tips') });
            if (errors.againPassword) return toast({ title: t('passwordMismatch') });
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
          <FormControl isInvalid={!!formState.errors.oldPassword}>
            <HStack>
              <FormLabel w={'120px'}>{t('currentPassword')}</FormLabel>
              <SettingInputGroup>
                <SettingInput
                  {...register('oldPassword', {
                    required: true
                  })}
                  type="password"
                  autoComplete="current-password"
                />
              </SettingInputGroup>
            </HStack>
          </FormControl>
          <FormControl isInvalid={!!formState.errors.newPassword}>
            <HStack>
              <FormLabel w={'120px'}>{t('newPassword')}</FormLabel>
              <SettingInputGroup>
                <SettingInput
                  {...register('newPassword', {
                    required: true,
                    validate: strongPassword
                  })}
                  autoComplete="new-password"
                  type="password"
                />
              </SettingInputGroup>
            </HStack>
          </FormControl>
          <FormControl isInvalid={!!formState.errors.againPassword}>
            <HStack>
              <FormLabel w={'120px'}>{t('confirmNewPassword')}</FormLabel>
              <SettingInputGroup>
                <SettingInput
                  {...register('againPassword', {
                    required: true,
                    validate(value, formValues) {
                      return value === formValues.newPassword;
                    }
                  })}
                  type="password"
                  autoComplete="new-password"
                />
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
}

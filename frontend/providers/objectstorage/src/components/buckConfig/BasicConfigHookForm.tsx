import { FormSchema, Authority } from '@/consts';
import {
  Stack,
  FormControl,
  FormLabel,
  Input,
  Flex,
  Select,
  FormHelperText,
  Text
} from '@chakra-ui/react';
import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import InfoCircleIcon from '../Icons/InfoCircleIcon';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { MySelect } from '@sealos/ui';
const BasicConfigHookForm = () => {
  const { register, getFieldState, control, getValues, setValue } = useFormContext<FormSchema>();
  const { t } = useTranslation(['common', 'bucket']);

  const validateBucketName = (value: string) => {
    if (!value) {
      return t('bucket:bucketNameInvalid');
    }

    if (value.length < 3 || value.length > 63) {
      return t('bucket:bucketNameInvalid');
    }

    const k8sNameRegex = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
    if (!k8sNameRegex.test(value)) {
      return t('bucket:bucketNameInvalid');
    }

    return true;
  };

  const authorityTips = useMemo(
    () => ({
      [Authority.private]: t('bucket:privateBucket'),
      [Authority.readonly]: t('bucket:sharedBucketRead'),
      [Authority.readwrite]: t('bucket:sharedBucketReadWrite')
    }),
    [t]
  );

  const authorityList = [
    {
      label: Authority.private,
      value: Authority.private
    },
    {
      value: Authority.readonly,
      label: Authority.readonly
    },
    {
      value: Authority.readwrite,
      label: Authority.readwrite
    }
  ];
  const selectedAuthority = useWatch<FormSchema, 'bucketAuthority'>({
    name: 'bucketAuthority',
    defaultValue: Authority.private,
    control
  });
  const router = useRouter();
  return (
    <Stack gap={'33px'}>
      <FormControl
        isInvalid={!!getFieldState('bucketName').error}
        display={'flex'}
        alignItems={'start'}
      >
        <FormLabel w="100px" mr="30px">
          {t('bucket:bucketName')}
        </FormLabel>
        <Flex direction="column" gap="8px" w="300px">
          <Input
            variant={'outline'}
            h="32px"
            w="100%"
            autoFocus={true}
            isDisabled={!!router.query.bucketName}
            {...register('bucketName', {
              validate: validateBucketName
            })}
          />
        </Flex>
      </FormControl>
      <FormControl isInvalid={!!getFieldState('bucketAuthority').error}>
        <Flex align={'center'} mb="9px">
          <FormLabel w="100px" mr="30px">
            {t('bucket:bucketPermission')}
          </FormLabel>
          <MySelect
            list={authorityList}
            width="300px"
            value={getValues('bucketAuthority')}
            onchange={(v) => {
              setValue('bucketAuthority', v as any);
            }}
          ></MySelect>
        </Flex>
        <FormHelperText
          ml={'130px'}
          w="auto"
          display={'inline-flex'}
          py="6px"
          px="12px"
          borderRadius={'6px'}
          bgColor={'brightBlue.50'}
          fontSize={'11px'}
          alignItems={'center'}
          gap="4px"
        >
          <InfoCircleIcon color="brightBlue.600" boxSize={'14px'} />
          <Text color="brightBlue.600">{authorityTips[selectedAuthority]}</Text>
        </FormHelperText>
      </FormControl>
    </Stack>
  );
};
export default BasicConfigHookForm;

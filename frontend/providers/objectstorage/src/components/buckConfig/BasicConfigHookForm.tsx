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
import ExpanMoreIcon from '../Icons/ExpandMoreIcon';
import InfoCircleIcon from '../Icons/InfoCircleIcon';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';

const BasicConfigHookForm = () => {
  const { register, getFieldState, control } = useFormContext<FormSchema>();
  const { t } = useTranslation(['common', 'bucket']);
  const authorityTips = useMemo(
    () => ({
      [Authority.private]: t('bucket:privateBucket'),
      [Authority.readonly]: t('bucket:sharedBucketRead'),
      [Authority.readwrite]: t('bucket:sharedBucketReadWrite')
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
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
        alignItems={'center'}
      >
        <FormLabel w="100px" mr="30px">
          {t('bucket:bucketName')}
        </FormLabel>
        <Input
          variant={'secondary'}
          h="32px"
          w="auto"
          autoFocus={true}
          isDisabled={!!router.query.bucketName}
          {...register('bucketName', {
            required: 'This is required',
            minLength: { value: 1, message: 'Minimum length should be 1' }
          })}
        />
      </FormControl>
      <FormControl isInvalid={!!getFieldState('bucketAuthority').error}>
        <Flex align={'center'} mb="9px">
          <FormLabel w="100px" mr="30px">
            {t('bucket:bucketPermission')}
          </FormLabel>
          <Select
            {...register('bucketAuthority', {})}
            variant={'secondary'}
            w="auto"
            h="32px"
            mr="30px"
            icon={<ExpanMoreIcon />}
            iconSize="16px"
          >
            <option value={Authority.private}>{Authority.private}</option>
            <option value={Authority.readonly}>{Authority.readonly}</option>
            <option value={Authority.readwrite}>{Authority.readwrite}</option>
          </Select>
        </Flex>
        <FormHelperText
          w="auto"
          display={'inline-flex'}
          py="7px"
          px="11px"
          bgColor={'blue.100'}
          fontSize={'12px'}
          alignItems={'center'}
          gap="4px"
        >
          <InfoCircleIcon color="brightBlue.600" fontSize={'16px'} />
          <Text color="brightBlue.700">{authorityTips[selectedAuthority]}</Text>
        </FormHelperText>
      </FormControl>
    </Stack>
  );
};
export default BasicConfigHookForm;

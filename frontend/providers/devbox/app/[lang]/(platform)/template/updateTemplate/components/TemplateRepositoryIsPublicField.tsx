import MyFormLabel from '@/components/MyFormControl';
import { useEnvStore } from '@/stores/env';
import { Alert, Flex, FormControl, Link, Switch, Text, VStack } from '@chakra-ui/react';
import { InfoCircleIcon } from '@sealos/ui';
import { useTranslations } from 'next-intl';
import { Controller, useFormContext } from 'react-hook-form';
import { TagCheckbox } from '../../TagCheckbox';

export default function TemplateRepositoryIsPublicField({
  isDisabled = false
}: {
  isDisabled?: boolean;
}) {
  const { control } = useFormContext();
  const t = useTranslations();
  const { env } = useEnvStore();
  return (
    <Flex>
      <MyFormLabel isRequired width="108px" m="0" fontSize="14px">
        {t('public')}
      </MyFormLabel>
      <VStack align="start" spacing={'12px'} flex={1}>
        <Controller
          name="isPublic"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Switch
              isChecked={value}
              onChange={onChange}
              size="md"
              colorScheme="blackAlpha"
              isDisabled={isDisabled}
            />
          )}
        />
        {
          <Alert
            status="info"
            borderRadius="md"
            py={'6px'}
            px={'12px'}
            color={'brightBlue.600'}
            bgColor={'brightBlue.50'}
          >
            <InfoCircleIcon fill={'currentcolor'} mr={'4px'} boxSize={'14px'} />
            <Text fontSize="12px" fontWeight={500}>
              {t('set_template_to_public_tips')}
            </Text>
          </Alert>
        }
        {!isDisabled && (
          <FormControl>
            <Controller
              name="agreeTerms"
              control={control}
              render={({ field: { value, onChange, onBlur } }) => (
                <TagCheckbox
                  // value={value}
                  name="agreeTerms"
                  isChecked={value}
                  onChange={onChange}
                  onBlur={onBlur}
                  size="sm"
                >
                  <Text fontSize="12px" color="grayModern.600" fontWeight={500}>
                    {t('have_read_and_agree_to_the ')}
                    <Link
                      color={'brightBlue.600'}
                      textDecoration={'underline'}
                      href={env.privacyUrl}
                      target={'_blank'}
                    >
                      {t('privacy_and_security_agreement')}
                    </Link>
                  </Text>
                </TagCheckbox>
              )}
            />
          </FormControl>
        )}
      </VStack>
    </Flex>
  );
}

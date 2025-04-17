import MyFormLabel from '@/components/MyFormControl';
import { Flex, Input } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

export default function TemplateRepositoryNameField({
  isDisabled = false
}: {
  isDisabled?: boolean;
}) {
  const ctx = useFormContext<{ name: string }>();
  const t = useTranslations();
  return (
    <Flex justify={'space-between'} align={'center'}>
      <MyFormLabel isRequired width="108px" m="0" fontSize="14px">
        {t('name')}
      </MyFormLabel>
      <Input
        {...ctx.register('name')}
        placeholder={t('input_template_name_placeholder')}
        bg="grayModern.50"
        borderColor="grayModern.200"
        size="sm"
        isDisabled={isDisabled}
        width={'350px'}
      />
    </Flex>
  );
}

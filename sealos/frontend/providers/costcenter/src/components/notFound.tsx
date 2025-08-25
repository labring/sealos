import { useTranslation } from 'next-i18next';
import { Text } from '@chakra-ui/react';

export default function Index() {
  const { t } = useTranslation();

  return (
    <Text color={'#9CA2A8'} fontSize={'12px'}>
      {t('No data available')}
    </Text>
  );
}

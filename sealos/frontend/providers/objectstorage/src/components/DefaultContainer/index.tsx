import { Text, Stack, StackProps, Button, Box, Center } from '@chakra-ui/react';
import StorageIcon from '@/components/Icons/StorageIcon';
import CreateBucketModal from '@/components/common/modal/CreateBucketModal';
import { useTranslation } from 'next-i18next';
export default function DefaultContainer({ ...styles }: StackProps) {
  const { t } = useTranslation('bucket');
  return (
    <Stack gap={'0'} align={'center'} {...styles}>
      <Center
        borderWidth={'0.8px'}
        borderStyle={'dashed'}
        borderColor={'grayModern.400'}
        borderRadius={'50%'}
        mb={'24px'}
        p="12px"
      >
        <StorageIcon boxSize="64px" color={'grayModern.500'} />
      </Center>
      <Text mb="32px" color={'grayModern.600'} fontSize={'14px'}>
        {t('noBucket')}
      </Text>
      <CreateBucketModal buttonType={'max'} />
    </Stack>
  );
}

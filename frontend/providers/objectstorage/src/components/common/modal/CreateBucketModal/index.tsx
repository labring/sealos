import { Text, IconButton, IconButtonProps, Button } from '@chakra-ui/react';
import AddIcon from '@/components/Icons/AddIcon';
import { Router, useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
export default function CreateBucketModal({
  buttonType = 'min',
  ...styles
}: { buttonType: 'min' | 'max' } & Omit<IconButtonProps, 'aria-label'>) {
  const router = useRouter();
  const { t } = useTranslation('common');
  return (
    <>
      {buttonType === 'min' ? (
        <IconButton
          icon={<AddIcon w="20px" h="20px" />}
          onClick={() => router.push('/bucketConfig')}
          variant={'white-bg-icon'}
          p="4px"
          {...styles}
          aria-label={'create Bucket'}
        ></IconButton>
      ) : (
        <Button
          variant={'primary'}
          gap={'8px'}
          py="7.5px"
          px="36px"
          onClick={() => router.push('/bucketConfig')}
          {...styles}
        >
          <AddIcon w="20px" h="20px" />
          <Text>{t('createBucket')}</Text>
        </Button>
      )}
    </>
  );
}

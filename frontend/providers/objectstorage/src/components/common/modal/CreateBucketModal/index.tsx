import { Text, IconButton, IconButtonProps, Button } from '@chakra-ui/react';
import AddIcon from '@/components/Icons/AddIcon';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { useUserStore } from '@/store/user';
import { InsufficientQuotaDialog } from '@/components/InsufficientQuotaDialog';
import { useState, useEffect } from 'react';
import useSessionStore from '@/store/session';
export default function CreateBucketModal({
  buttonType = 'min',
  ...styles
}: { buttonType: 'min' | 'max' } & Omit<IconButtonProps, 'aria-label'>) {
  const router = useRouter();
  const { t } = useTranslation('common');
  const { checkExceededQuotas, loadUserQuota } = useUserStore();
  const { session } = useSessionStore();
  const [isInsufficientQuotaDialogOpen, setIsInsufficientQuotaDialogOpen] = useState(false);

  // Load user quota when session is available and has required properties
  useEffect(() => {
    if (session?.user && session?.kubeconfig) {
      loadUserQuota();
    }
  }, [session, loadUserQuota]);

  const handleCreateBucket = () => {
    if (!session) {
      // If session is not available, just navigate to bucketConfig
      router.push('/bucketConfig');
      return;
    }

    // Check quota before creating bucket
    const exceededQuotas = checkExceededQuotas({
      traffic: session?.subscription?.type === 'PAYG' ? 0 : 1
    });

    if (exceededQuotas.length <= 0) {
      // No quota exceeded, proceed with navigation
      router.push('/bucketConfig');
    } else {
      // Quota exceeded, show dialog
      setIsInsufficientQuotaDialogOpen(true);
    }
  };

  const confirmCreateBucket = () => {
    setIsInsufficientQuotaDialogOpen(false);
    router.push('/bucketConfig');
  };
  return (
    <>
      {buttonType === 'min' ? (
        <IconButton
          icon={<AddIcon w="20px" h="20px" />}
          onClick={handleCreateBucket}
          variant={'white-bg-icon'}
          p="4px"
          {...styles}
          aria-label={'create Bucket'}
        ></IconButton>
      ) : (
        <Button
          variant={'solid'}
          gap={'8px'}
          py="7.5px"
          px="36px"
          onClick={handleCreateBucket}
          {...styles}
        >
          <AddIcon w="20px" h="20px" />
          <Text>{t('createBucket')}</Text>
        </Button>
      )}
      <InsufficientQuotaDialog
        items={checkExceededQuotas({
          traffic: session?.subscription?.type === 'PAYG' ? 0 : 1
        })}
        onOpenChange={setIsInsufficientQuotaDialogOpen}
        open={isInsufficientQuotaDialogOpen}
        onConfirm={confirmCreateBucket}
        showControls={true}
      />
    </>
  );
}

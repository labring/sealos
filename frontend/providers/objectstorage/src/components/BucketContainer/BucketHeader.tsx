import { Authority, QueryKey, TBucket, bucketConfigQueryParam } from '@/consts';
import { Text, HStack, StackProps, ButtonGroup, Button } from '@chakra-ui/react';
import AuthorityTips from '@/components/common/AuthorityTip';
import DeleteIcon from '@/components/Icons/DeleteIcon';
import { useOssStore } from '@/store/ossStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteBucket } from '@/api/bucket';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import EditIcon from '../Icons/EditIcon';
import DeleteBucketModal from '../common/modal/DeleteBucketModal';

export default function BucketHeader({ ...styles }: StackProps) {
  const bucket = useOssStore((s) => s.currentBucket);
  const router = useRouter();
  const { t } = useTranslation('common');
  if (!bucket) return <></>;
  return (
    <HStack justify={'space-between'} wrap={'wrap'} w="full" {...styles}>
      <HStack spacing={'20px'}>
        <Text fontSize={'24px'} fontWeight={'500'}>
          {bucket.name}
        </Text>
        <AuthorityTips authority={Authority.private} />
      </HStack>
      <ButtonGroup variant={'secondary'} spacing={'16px'}>
        <Button
          gap="8px"
          px="24px"
          py="10px"
          onClick={() => {
            if (!bucket) return;
            const _params: bucketConfigQueryParam = {
              bucketName: bucket.crName,
              bucketPolicy: bucket.policy
            };
            const params = new URLSearchParams(_params);
            router.push('/bucketConfig?' + params.toString());
          }}
        >
          <EditIcon boxSize={'16px'} color="grayModern.400" />
          <Text>{t('edit')}</Text>
        </Button>
        <DeleteBucketModal bucketName={bucket.name} />
      </ButtonGroup>
    </HStack>
  );
}

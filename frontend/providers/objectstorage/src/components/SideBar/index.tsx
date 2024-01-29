import {
  Text,
  Flex,
  Stack,
  FlexProps,
  Tooltip,
  ColorProps,
  StackProps,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Center
} from '@chakra-ui/react';
import RefreshIcon from '@/components/Icons/RefreshIcon';
import BucketIcon from '@/components/Icons/BucketIcon';
import MoreIcon from '@/components/Icons/MoreIcon';
import { ReactNode, useEffect, useMemo } from 'react';
import ParamterModal from '@/components/common/modal/ParamterModal';
import CreateBucketModal from '@/components/common/modal/CreateBucketModal';
import EditIcon from '../Icons/EditIcon';
import { QueryKey, TBucket, bucketConfigQueryParam } from '@/consts';
import AuthorityTips from '../common/AuthorityTip';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getQuota, listBucket } from '@/api/bucket';
import { useRouter } from 'next/router';
import { useOssStore } from '@/store/ossStore';
import { useToast } from '@/hooks/useToast';
import { formatBytes } from '@/utils/tools';
import { useTranslation } from 'next-i18next';
import DeleteBucketModal from '../common/modal/DeleteBucketModal';
import useSessionStore from '@/store/session';
function MoreMenu({ bucket }: { bucket: TBucket }) {
  const router = useRouter();
  const { t } = useTranslation(['common', 'bucket']);
  return (
    <Menu>
      <MenuButton
        as={IconButton}
        variant={'white-bg-icon'}
        icon={<MoreIcon w="16px" h="16px" color="grayIron.600" />}
        p="4px"
        onClick={(e) => e.stopPropagation()}
      ></MenuButton>
      <MenuList p="6px" minW={'85px'} fontSize={'12px'} onClick={(e) => e.stopPropagation()}>
        <MenuItem
          px="4px"
          py="6px"
          onClick={() => {
            const _params: bucketConfigQueryParam = {
              bucketName: bucket.crName,
              bucketPolicy: bucket.policy
            };
            const params = new URLSearchParams(_params);
            router.push('/bucketConfig?' + params.toString());
          }}
        >
          <EditIcon w="16px" h="16px" color={'grayModern.600'} mr="8px" />
          <Text color={'grayModern.700'}>{t('edit')}</Text>
        </MenuItem>
        <MenuItem p="0">
          <DeleteBucketModal layout="sm" bucketName={bucket.name} />
        </MenuItem>
      </MenuList>
    </Menu>
  );
}
function BucketListItem({
  isSelected,
  bucket,
  ...props
}: FlexProps & { isSelected: boolean; bucket: TBucket }) {
  return (
    <Flex
      alignItems={'center'}
      bgColor={isSelected ? '#9699B41A' : ''}
      fontWeight={'500'}
      pl="12px"
      pr="4px"
      py="6px"
      cursor={'pointer'}
      {...props}
      justifyContent={'space-between'}
    >
      <Flex gap={'6px'} align={'center'}>
        <BucketIcon w="16px" h="16px" color={isSelected ? 'brightBlue.600' : 'grayModern.700'} />
        <Text fontSize={'12px'} color={isSelected ? 'brightBlue.700' : 'grayModern.700'}>
          {bucket.name}
        </Text>
      </Flex>
      <Flex align={'center'} gap="2px">
        <AuthorityTips authority={bucket.policy} />
        <MoreMenu bucket={bucket} />
      </Flex>
    </Flex>
  );
}
function QuotaProgress({
  children,
  text,
  used,
  limit,
  progressColor,
  ...styles
}: {
  children: ReactNode;
  name: string;
  progressColor: ColorProps['color'];
  text: ReactNode;
  used: number;
  limit: number;
} & FlexProps) {
  return (
    <Tooltip
      bg={'white'}
      hasArrow={true}
      placement="top-end"
      label={text}
      arrowShadowColor={' rgba(0,0,0,0.1)'}
      arrowSize={12}
      offset={[0, 15]}
      px={4}
      py={2}
      borderRadius={'8px'}
    >
      <Flex
        justify={'space-between'}
        align={'center'}
        mb="20px"
        fontSize={'12px'}
        textTransform={'capitalize'}
        {...styles}
      >
        {children}
        <Flex w="160px" h="7px" bg="grayModern.200" borderRadius={'4px'} overflow={'hidden'}>
          <Flex
            borderRadius={'4px'}
            w={Math.floor((used * 100) / limit) + '%'}
            bgColor={progressColor}
          />
        </Flex>
      </Flex>
    </Tooltip>
  );
}
function BucketOverview({ ...styles }: StackProps) {
  const session = useSessionStore((s) => s.session);
  const quotaQuery = useQuery({
    queryKey: [QueryKey.bucketInfo, session],
    queryFn: getQuota
  });
  const { t } = useTranslation('common');
  const limit = quotaQuery.data?.quota.total || 0;
  const used = quotaQuery.data?.quota.used || 0;
  const count = quotaQuery.data?.quota.count || 0;
  return (
    <Stack fontSize={'12px'} {...styles}>
      <Flex justifyContent={'space-between'}>
        <Text>{t('totalObjects')}：</Text>
        <Text w="160px">{count}</Text>
      </Flex>
      {!quotaQuery.isLoading && (
        <QuotaProgress
          name={'storage'}
          limit={limit}
          used={used}
          progressColor={'#8172D899'}
          justifyContent={'space-between'}
          text={
            <Stack color={'grayModern.900'} w="80px">
              <Text>
                {t('total')}: {formatBytes(limit).toString()}
              </Text>
              <Text>
                {t('used')}: {formatBytes(used).toString()}
              </Text>
              <Text>
                {t('remaining')}: {formatBytes(limit - used).toString()}
              </Text>
            </Stack>
          }
        >
          <Text>{t('totalSpace')}:</Text>
        </QuotaProgress>
      )}
    </Stack>
  );
}

export default function SideBar() {
  const s3client = useOssStore((s) => s.client);
  const session = useSessionStore((s) => s.session);
  const { t } = useTranslation('bucket');
  const listBucketQuery = useQuery({
    queryKey: [QueryKey.bucketList, session],
    queryFn: listBucket,
    select(data) {
      return data;
    },
    refetchInterval(data, query) {
      if (data?.list.some((bucket) => !bucket.isComplete)) return 5000;
      else return false;
    },
    enabled: !!s3client
  });
  const bucketList = listBucketQuery.data?.list || [];
  const currentBucket = useOssStore((s) => s.currentBucket);
  const switchBucket = useOssStore((s) => s.switchBucket);
  useEffect(() => {
    if (bucketList.length > 0) {
      if (!currentBucket) switchBucket(bucketList[0]);
      else {
        const syncBucket = bucketList.find((bucket) => bucket.crName === currentBucket.crName);
        if (syncBucket) switchBucket(syncBucket);
        else switchBucket(bucketList[0]);
      }
    }
  }, [bucketList]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return (
    <Stack w={'300px'} p="16px" overflow={'auto'}>
      <Flex align={'center'} px="4px" justifyContent={'space-between'}>
        <Text color={'grayModern.900'} fontSize={'16px'} fontWeight={'500'}>
          {t('bucketList')}
        </Text>
        <Flex color={'#219BF4'}>
          <IconButton
            icon={<RefreshIcon boxSize="18px" />}
            p="5px"
            aria-label={'refresh bucket'}
            variant={'white-bg-icon'}
            onClick={async () => {
              await queryClient.invalidateQueries([QueryKey.bucketList]);
              await queryClient.invalidateQueries([QueryKey.bucketInfo]);
              toast({
                status: 'success',
                title: 'refresh successfully'
              });
            }}
          ></IconButton>
          <CreateBucketModal buttonType="min" />
        </Flex>
      </Flex>
      {bucketList.length > 0 ? (
        <>
          <Stack h="" flex={'1'} overflow={'auto'} minH={'80px'}>
            <Stack>
              {bucketList.map((bucket) => (
                <BucketListItem
                  bucket={bucket}
                  key={bucket.name}
                  isSelected={bucket.name === currentBucket?.name}
                  onClick={() => {
                    bucket.name && switchBucket(bucket);
                  }}
                />
              ))}
            </Stack>
          </Stack>
          <BucketOverview />
          <ParamterModal />
        </>
      ) : (
        <Center flex="1">
          <Text fontSize={'12px'} color="grayModern.500">
            {t('noBucket')}
          </Text>
        </Center>
      )}
    </Stack>
  );
}

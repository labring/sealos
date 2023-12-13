import {
  activeClusterBySystemId,
  findClusterBySystemId,
  getClusterList,
  isKubeSystemIDBound
} from '@/api/cluster';
import { EmptyIcon } from '@/components/Icon';
import Layout from '@/components/Layout';
import useClusterDetail from '@/stores/cluster';
import { ClusterResult } from '@/types';
import { compareFirstLanguages } from '@/utils/tools';
import {
  Button,
  Flex,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  position,
  useDisclosure,
  useMediaQuery,
  useToast
} from '@chakra-ui/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import ClusterList from './components/List';
import Tutorial from './components/Tutorial';

// Activation field systemId
// Cluster recharge callback clusterId
export default function MyCluster({ ossFileUrl }: { ossFileUrl: string }) {
  const { t } = useTranslation();
  const { clusterDetail, setClusterDetail, clearClusterDetail } = useClusterDetail();
  const [isLargerThanLG] = useMediaQuery(['(min-width: 992px)', '(display-mode: browser)']);
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [clusterType, setClusterType] = useState<string>('Standard');
  const [noCluster, setNoCluster] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  // The first cluster is selected by default
  const { data, isSuccess } = useQuery(
    ['getClusterList'],
    () =>
      getClusterList({
        page: 1,
        pageSize: 10
      }),
    {
      enabled: !clusterDetail?.clusterId && !router.query?.clusterId,
      onSuccess(data) {
        console.log(data);
        if (!clusterDetail?.clusterId && !router.query?.clusterIds) {
          console.log(data?.records?.[0], 'init cluster list');
          setClusterDetail(data?.records?.[0]);
        }
      }
    }
  );

  const handleActivateCluster = async () => {
    try {
      const systemId = router.query.systemId as string;
      if (!systemId || !clusterType || !data?.records) {
        return toast({
          position: 'top',
          status: 'info',
          description: '缺少参数'
        });
      }
      const cluster = findStandardRecordWithoutClusterId(data?.records, clusterType);
      if (!cluster) {
        setNoCluster(true);
        return;
      }
      setClusterDetail(cluster);
      const res = await activeClusterBySystemId({
        clusterId: cluster.clusterId,
        kubeSystemID: systemId
      });
      setClusterDetail(res);
      queryClient.invalidateQueries({ queryKey: ['getClusterList'] });
      queryClient.invalidateQueries({ queryKey: ['getLicenseByClusterId'] });
      onClose();
    } catch (error: any) {
      console.log(error, 'router active error');
      if (error?.message) {
        toast({
          position: 'top',
          status: 'error',
          description: error.message
        });
      }
    }
  };

  function findStandardRecordWithoutClusterId(records: ClusterResult[], type: string) {
    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    for (const record of records) {
      if (record.type === type && !record?.kubeSystemID) {
        return record;
      }
    }
    return null;
  }

  useEffect(() => {
    if (router.query?.systemId) {
      const systemId = router.query.systemId as string;
      isKubeSystemIDBound(systemId).then((res) => {
        console.log(res);
        if (!res.isBound) {
          onOpen();
        } else {
          findClusterBySystemId({ systemId }).then((res) => {
            console.log(res, 11);
            setClusterDetail(res);
          });
        }
      });
    }
  }, []);

  if (isSuccess && data?.total === 0) {
    return (
      <Layout>
        <Flex
          flex={1}
          overflow={'hidden'}
          justifyContent={'center'}
          alignItems={'center'}
          flexDirection={'column'}
        >
          <EmptyIcon />
          <Text mt="20px" color={'#5A646E'} fontWeight={500} fontSize={'14px'}>
            {t('You have not purchased the Cluster')}
          </Text>
        </Flex>
      </Layout>
    );
  }

  return (
    <Layout>
      <Flex flex={1} h={0} bg="#fefefe" position={'relative'}>
        <ClusterList />
        <Tutorial ossFileUrl={ossFileUrl} />
      </Flex>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader py="20px">激活集群</ModalHeader>
          <ModalCloseButton />
          {noCluster ? (
            <Flex alignItems={'center'} justifyContent={'center'} flexDirection={'column'}>
              <Text mt="30px" color={'#262A32'} fontWeight={500} fontSize={'16px'}>
                暂无可激活 {t(clusterType)}集群，可前往购买
              </Text>
              <Button
                mt="20px"
                mb="60px"
                w="114px"
                h="36px"
                borderRadius={'2px'}
                variant={'black'}
                onClick={() => {
                  router.push('/pricing');
                }}
              >
                去购买
              </Button>
            </Flex>
          ) : (
            <Flex alignItems={'center'} justifyContent={'center'} flexDirection={'column'}>
              <Text fontSize={'16px'} color={'#262A32'} fontWeight={500}>
                集群版本
              </Text>
              <Flex gap="20px" mt="26px">
                {['Standard', 'Enterprise'].map((item) => (
                  <Flex
                    key={item}
                    alignItems={'center'}
                    justifyContent={'center'}
                    w="140px"
                    h="62px"
                    color={clusterType === item ? '#36ADEF' : '#24282C'}
                    fontSize={'16px'}
                    fontWeight={'500'}
                    border={clusterType === item ? '1px solid #36ADEF' : ''}
                    borderRadius={'4px'}
                    bg="#F4F6F8"
                    cursor={'pointer'}
                    onClick={() => setClusterType(item)}
                  >
                    {t(item)}
                  </Flex>
                ))}
              </Flex>
              <Button
                mt="56px"
                mb="44px"
                w="200px"
                h="36px"
                borderRadius={'2px'}
                variant={'black'}
                onClick={handleActivateCluster}
              >
                激活
              </Button>
            </Flex>
          )}
        </ModalContent>
      </Modal>
    </Layout>
  );
}

export async function getServerSideProps({ req, res, locales }: any) {
  const local =
    req?.cookies?.NEXT_LOCALE || compareFirstLanguages(req?.headers?.['accept-language'] || 'zh');
  res.setHeader('Set-Cookie', `NEXT_LOCALE=zh; Max-Age=2592000; Secure; SameSite=None`);

  return {
    props: {
      ossFileUrl: process.env.OSS_FILE_URL,
      ...(await serverSideTranslations(local, undefined, null, locales || []))
    }
  };
}

import { deleteClusterById, updateClusterName, activeClusterBySystemId } from '@/api/cluster';
import { DeleteIcon } from '@/components/Icon';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import useClusterDetail from '@/stores/cluster';
import { formatTime } from '@/utils/tools';
import { Box, Button, Flex, Icon, Input, Text, useToast } from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

export default function TutorialPanel() {
  const { clusterDetail, setClusterDetail, clearClusterDetail } = useClusterDetail();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [id, setId] = useState('');
  const [name, setName] = useState('');

  const { openConfirm, ConfirmChild } = useConfirmDialog({
    title: '删除警告',
    content: '如果确认要删除这个集群吗？如果执行此操作，将删除该条集群记录。'
  });

  const handleUpdateCluster = async ({ updateName }: { updateName: boolean }) => {
    try {
      if (!clusterDetail?.clusterId) {
        return toast({
          status: 'error',
          title: '获取集群详细信息失败'
        });
      }
      let result;
      if (updateName) {
        result = await updateClusterName({
          clusterId: clusterDetail.clusterId,
          displayName: name
        });
      } else {
        result = await activeClusterBySystemId({
          clusterId: clusterDetail.clusterId,
          kubeSystemID: id
        });
      }
      setClusterDetail(result);
      queryClient.invalidateQueries({ queryKey: ['getClusterList'] });
      queryClient.invalidateQueries({ queryKey: ['getLicenseByClusterId'] });
      toast({
        position: 'top',
        status: 'success',
        title: 'success'
      });
    } catch (error: any) {
      if (error?.code) {
        toast({
          position: 'top',
          status: 'error',
          description: error?.message
        });
      }
    }
  };

  // delete cluster
  const handleDelteCluster = () => {
    openConfirm(async () => {
      if (clusterDetail?.clusterId) {
        await deleteClusterById({ clusterId: clusterDetail?.clusterId });
        clearClusterDetail();
        queryClient.invalidateQueries({ queryKey: ['getClusterList'] });
      }
    })();
  };

  useEffect(() => {
    setName(clusterDetail?.displayName || '');
  }, [clusterDetail]);

  return (
    <>
      <Box mt="32px" py="24px" pl="40px" pr="28px" bg="#FFF" borderRadius={'12px'}>
        <Flex alignItems={'center'} justifyContent={'space-between'}>
          <Text color={'#262A32'} fontSize={16} fontWeight={600}>
            集群激活
          </Text>
          {clusterDetail?.kubeSystemID && (
            <Flex>
              <Icon
                xmlns="http://www.w3.org/2000/svg"
                w="20px"
                h="20px"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M16.6667 5L7.50004 14.1667L3.33337 10"
                  stroke={'#00A9A6'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Icon>
              <Text fontSize={'14px'} color={'#00A9A6'} fontWeight={600} ml="8px">
                集群已激活
              </Text>
            </Flex>
          )}
        </Flex>

        {clusterDetail?.kubeSystemID ? (
          <Flex alignItems={'center'} mt="16px" justifyContent={'center'} flexDirection={'column'}>
            <Text textAlign={'center'} color={'#24282C'} fontSize={'16px'} fontWeight={500}>
              集群 ID: {clusterDetail.kubeSystemID}
            </Text>
            {clusterDetail?.kubeSystemUpdateAt && (
              <Text mt="12px" color={'#5A646E'} fontSize={'12px'} fontWeight={400}>
                激活时间: {formatTime(clusterDetail?.kubeSystemUpdateAt, 'YYYY-MM-DD HH:mm')}
              </Text>
            )}
          </Flex>
        ) : (
          <Flex alignItems={'center'} mt="16px">
            <Text w="60px" color={'#24282C'} fontSize={'14px'} fontWeight={400}>
              集群 ID
            </Text>
            <Input onChange={(e) => setId(e.target.value)} />
          </Flex>
        )}

        {!clusterDetail?.kubeSystemID && (
          <Flex mt="16px" justifyContent={'end'}>
            <Button
              w="100px"
              h="36px"
              variant={'black'}
              onClick={() => handleUpdateCluster({ updateName: false })}
            >
              激活
            </Button>
          </Flex>
        )}
      </Box>
      <Box py="24px" pl="40px" pr="28px" mt="8px" bg="#FFF" borderRadius={'12px'}>
        <Text color={'#262A32'} fontSize={16} fontWeight={600}>
          集群名称
        </Text>
        <Flex mt="16px" alignItems={'center'}>
          <Text w="60px" color={'#24282C'} fontSize={'14px'} fontWeight={400}>
            名称
          </Text>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Flex>

        <Flex mt="16px" justifyContent={'end'}>
          <Button onClick={() => handleUpdateCluster({ updateName: true })}>保存</Button>
        </Flex>
      </Box>
      <Flex
        mt="12px"
        alignItems={'center'}
        justifyContent="center"
        w="100%"
        h="44px"
        borderRadius={'8px'}
        cursor={'pointer'}
        onClick={handleDelteCluster}
        bg="white"
        _hover={{ bg: 'red.50' }}
      >
        <DeleteIcon fill={'#FF324A'} w="20px" h="20px" mr="8px" />
        <Text color={'#FF324A'} fontSize={'14px'} fontWeight={600}>
          删除集群
        </Text>
      </Flex>
      <ConfirmChild />
    </>
  );
}

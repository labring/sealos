import BillingMeter from '@/components/billing-meter';
import RechargeComponent from '@/components/recharge';
import { company, contect, defaulClustertForm, freeClusterForm } from '@/constant/product';
import { ClusterFormType, ClusterType } from '@/types';
import { calculatePrice } from '@/utils/tools';
import { Button, Flex, Text } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import ServicePackage from './ServicePackage';
import { useRouter } from 'next/router';

export default function Product() {
  const [clusterType, setClusterType] = useState<ClusterType>(ClusterType.ScaledStandard);
  const [price, setPrice] = useState(0);
  const rechargeRef = useRef<{ onOpen: (form?: ClusterFormType) => void; isOpen: boolean }>();
  const router = useRouter();

  const formHook = useForm<ClusterFormType>({
    defaultValues: defaulClustertForm
  });

  formHook.watch((data) => {
    if (!data) return;
    const price = calculatePrice(data as ClusterFormType, freeClusterForm);
    setPrice(price);
  });

  useEffect(() => {
    const price = calculatePrice(defaulClustertForm, freeClusterForm);
    setPrice(price);
  }, []);

  const handleProductByType = (type: ClusterType) => {
    setClusterType(type);
    if (type === ClusterType.ScaledStandard) {
      rechargeRef.current?.onOpen();
      return;
    }

    if (type === ClusterType.Contact) {
      window.open(
        'https://fael3z0zfze.feishu.cn/share/base/form/shrcnesSfEK65JZaAf2W6Fwz6Ad',
        '_blank'
      );
    }
  };

  useEffect(() => {
    if (router.query?.systemId) {
      const { systemId, nodeCount, totalCpu, totalMemory } = router.query as unknown as {
        systemId: string;
        nodeCount: number;
        totalCpu: number;
        totalMemory: number;
      };
      rechargeRef.current?.onOpen({
        cpu: totalCpu,
        memory: totalMemory,
        months: '3',
        systemId: systemId
      });
    }
  }, []);

  return (
    <>
      <Flex
        flex={1}
        backgroundColor="#f2f5f7"
        overflowY={'scroll'}
        flexWrap={'wrap'}
        h="100%"
        pt="30px"
        pb="15px"
        justifyContent={'center'}
        gap={'36px'}
        px="24px"
      >
        <ServicePackage items={company}>
          <Text color="#0884DD" fontSize="18px" fontWeight="600">
            标准版
          </Text>
          <Text mt="24px" color={'#24282C'} fontSize={'24px'} fontWeight={600}>
            适合开发者测试， POC demo，企业生产环境
          </Text>
          <Button
            w="100%"
            mt="28px"
            bgColor={'#AFDEF9'}
            fontSize={'14px'}
            color={'#24282C'}
            fontWeight={500}
            onClick={() => handleProductByType(ClusterType.ScaledStandard)}
          >
            获取
          </Button>
        </ServicePackage>
        <ServicePackage items={contect}>
          <Text color="#00A9A6" fontSize="18px" fontWeight="600">
            定制版
          </Text>
          <Text mt="24px" color={'#24282C'} fontSize={'24px'} fontWeight={600} w="200px">
            适合大规模集群与大型企业客户
          </Text>
          <Button
            w="100%"
            mt="32px"
            bgColor={'#F4F6F8'}
            fontSize={'16px'}
            color={'#24282C'}
            fontWeight={600}
            onClick={() => handleProductByType(ClusterType.Contact)}
          >
            联系我们
          </Button>
        </ServicePackage>
        <BillingMeter formHook={formHook} price={price} />
      </Flex>
      <RechargeComponent ref={rechargeRef} isLicensePay={false} key={'cluster'} />
    </>
  );
}

import { createCluster, createClusterAndLicense } from '@/api/cluster';
import { checkWechatPay, createPayment, handlePaymentResult } from '@/api/payment';
import { getSystemEnv } from '@/api/system';
import { StripeIcon, SuccessIcon } from '@/components/Icon';
import { company, contect, standard } from '@/constant/product';
import { ClusterType, PaymentStatus, TPayMethod, WechatPaymentData } from '@/types';
import {
  AbsoluteCenter,
  Box,
  Button,
  Center,
  Divider,
  Flex,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  useDisclosure,
  useToast
} from '@chakra-ui/react';
import { loadStripe } from '@stripe/stripe-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useState } from 'react';
import ServicePackage from './ServicePackage';
import useRouteParamsStore from '@/stores/routeParams';
import useSessionStore from '@/stores/session';
import usePaymentDataStore from '@/stores/payment';

export default function Product() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  // const { isOpen: isOpenStatus, onOpen: onOpenSuccess, onClose: onCloseSuccess } = useDisclosure();
  const toast = useToast({ position: 'top', duration: 2000 });
  // 整个流程跑通需要状态管理, 0 初始态， 1 创建支付单， 2 支付中, 3 支付成功
  const [complete, setComplete] = useState<0 | 1 | 2 | 3>(0);
  const [payType, setPayType] = useState<TPayMethod>('wechat');
  const [clusterType, setClusterType] = useState<ClusterType>(ClusterType.Standard);
  const [orderID, setOrderID] = useState('');
  const [wechatData, setWechatData] = useState<WechatPaymentData>();
  const { data: platformEnv } = useQuery(['getPlatformEnv'], getSystemEnv);
  const [remainingSeconds, setRemainingSeconds] = useState(2); // 初始值为2秒
  const { data: routeParams, setRouteParams, clearRouteParams } = useRouteParamsStore();
  const { isUserLogin } = useSessionStore();
  const { paymentData, setPaymentData, deletePaymentData, isExpired } = usePaymentDataStore();

  const onClosePayment = useCallback(() => {
    setOrderID('');
    setComplete(0);
    onClose();
  }, [onClose]);

  const openPayModal = () => {
    setComplete(1);
    setPayType('wechat');
    paymentMutation.mutate((1 * 100).toString());
    onOpen();
  };

  const handleStripePay = () => {
    setComplete(1);
    setPayType('stripe');
    paymentMutation.mutate((599 * 100).toString());
  };

  const handleProductByType = (type: ClusterType) => {
    setClusterType(type);
    if (type === ClusterType.Standard) {
      onOpen();
      clusterMutation.mutate({ type: ClusterType.Standard });
    }
    if (type === ClusterType.Enterprise) {
      openPayModal();
    }
    if (type === ClusterType.Contact) {
      window.open(
        'https://fael3z0zfze.feishu.cn/share/base/form/shrcnesSfEK65JZaAf2W6Fwz6Ad',
        '_blank'
      );
    }
  };

  const paymentMutation = useMutation(
    (amount: string) =>
      createPayment({
        amount: amount,
        payMethod: payType,
        currency: 'CNY',
        stripeCallBackUrl: '/pricing'
      }),
    {
      async onSuccess(data) {
        if (payType === 'stripe' && platformEnv && data?.sessionID) {
          const stripe = await loadStripe(platformEnv?.stripePub);
          stripe?.redirectToCheckout({
            sessionId: data.sessionID
          });
        }
        if (payType === 'wechat' && data?.tradeNO && data?.codeURL) {
          setOrderID(data.orderID);
          setWechatData({ tradeNO: data?.tradeNO, codeURL: data?.codeURL });
          setComplete(2);
          setPaymentData(data.orderID);
        }
      },
      onError(err: any) {
        toast({
          status: 'error',
          title: err?.message || '',
          isClosable: true,
          position: 'top'
        });
        setComplete(0);
      }
    }
  );

  const clusterMutation = useMutation(
    ({ type }: { type: ClusterType }) => createCluster({ type }),
    {
      onSuccess(data) {
        console.log(data, 'clusterMutation');
        setComplete(3);
        queryClient.invalidateQueries(['getClusterRecord']);
        deletePaymentData();
      },
      onError(err: any) {
        toast({
          status: 'error',
          title: err?.message || '',
          isClosable: true,
          position: 'top'
        });
        setComplete(0);
      }
    }
  );

  const clusterAndLicenseMutation = useMutation(
    ({ type, orderID }: { type: ClusterType; orderID: string }) =>
      createClusterAndLicense({ orderID, type: type }),
    {
      onSuccess(data) {
        console.log(data, 'clusterAndLicenseMutation');
        setComplete(3);
        queryClient.invalidateQueries(['getClusterRecord']);
        deletePaymentData();
      },
      onError(err: any) {
        toast({
          status: 'error',
          title: err?.message || '',
          isClosable: true,
          position: 'top'
        });
        setComplete(0);
      }
    }
  );

  useQuery(['getPaymentResult', orderID], () => handlePaymentResult({ orderID }), {
    refetchInterval: complete === 2 ? 3 * 1000 : false,
    enabled: complete === 2 && !!orderID,
    cacheTime: 0,
    staleTime: 0,
    onSuccess(data) {
      console.log(data, 'getPaymentResult');
      if (data.status === PaymentStatus.PaymentSuccess) {
        clusterAndLicenseMutation.mutate({ orderID: data.orderID, type: ClusterType.Enterprise });
      }
    },
    onError(err: any) {
      toast({
        status: 'error',
        title: err?.message || '',
        isClosable: true,
        position: 'top'
      });
      setComplete(0);
    }
  });

  // checkWechatPay
  useQuery(['checkWechatPay'], () => checkWechatPay('cluster'), {
    enabled: !isExpired() && !!paymentData?.orderId,
    onSuccess(data) {
      console.log(data, 'Handle wechat shutdown situation');
      if (data.status === PaymentStatus.PaymentSuccess) {
        toast({
          status: 'success',
          title: t('Payment Successful'), // 这里改为license 签发成功
          isClosable: true,
          duration: 9000,
          position: 'top'
        });
        deletePaymentData();
        queryClient.invalidateQueries(['getClusterRecord']);
        setComplete(3);
      }
    }
  });

  // handle stripe
  useEffect(() => {
    const { stripeState, orderID } = router.query;
    const clearQuery = () => {
      router.replace({
        pathname: '/pricing',
        query: null
      });
    };
    if (stripeState === 'success') {
      toast({
        status: 'success',
        title: t('Checking Payment Results'), // 这里改为license 签发成功
        isClosable: true,
        duration: 9000,
        position: 'top'
      });
      setComplete(2);
      setOrderID(orderID as string);
      setTimeout(clearQuery, 0);
    } else if (stripeState === 'error') {
      toast({
        status: 'error',
        duration: 3000,
        title: t('Stripe Cancel'),
        isClosable: true,
        position: 'top'
      });
      onClosePayment();
      setTimeout(clearQuery, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // handle success
  useEffect(() => {
    if (complete === 3) {
      onOpen();
      const timer = setInterval(() => {
        if (remainingSeconds > 0) {
          setRemainingSeconds(remainingSeconds - 1);
        } else {
          clearInterval(timer);
          router.push('/cluster');
        }
      }, 1000);

      return () => {
        clearInterval(timer);
      };
    }
  }, [complete, onOpen, remainingSeconds, router]);

  // handle Jump link
  useEffect(() => {
    const { clusterType, external } = router.query;
    const isLogin = isUserLogin();
    console.log(clusterType, external);

    if (!isLogin) {
      setRouteParams(external as string, clusterType as ClusterType);
    } else if (routeParams.clusterType) {
      handleProductByType(routeParams.clusterType as ClusterType);
      clearRouteParams();
    } else {
      console.log(11);
      handleProductByType(clusterType as ClusterType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box flex={1} overflow={'scroll'} backgroundColor="#f2f5f7">
      <Flex
        minW={'1280px'}
        // flexWrap={'wrap'}
        h="100%"
        pt="30px"
        pb="15px"
        justifyContent={'center'}
        gap={'36px'}
        px="24px"
      >
        <ServicePackage items={standard}>
          <Text color="#00A9A6" fontSize="18px" fontWeight="600">
            标准版
          </Text>
          <Flex alignItems={'center'} mt="16px">
            <Text color="#000" fontSize="40px" fontWeight="600">
              ¥0
            </Text>
            <Center
              h="34px"
              px="16px"
              ml="24px"
              borderRadius={'15px 15px 15px 0px'}
              bgColor={'#EBF7FD'}
              color={'#00A9A6'}
              fontWeight={500}
              fontSize={'20px'}
            >
              赠 ¥299
            </Center>
          </Flex>
          <Text mt="16px" color={'#24282C'} fontSize={'18px'} fontWeight={600}>
            适合开发者测试，或 POC demo
          </Text>
          <Button
            mt="28px"
            bgColor={'#F4F6F8'}
            fontSize={'16px'}
            color={'#24282C'}
            fontWeight={600}
            onClick={() => handleProductByType(ClusterType.Standard)}
          >
            一键安装
          </Button>
        </ServicePackage>
        <ServicePackage items={company}>
          <Text color="#36ADEF" fontSize="18px" fontWeight="600">
            企业版
          </Text>
          <Flex alignItems={'center'} mt="16px">
            <Text color="#000" fontSize="40px" fontWeight="600">
              ¥599
            </Text>
            <Center
              h="34px"
              px="16px"
              ml="24px"
              borderRadius={'15px 15px 15px 0px'}
              bgColor={'#EBF7FD'}
              color={'#36ADEF'}
              fontWeight={500}
              fontSize={'20px'}
            >
              赠 ¥599
            </Center>
          </Flex>
          <Text mt="16px" color={'#24282C'} fontSize={'18px'} fontWeight={600}>
            适合企业生产环境
          </Text>
          <Button
            mt="28px"
            bgColor={'#AFDEF9'}
            fontSize={'16px'}
            color={'#24282C'}
            fontWeight={600}
            onClick={() => handleProductByType(ClusterType.Enterprise)}
          >
            购买
            {/* {t('Buy')} */}
          </Button>
        </ServicePackage>
        <ServicePackage items={contect}>
          <Text color="#00A9A6" fontSize="18px" fontWeight="600">
            定制版
          </Text>
          <Text mt="32px" color={'#24282C'} fontSize={'24px'} fontWeight={600} w="200px">
            适合大规模集群与大型企业客户
            {/* Suitable for large-scale clusters and large enterprise customers */}
          </Text>
          <Button
            mt="42px"
            bgColor={'#F4F6F8'}
            fontSize={'16px'}
            color={'#24282C'}
            fontWeight={600}
            onClick={() => handleProductByType(ClusterType.Contact)}
          >
            {/* {t('Contact Us')} */}
            联系我们
          </Button>
        </ServicePackage>
      </Flex>

      <Modal isOpen={isOpen} onClose={onClosePayment} closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader></ModalHeader>
          {complete !== 3 && <ModalCloseButton />}
          {complete === 3 ? (
            <Flex
              flexDirection={'column'}
              px="37px"
              pt="100px"
              pb="200px"
              alignItems={'center'}
              justifyContent={'center'}
            >
              <SuccessIcon />
              <Text mt="24px" color={'#24282C'} fontSize={'18px'} fontWeight={600}>
                {t('Cluster Pay Success', {
                  clusterType: t(clusterType)
                })}
              </Text>
              <Text color={'#5A646E'} fontSize={'12px'} fontWeight={500} mt="16px">
                {remainingSeconds} 后跳转至集群部署页
              </Text>
            </Flex>
          ) : (
            <Flex
              flexDirection="column"
              px="37px"
              py="30px"
              justify={'center'}
              align={'center'}
              justifyContent={'center'}
              alignItems={'center'}
              position={'relative'}
            >
              {payType === 'wechat' ? (
                <>
                  <Text fontSize={'20px'} fontWeight={500} color="#24282C" textAlign="center">
                    {t('Scan with WeChat')}
                  </Text>
                  <Box my="32px">
                    {complete === 2 && !!wechatData?.codeURL ? (
                      <QRCodeSVG
                        size={185}
                        value={wechatData?.codeURL}
                        style={{ margin: '0 auto' }}
                        imageSettings={{
                          // 二维码中间的logo图片
                          src: 'images/pay_wechat.svg',
                          height: 40,
                          width: 40,
                          excavate: true // 中间图片所在的位置是否镂空
                        }}
                      />
                    ) : (
                      <Spinner />
                    )}
                  </Box>
                  <Text color="#717D8A" fontSize="12px" fontWeight="normal">
                    {t('Order Number')}： {wechatData?.tradeNO || ''}
                  </Text>
                </>
              ) : (
                <Spinner />
              )}

              <Box mt="36px" position="relative" w="100%">
                <Divider bg={'#E9EEF5'} />
                <AbsoluteCenter bg="white" px="4" color={'#7B838B'} fontSize={'12px'}>
                  其他方式支付
                </AbsoluteCenter>
              </Box>
              <Button
                mt="26px"
                size="primary"
                variant="primary"
                w="218px"
                h="44px"
                onClick={handleStripePay}
              >
                <StripeIcon />
                <Text ml="12px">{t('pay with stripe')}</Text>
              </Button>
            </Flex>
          )}
        </ModalContent>
      </Modal>
    </Box>
  );
}

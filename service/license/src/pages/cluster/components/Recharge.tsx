import { checkWechatPay, createPayment, handlePaymentResult } from '@/api/payment';
import { getSystemEnv, uploadConvertData } from '@/api/system';
import { LeftIcon, StripeIcon, WechatIcon } from '@/components/Icon';
import useBonusBox from '@/hooks/useBonusBox';
import { PaymentStatus, TPayMethod, WechatPaymentData } from '@/types';
import { deFormatMoney } from '@/utils/tools';
import {
  Button,
  Checkbox,
  Flex,
  Link,
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
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import WechatPayment from '@/components/WechatPayment';
import { createLicense } from '@/api/license';
import usePaymentDataStore from '@/stores/payment';
import useClusterDetail from '@/stores/cluster';
import { findClusterById } from '@/api/cluster';

export default forwardRef(function RechargeComponent(props, ref) {
  const { clusterDetail, setClusterDetail } = useClusterDetail();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast({ position: 'top', duration: 2000 });
  const { t } = useTranslation();
  const [isAgree, setIsAgree] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const { BonusBox, selectAmount } = useBonusBox();
  const { isOpen, onOpen, onClose } = useDisclosure();
  // 整个流程跑通需要状态管理, 0 初始态， 1 创建支付单， 2 支付中, 3 支付成功
  const [complete, setComplete] = useState<0 | 1 | 2 | 3>(0);
  const [payType, setPayType] = useState<TPayMethod>('wechat');
  const [detail, setDetail] = useState(false);
  const [orderID, setOrderID] = useState('');
  const [wechatPaymentData, setWechatPaymentData] = useState<WechatPaymentData>();
  const { data: platformEnv } = useQuery(['getPlatformEnv'], getSystemEnv);
  // 用于避免微信支付，窗口关闭后感知不到的问题
  const { paymentData, setPaymentData, deletePaymentData, isExpired } = usePaymentDataStore();

  const onClosePayment = useCallback(() => {
    setOrderID('');
    setComplete(0);
    setDetail(false);
    onClose();
  }, [onClose]);

  useImperativeHandle(
    ref,
    () => {
      return {
        onOpen() {
          onOpen();
        }
      };
    },
    [onOpen]
  );

  const handlePayConfirm = (type: TPayMethod) => {
    setPayType(type);
    if (!isAgree) {
      return toast({
        status: 'error',
        title: t('Please read and agree to the agreement'),
        isClosable: true,
        position: 'top'
      });
    }
    if (type === 'stripe' && selectAmount < 10) {
      return toast({
        status: 'error',
        title: t('Pay Minimum Tips')
      });
    }
    setDetail(true);
    setComplete(1);
    paymentMutation.mutate();
  };

  const paymentMutation = useMutation(
    () =>
      createPayment({
        amount: deFormatMoney(selectAmount).toString(),
        payMethod: payType,
        currency: 'CNY',
        stripeSuccessCallBackUrl: `/cluster?clusterId=${clusterDetail?.clusterId}&tab=license&stripeState=success`,
        stripeErrorCallBackUrl: `/cluster?clusterId=${clusterDetail?.clusterId}&tab=license&stripeState=error`
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
          setWechatPaymentData({ tradeNO: data?.tradeNO, codeURL: data?.codeURL });
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

  const licenseMutation = useMutation(
    ({ orderID, clusterId }: { orderID: string; clusterId: string }) =>
      createLicense({ orderID, clusterId }),
    {
      onSuccess(data) {
        onClosePayment();
        toast({
          status: 'success',
          title: t('License issued successfully'),
          isClosable: true,
          position: 'top'
        });
        queryClient.invalidateQueries(['getLicenseByClusterId']);
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
      console.log(data, clusterDetail, 1111111111111);
      if (!clusterDetail?.clusterId) {
        return toast({
          position: 'top',
          status: 'error',
          title: '请联系管理员'
        });
      }
      if (data.status === PaymentStatus.PaymentSuccess) {
        licenseMutation.mutate({ orderID: data.orderID, clusterId: clusterDetail.clusterId });
        uploadConvertData([90])
          .then((res) => {
            console.log(res);
          })
          .catch((err) => {
            console.log(err);
          });
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

  // checkWechatPay;
  useQuery(['checkWechatPay'], () => checkWechatPay('license'), {
    enabled: !isExpired() && !!paymentData?.orderId,
    onSuccess(data) {
      console.log(data, 'Handle wechat shutdown situation');
      if (data.status === PaymentStatus.PaymentSuccess) {
        if (!clusterDetail?.clusterId) {
          return toast({
            position: 'top',
            status: 'error',
            title: '请联系管理员'
          });
        }
        licenseMutation.mutate({ orderID: data.orderID, clusterId: clusterDetail.clusterId });
      }
    }
  });

  const getCluster = async (id: string) => {
    const cluster = await findClusterById({
      clusterId: id
    });
    setClusterDetail(cluster);
  };

  useEffect(() => {
    const { stripeState, orderID, clusterId, tab } = router.query;
    console.log(stripeState, orderID, clusterId);

    const clearQuery = () => {
      router.replace({
        pathname: '/cluster',
        query: { tab }
      });
    };

    if (stripeState === 'success') {
      clusterId ? getCluster(clusterId as string) : '';
      setComplete(2);
      setOrderID(orderID as string);
      setTimeout(clearQuery, 0);
    } else if (stripeState === 'error') {
      clusterId ? getCluster(clusterId as string) : '';
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

  return (
    <Modal isOpen={isOpen} onClose={onClosePayment}>
      <ModalOverlay />
      <ModalContent
        borderRadius={'12px'}
        maxW="502px"
        minH={'495px'}
        display={'flex'}
        flexDirection={'column'}
      >
        <ModalCloseButton />
        {detail ? (
          <>
            <ModalHeader
              cursor={'pointer'}
              pt={'24px'}
              py={'20px'}
              onClick={() => {
                setOrderID('');
                setComplete(0);
                setDetail(false);
              }}
              display={'flex'}
              alignItems={'center'}
            >
              <LeftIcon />
              <Text ml="8px" color={'#24282C'}>
                {t('Purchase License')}
              </Text>
            </ModalHeader>
            {complete === 1 ? (
              <Flex flex={1} alignItems={'center'} justifyContent={'center'}>
                <Spinner size={'xl'} />
              </Flex>
            ) : (
              <WechatPayment
                complete={complete}
                codeURL={wechatPaymentData?.codeURL}
                tradeNO={wechatPaymentData?.tradeNO}
              />
            )}
          </>
        ) : (
          <>
            <ModalHeader py={'20px'}>{t('Purchase License')}</ModalHeader>
            <Flex flex={1} flexDirection="column" alignItems="center" px={'24px'} pb="45px">
              <Text alignSelf={'start'} color="#7B838B" fontWeight={'normal'} mb={'16px'}>
                {t('Select Amount')}
              </Text>
              <BonusBox />
              <Flex alignSelf={'flex-start'} align={'center'} mt={'32px'}>
                <Checkbox
                  isInvalid={isInvalid}
                  mr={'8px'}
                  isChecked={isAgree}
                  variant={'unstyled'}
                  onChange={(e) => {
                    setIsInvalid(false);
                    setIsAgree(e.target.checked);
                  }}
                />
                <Text
                  fontStyle="normal"
                  fontWeight="400"
                  fontSize="12px"
                  lineHeight="140%"
                  color={'#1D8CDC'}
                >
                  {t('agree policy')}
                  <Link
                    isExternal
                    href={platformEnv?.service_protocol}
                    _hover={{
                      color: 'rgba(94, 189, 242, 1)',
                      borderBottom: '1px solid rgba(94, 189, 242, 1)'
                    }}
                    px="4px"
                  >
                    {t('Service Agreement')}
                  </Link>
                  {t('and')}
                  <Link
                    isExternal
                    href={platformEnv?.private_protocol}
                    _hover={{
                      color: 'rgba(94, 189, 242, 1)',
                      borderBottom: '1px solid rgba(94, 189, 242, 1)'
                    }}
                    px="4px"
                  >
                    {t('Privacy Policy')}
                  </Link>
                </Text>
                {/* <OuterLink text={t('View Discount Rules')}></OuterLink> */}
              </Flex>
              <Flex gap={'16px'} width={'full'} mt="20px">
                {platformEnv?.stripeEnabled && (
                  <Button
                    size="primary"
                    variant="primary"
                    mt="20px"
                    w="full"
                    h="auto"
                    py="14px"
                    px="34px"
                    onClick={() => handlePayConfirm('stripe')}
                  >
                    <StripeIcon />
                    <Text ml="12px">{t('pay with stripe')}</Text>
                  </Button>
                )}

                {platformEnv?.wechatEnabledRecharge && (
                  <Button
                    size="primary"
                    variant="primary"
                    mt="20px"
                    w="full"
                    h="auto"
                    py="14px"
                    px="34px"
                    onClick={() => handlePayConfirm('wechat')}
                  >
                    <WechatIcon fill={'#33BABB'} />
                    <Text ml="12px">{t('pay with wechat')}</Text>
                  </Button>
                )}
              </Flex>
            </Flex>
          </>
        )}
      </ModalContent>
    </Modal>
  );
});

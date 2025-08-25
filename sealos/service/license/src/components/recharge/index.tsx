import { activeClusterBySystemId, createCluster, findClusterById } from '@/api/cluster';
import { createLicense } from '@/api/license';
import { checkWechatPay, createPayment, handlePaymentResult } from '@/api/payment';
import { getSystemEnv, uploadConvertData } from '@/api/system';
import { AddIcon, LeftIcon, StripeIcon, WechatIcon } from '@/components/Icon';
import WechatPayment from '@/components/WechatPayment';
import { defaulClustertForm, freeClusterForm } from '@/constant/product';
import BillingMeter from '@/components/billing-meter';
import useClusterDetail from '@/stores/cluster';
import usePaymentDataStore from '@/stores/payment';
import {
  ClusterFormType,
  ClusterType,
  CreateClusterParams,
  PaymentStatus,
  TPayMethod,
  WechatPaymentData
} from '@/types';
import { calculatePrice, deFormatMoney } from '@/utils/tools';
import {
  Box,
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
import { useForm } from 'react-hook-form';

const RechargeComponent = forwardRef(function RechargeComponent(
  { isLicensePay }: { isLicensePay: boolean },
  ref
) {
  const { clusterDetail, setClusterDetail } = useClusterDetail();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast({ position: 'top', duration: 2000 });
  const { t } = useTranslation();
  const [isAgree, setIsAgree] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
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
  const [price, setPrice] = useState(0);

  const formHook = useForm<ClusterFormType>();

  // price
  formHook.watch((data) => {
    if (!data) return;
    const price = calculatePrice(data as ClusterFormType, freeClusterForm);
    setPrice(price);
  });

  const onClosePayment = useCallback(() => {
    formHook.reset();
    setOrderID('');
    setComplete(0);
    setDetail(false);
    setIsAgree(false);
    onClose();
  }, [formHook, onClose]);

  useImperativeHandle(
    ref,
    () => {
      return {
        onOpen(form?: ClusterFormType) {
          onOpen();
          if (isLicensePay) {
            formHook.reset({
              cpu: clusterDetail?.cpu ?? defaulClustertForm.cpu,
              memory: clusterDetail?.memory ?? defaulClustertForm.memory,
              name: clusterDetail?.displayName ?? defaulClustertForm.name,
              months: clusterDetail?.months ?? defaulClustertForm.months
            });
          } else {
            formHook.reset(form ? form : defaulClustertForm);
          }
        }
      };
    },
    [
      onOpen,
      isLicensePay,
      formHook,
      clusterDetail?.cpu,
      clusterDetail?.memory,
      clusterDetail?.displayName,
      clusterDetail?.months
    ]
  );

  const handleSubmit = (payType: TPayMethod) => {
    formHook.handleSubmit(
      (data) => {
        setPayType(payType);
        if (!isAgree) {
          return toast({
            status: 'error',
            title: t('Please read and agree to the agreement'),
            isClosable: true,
            position: 'top'
          });
        }
        if (price === 0) {
          if (isLicensePay) {
            return licenseMutation.mutate({
              orderID: '',
              clusterId: clusterDetail?.clusterId || '',
              ...data
            });
          } else {
            return clusterMutation.mutate({
              orderID: '',
              type: ClusterType.Standard,
              ...data
            });
          }
        }
        if (payType === 'stripe' && price < 10) {
          return toast({
            status: 'error',
            title: t('Pay Minimum Tips')
          });
        }
        setDetail(true);
        setComplete(1);
        paymentMutation.mutate({ amount: deFormatMoney(price).toString() });
      },
      (err) => {
        const deepSearch = (obj: any): string => {
          if (!obj || typeof obj !== 'object') return 'Submit Error';
          if (!!obj.message) {
            return obj.message;
          }
          return deepSearch(Object.values(obj)[0]);
        };
        toast({
          title: deepSearch(err),
          status: 'error',
          position: 'top',
          duration: 3000,
          isClosable: true
        });
      }
    )();
  };

  const createPaymentMutation = async ({ amount }: { amount: string }) => {
    const payMethod = payType;
    const currency = 'CNY';
    const stripeSuccessCallBackUrl = isLicensePay
      ? `/cluster?tab=license&stripeState=success`
      : '/pricing?stripeState=success';
    const stripeErrorCallBackUrl = isLicensePay
      ? `/cluster?tab=license&stripeState=error`
      : '/pricing?stripeState=error';

    return createPayment({
      amount,
      payMethod,
      currency,
      stripeSuccessCallBackUrl,
      stripeErrorCallBackUrl
    });
  };

  const paymentMutation = useMutation(createPaymentMutation, {
    async onSuccess(data) {
      setPaymentData({
        orderId: data.orderID,
        clusterId: clusterDetail?.clusterId || '',
        ...formHook.getValues()
      });
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

  const createLicenseMutation = async ({
    orderID,
    clusterId,
    cpu,
    memory,
    months
  }: {
    orderID: string;
    clusterId: string;
    cpu: number;
    memory: number;
    months: string;
  }) => {
    return createLicense({ orderID, clusterId, cpu, memory, months });
  };

  const licenseMutation = useMutation(createLicenseMutation, {
    onSuccess() {
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
      setOrderID('');
      setComplete(0);
      setDetail(false);
    }
  });

  // create cluster
  const clusterMutation = useMutation((payload: CreateClusterParams) => createCluster(payload), {
    async onSuccess(data) {
      let cluster;
      cluster = await findClusterById({
        clusterId: data.clusterId
      });

      const systemId = formHook.getValues('systemId') || paymentData?.systemId;
      if (systemId) {
        cluster = await activeClusterBySystemId({
          clusterId: cluster.clusterId,
          kubeSystemID: systemId
        });
      }
      setClusterDetail(cluster);
      toast({
        status: 'success',
        title: '集群创建成功, 请前往我的集群查看',
        isClosable: true,
        position: 'top'
      });
      queryClient.invalidateQueries(['getClusterList']);
      queryClient.invalidateQueries({ queryKey: ['getLicenseByClusterId'] });
      deletePaymentData();
      onClosePayment();
    },
    onError(err: any) {
      toast({
        status: 'error',
        title: err?.message || '',
        isClosable: true,
        position: 'top'
      });
      setOrderID('');
      setComplete(0);
      setDetail(false);
    }
  });

  useQuery(['getPaymentResult', orderID], () => handlePaymentResult({ orderID }), {
    refetchInterval: complete === 2 ? 3 * 1000 : false,
    enabled: complete === 2 && !!orderID,
    cacheTime: 0,
    staleTime: 0,
    onSuccess(data) {
      const cpu = paymentData?.cpu;
      const months = paymentData?.months;
      const memory = paymentData?.memory;
      const clusterName = paymentData?.name;
      const systemId = paymentData?.systemId;

      if (!cpu || !memory || !months) {
        return toast({
          position: 'top',
          status: 'error',
          title: '缺少 cpu、memory、months 参数'
        });
      }

      if (data.status === PaymentStatus.PaymentSuccess) {
        if (isLicensePay) {
          if (!clusterDetail?.clusterId) {
            return toast({
              position: 'top',
              status: 'error',
              title: '缺少 clusterId 参数'
            });
          }
          licenseMutation.mutate({
            orderID: data.orderID,
            clusterId: clusterDetail.clusterId,
            cpu,
            memory,
            months
          });
        } else {
          clusterMutation.mutate({
            orderID: data.orderID,
            type: ClusterType.ScaledStandard,
            cpu,
            memory,
            months,
            name: clusterName,
            systemId
          });
        }
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
      setOrderID('');
      setComplete(0);
      setDetail(false);
    }
  });

  // checkWechatPay;
  useQuery(['checkWechatPay'], () => checkWechatPay('license'), {
    enabled: !isExpired() && !!paymentData?.orderId,
    onSuccess(data) {
      if (data.status === PaymentStatus.PaymentSuccess) {
        const cpu = paymentData?.cpu;
        const months = paymentData?.months;
        const memory = paymentData?.memory;
        const systemId = paymentData?.systemId;

        if (!clusterDetail?.clusterId || !cpu || !memory || !months) {
          return toast({
            position: 'top',
            status: 'error',
            title: '请联系管理员'
          });
        }
        if (isLicensePay) {
          licenseMutation.mutate({
            orderID: data.orderID,
            clusterId: clusterDetail.clusterId,
            cpu,
            memory,
            months
          });
        } else {
          clusterMutation.mutate({
            orderID: data.orderID,
            type: ClusterType.ScaledStandard,
            cpu,
            memory,
            months,
            systemId
          });
        }
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
    const { stripeState, tab } = router.query;
    const orderID = paymentData?.orderId;
    const clusterId = paymentData?.clusterId;
    console.log(stripeState, orderID, clusterId, tab, isLicensePay, paymentData);

    const clearQuery = () => {
      isLicensePay
        ? router.replace({
            pathname: '/cluster',
            query: { tab }
          })
        : router.replace({
            pathname: '/pricing',
            query: { tab }
          });
    };

    if (stripeState === 'success') {
      toast({
        status: 'success',
        title: '正在检查支付结果，请耐心等待。',
        isClosable: true,
        position: 'top'
      });
      clusterId ? getCluster(clusterId as string) : '';
      setComplete(2);
      setOrderID(orderID as string);
      clearQuery();
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
      clearQuery();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal isOpen={isOpen} onClose={onClosePayment}>
      <ModalOverlay />
      <ModalContent
        borderRadius={'12px'}
        maxW={'735px'}
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
                {isLicensePay ? '购买 License' : '新建集群'}
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
            <ModalHeader
              height={'56px'}
              borderTopRadius={'12px'}
              fontSize={'18px'}
              fontWeight={500}
              bg={'#FBFBFC'}
              py={'14px'}
              borderBottom={'1px solid #F4F4F7'}
            >
              {isLicensePay ? '购买 License' : '新建集群'}
            </ModalHeader>
            <Box px={'20px'} pb="45px">
              <BillingMeter
                price={price}
                formHook={formHook}
                priceMode={false}
                isPayLicense={isLicensePay}
              />
              <Flex justifyContent={'center'}>
                {price === 0 ? (
                  <Button
                    size="primary"
                    variant="primary"
                    w="205px"
                    h="auto"
                    py="14px"
                    px="34px"
                    onClick={() => handleSubmit('wechat')}
                  >
                    <AddIcon fill={'white'} />
                    <Text ml="12px"> {isLicensePay ? '购买 License' : '新建集群'}</Text>
                  </Button>
                ) : (
                  <Flex gap={'16px'} width={'426px'} h={'44px'}>
                    {platformEnv?.stripeEnabled && (
                      <Button
                        size="primary"
                        variant="primary"
                        w="full"
                        h="auto"
                        py="14px"
                        px="34px"
                        onClick={() => handleSubmit('stripe')}
                      >
                        <StripeIcon />
                        <Text ml="12px">{t('pay with stripe')}</Text>
                      </Button>
                    )}
                    {platformEnv?.wechatEnabledRecharge && (
                      <Button
                        size="primary"
                        variant="primary"
                        w="full"
                        h="auto"
                        py="14px"
                        px="34px"
                        onClick={() => handleSubmit('wechat')}
                      >
                        <WechatIcon fill={'#33BABB'} />
                        <Text ml="12px">{t('pay with wechat')}</Text>
                      </Button>
                    )}
                  </Flex>
                )}
              </Flex>

              <Flex justifyContent={'center'} align={'center'} mt={'24px'}>
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
              </Flex>
            </Box>
          </>
        )}
      </ModalContent>
    </Modal>
  );
});

export default RechargeComponent;

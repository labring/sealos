import { checkWechatPay, createPayment, handlePaymentResult } from '@/api/payment';
import { getSystemEnv, uploadConvertData } from '@/api/system';
import { StripeIcon, WechatIcon } from '@/components/Icon';
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
  Text,
  useDisclosure,
  useToast
} from '@chakra-ui/react';
import { loadStripe } from '@stripe/stripe-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import WechatPayment from '@/components/WechatPayment';
import { createLicense } from '@/api/license';
import usePaymentDataStore from '@/stores/payment';

export default function RechargeComponent() {
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
  const [orderID, setOrderID] = useState('');
  const [wechatPaymentData, setWechatPaymentData] = useState<WechatPaymentData>();
  const { data: platformEnv } = useQuery(['getPlatformEnv'], getSystemEnv);
  // 用于避免微信支付，窗口关闭后感知不到的问题
  const { paymentData, setPaymentData, deletePaymentData, isExpired } = usePaymentDataStore();

  const onClosePayment = useCallback(() => {
    setOrderID('');
    setComplete(0);
    onClose();
  }, [onClose]);

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
    if (type === 'wechat') {
      onOpen();
    }
    setComplete(1);
    paymentMutation.mutate();
  };

  const paymentMutation = useMutation(
    () =>
      createPayment({
        amount: deFormatMoney(selectAmount).toString(),
        payMethod: payType,
        currency: 'CNY',
        stripeCallBackUrl: '/license'
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
    ({ orderID }: { orderID: string }) => createLicense({ orderID }),
    {
      onSuccess(data) {
        console.log(data, 'licenseMutation');
        onClosePayment();
        toast({
          status: 'success',
          title: t('License issued successfully'),
          isClosable: true,
          position: 'top'
        });
        queryClient.invalidateQueries(['getLicenseActive']);
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
        licenseMutation.mutate({ orderID: data.orderID });
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
        toast({
          status: 'success',
          title: t('Payment Successful'), // 这里改为license 签发成功
          isClosable: true,
          duration: 9000,
          position: 'top'
        });
        queryClient.invalidateQueries(['getLicenseActive']);
        deletePaymentData();
      }
    }
  });

  useEffect(() => {
    const { stripeState, orderID } = router.query;
    const clearQuery = () => {
      router.replace({
        pathname: '/license',
        query: null
      });
    };
    if (stripeState === 'success') {
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

  return (
    <Flex
      flex={1}
      flexDirection="column"
      alignItems="center"
      pt="64px"
      pb="40px"
      px={{
        base: '56px',
        xl: '130px'
      }}
    >
      <Text alignSelf={'start'} color="#262A32" fontSize={'28px'} fontWeight={600}>
        {t('Purchase License')}
      </Text>
      <Text mt={'60px'} alignSelf={'start'} color="#7B838B" fontWeight={'normal'} mb={'16px'}>
        {t('Select Amount')}
      </Text>
      <BonusBox />
      <Flex alignSelf={'flex-start'} align={'center'} mt={'46px'}>
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
      <Flex gap={'16px'} width={'full'} mt="36px">
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
      <Modal isOpen={isOpen} onClose={onClosePayment} closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>充值金额</ModalHeader>
          <ModalCloseButton />
          <WechatPayment
            complete={complete}
            codeURL={wechatPaymentData?.codeURL}
            tradeNO={wechatPaymentData?.tradeNO}
          />
        </ModalContent>
      </Modal>
    </Flex>
  );
}

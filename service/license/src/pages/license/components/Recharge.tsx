import { createLicenseRecord } from '@/api/license';
import { getSystemEnv } from '@/api/system';
import { StripeIcon, WechatIcon } from '@/components/icons';
import useBonusBox from '@/hooks/useBonusBox';
import { LicensePayload, StripePaymentData } from '@/types';
import { deFormatMoney } from '@/utils/format';
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useState } from 'react';
import WechatPayment from './WechatPayment';
import { createPayment, getPaymentResult } from '@/api/payment';
import { loadStripe } from '@stripe/stripe-js';

export default function RechargeComponent() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isAgree, setIsAgree] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const { BonusBox, selectAmount } = useBonusBox();
  const { isOpen, onOpen, onClose } = useDisclosure();
  // 整个流程跑通需要状态管理, 0 初始态， 1 创建支付单， 2 支付中, 3 支付成功
  const [complete, setComplete] = useState<0 | 1 | 2 | 3>(0);
  // 0 是微信，1 是stripe
  const [payType, setPayType] = useState<'wechat' | 'stripe'>('wechat');
  const [paymentName, setPaymentName] = useState('');
  const toast = useToast({ position: 'top', duration: 2000 });
  const { data: platformEnv } = useQuery(['getPlatformEnv'], getSystemEnv);

  console.log(selectAmount, '11111');

  const onModalClose = () => {
    setComplete(0);
    onClose();
  };

  const handleStripeConfirm = () => {
    setPayType('stripe');
    if (selectAmount < 10) {
      return toast({
        status: 'error',
        title: t('Pay Minimum Tips')
      });
    }
    setComplete(1);
    paymentMutation.mutate();
  };

  const handleWechatConfirm = () => {
    if (isAgree) {
      setComplete(1);
      paymentMutation.mutate();
      onOpen();
    } else {
      toast({
        status: 'error',
        title: t('Please read and agree to the agreement'),
        isClosable: true,
        position: 'top'
      });
    }
  };

  const paymentMutation = useMutation(
    () =>
      createPayment({
        amount: deFormatMoney(selectAmount).toString(),
        payMethod: payType,
        currency: 'CNY'
      }),
    {
      async onSuccess(data) {
        console.log(data, '=======');
        if (payType === 'stripe' && platformEnv?.stripePub && data?.sessionID) {
          const stripe = await loadStripe(platformEnv?.stripePub);
          stripe?.redirectToCheckout({
            sessionId: data.sessionID
          });
        } else if (payType === 'wechat') {
        }
        // setPaymentName((data?.paymentName as string).trim());
        setComplete(2);
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

  const licenseRecordMutation = useMutation(
    (payload: LicensePayload) => createLicenseRecord(payload),
    {
      onSuccess(data) {
        console.log(data);
        queryClient.invalidateQueries(['getLicenseActive']);
      },
      onError(err: any) {
        console.log(err);
      }
    }
  );

  const { data } = useQuery(
    ['getLicenseResult', paymentName],
    () => getPaymentResult({ orderID }),
    {
      refetchInterval: complete === 2 ? 1000 : false,
      enabled: complete === 2 && !!paymentName,
      cacheTime: 0,
      staleTime: 0,
      onSuccess(data) {
        console.log(data);
        if (data?.status === 'Completed') {
          onModalClose();
          toast({
            status: 'success',
            title: t('Payment Successful'),
            isClosable: true,
            position: 'top'
          });
          // licenseRecordMutation.mutate({
          //   uid: '',
          //   amount: deFormatMoney(selectAmount),
          //   quota: selectAmount,
          //   token: data?.token,
          //   orderID: data?.tradeNO,
          //   paymentMethod: 'wechat'
          // });
        }
      }
    }
  );

  return (
    <Flex
      flex={1}
      flexDirection="column"
      // justifyContent="center"
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
            onClick={() => handleStripeConfirm()}
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
            onClick={() => handleWechatConfirm()}
          >
            <WechatIcon fill={'#33BABB'} />
            <Text ml="12px">{t('pay with wechat')}</Text>
          </Button>
        )}
      </Flex>
      <Modal isOpen={isOpen} onClose={onModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>充值金额</ModalHeader>
          <ModalCloseButton />
          <WechatPayment complete={complete} codeURL={data?.codeURL} tradeNO={data?.tradeNO} />
        </ModalContent>
      </Modal>
    </Flex>
  );
}

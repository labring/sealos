import useBonusBox from '@/hooks/useBonusBox';
import { useCustomToast } from '@/hooks/useCustomToast';
import request from '@/services/request';
import { ApiResp, LicensePayStatus, LicensePayload, Payment, SystemEnv } from '@/types';
import { deFormatMoney } from '@/utils/format';
import {
  Button,
  Checkbox,
  Flex,
  Image,
  Link,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import WechatPayment from './WechatPayment';

export default function RechargeComponent() {
  const { t } = useTranslation();
  const [isAgree, setIsAgree] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const { BonusBox, selectAmount } = useBonusBox();
  const { isOpen, onOpen, onClose } = useDisclosure();
  // 整个流程跑通需要状态管理, 0 初始态， 1 创建支付单， 2 支付中, 3 支付成功
  const [complete, setComplete] = useState<0 | 1 | 2 | 3>(0);
  // 0 是微信，1 是stripe
  const [payType, setPayType] = useState<'wechat' | 'stripe'>('wechat');
  const [paymentName, setPaymentName] = useState('');
  const queryClient = useQueryClient();
  const { toast } = useCustomToast();
  const { query } = useRouter();
  const [hid, setHid] = useState(''); // license key

  // handle hid
  useEffect(() => {
    if (query?.hid && typeof query.hid === 'string') {
      const decodedHid = decodeURIComponent(query.hid);
      setHid(decodedHid);
    } else {
      toast({
        status: 'error',
        title: 'Purchase Link Error',
        isClosable: true,
        position: 'top'
      });
    }
  }, []);

  const onModalClose = () => {
    setComplete(0);
    onClose();
  };

  const handleWechatConfirm = () => {
    if (isAgree) {
      setComplete(1);
      createPaymentLicense.mutate();
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

  const { data: platformEnv } = useQuery(['getPlatformEnv'], () =>
    request<any, ApiResp<SystemEnv>>('/api/platform/getEnv')
  );

  const createPaymentLicense = useMutation(
    () =>
      request.post<any, ApiResp<Payment>>('/api/license/pay', {
        amount: deFormatMoney(selectAmount), //weixin
        quota: selectAmount,
        paymentMethod: payType,
        hid: hid
      }),
    {
      onSuccess(data) {
        console.log(data);
        setPaymentName((data?.data?.paymentName as string).trim());
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

  const createLicenseRecord = useMutation(
    (payload: LicensePayload) =>
      request.post<any, ApiResp>('/api/license/createLicenseRecord', payload),
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
    () =>
      request<any, ApiResp<LicensePayStatus>>('/api/license/result', {
        params: {
          paymentName: paymentName
        }
      }),
    {
      refetchInterval: complete === 2 ? 1000 : false,
      enabled: complete === 2 && !!paymentName,
      cacheTime: 0,
      staleTime: 0,
      onSuccess(data) {
        if (data?.data?.status === 'Completed') {
          onModalClose();
          toast({
            status: 'success',
            title: t('Payment Successful'),
            isClosable: true,
            position: 'top'
          });
          createLicenseRecord.mutate({
            uid: '',
            amount: deFormatMoney(selectAmount),
            quota: selectAmount,
            token: data.data?.token,
            orderID: data?.data?.tradeNO,
            paymentMethod: 'wechat'
          });
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
            href={platformEnv?.data?.service_protocol}
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
            href={platformEnv?.data?.private_protocol}
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
        {/* {platformEnv?.data?.stripeEnabled && (
          <Button size="primary" variant="primary" mt="20px" w="full" h="auto" py="14px" px="34px">
            <Image alt="stripe" src="icons/stripe.svg" w="24px" h="24px" />
            <Text ml="12px">{t('pay with stripe')}</Text>
          </Button>
        )} */}

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
          <Image alt="weixin" src="icons/wechat.svg" w="24px" h="24px" />
          <Text ml="12px">{t('pay with wechat')}</Text>
        </Button>
      </Flex>
      <Modal isOpen={isOpen} onClose={onModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>充值金额</ModalHeader>
          <ModalCloseButton />

          <WechatPayment
            complete={complete}
            codeURL={data?.data?.codeURL}
            tradeNO={data?.data?.tradeNO}
          />
        </ModalContent>
      </Modal>
    </Flex>
  );
}

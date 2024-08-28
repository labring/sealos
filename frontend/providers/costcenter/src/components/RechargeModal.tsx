import vector from '@/assert/Vector.svg';
import stripe_icon from '@/assert/bi_stripe.svg';
import wechat_icon from '@/assert/ic_baseline-wechat.svg';
import { default as CurrencySymbol, default as Currencysymbol } from '@/components/CurrencySymbol';
import OuterLink from '@/components/outerLink';
import { useCustomToast } from '@/hooks/useCustomToast';
import useEnvStore from '@/stores/env';
import { ApiResp } from '@/types/api';
import { Pay, Payment } from '@/types/payment';
import { getFavorable } from '@/utils/favorable';
import { deFormatMoney, formatMoney } from '@/utils/format';
import {
  Box,
  Button,
  Flex,
  Img,
  Modal,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  SimpleGrid,
  Spinner,
  Text,
  useDisclosure
} from '@chakra-ui/react';
import { Stripe } from '@stripe/stripe-js';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { AxiosInstance } from 'axios';
import { useTranslation } from 'next-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
const StripeForm = (props: {
  tradeNO?: string;
  complete: number;
  stripePromise: Promise<Stripe | null>;
}) => {
  const stripePromise = props.stripePromise;
  const sessionId = props.tradeNO;
  const complete = props.complete;
  useEffect(() => {
    if (stripePromise && sessionId)
      (async () => {
        try {
          const res1 = await stripePromise;
          if (!res1) return;
          if (complete !== 2) return;
          await res1.redirectToCheckout({
            sessionId
          });
        } catch (e) {
          console.error(e);
        }
      })();
  }, [sessionId, stripePromise, complete]);
  return (
    <Flex w={'100%'} flex={1} align={'center'} justify={'center'}>
      <Spinner size={'xl'} />
    </Flex>
  );
};

function WechatPayment(props: { complete: number; codeURL?: string; tradeNO?: string }) {
  const { t } = useTranslation();
  return (
    <Flex
      flexDirection="column"
      px="37px"
      justify={'center'}
      align={'center'}
      mt={'135px'}
      display={'flex'}
      justifyContent={'center'}
      alignItems={'center'}
      position={'relative'}
    >
      <Flex
        width={'267px'}
        height={'295px'}
        direction={'column'}
        align="center"
        justify={'space-between'}
      >
        <Text color="#7B838B" mb="8px" textAlign="center">
          {t('Scan with WeChat')}
        </Text>
        {props.complete === 2 && !!props.codeURL ? (
          <QRCodeSVG
            size={185}
            value={props.codeURL}
            style={{ margin: '0 auto' }}
            imageSettings={{
              // 二维码中间的logo图片
              src: wechat_icon.src,
              height: 40,
              width: 40,
              excavate: true // 中间图片所在的位置是否镂空
            }}
          />
        ) : (
          <Box>waiting...</Box>
        )}
        <Box mt="8px">
          <Text color="#717D8A" fontSize="12px" fontWeight="normal">
            {t('Order Number')}： {props.tradeNO || ''}
          </Text>
          <Text color="#717D8A" fontSize="12px">
            {t('Payment Result')}:{props.complete === 3 ? t('Payment Successful') : t('In Payment')}
          </Text>
        </Box>
      </Flex>
    </Flex>
  );
}
const BonusBox = (props: {
  onClick: () => void;
  selected: boolean;
  bouns: number;
  amount: number;
}) => {
  const { t } = useTranslation();
  const currency = useEnvStore((s) => s.currency);
  return (
    <Flex
      width="140px"
      height="92px"
      justify={'center'}
      align={'center'}
      border="1.5px solid"
      {...(props.selected
        ? {
            color: 'brightBlue.600',
            borderColor: 'brightBlue.500'
          }
        : {
            borderColor: '#EFF0F1'
          })}
      bg={'grayModern.100'}
      borderRadius="4px"
      position={'relative'}
      flexGrow="0"
      cursor={'pointer'}
      onClick={(e) => {
        e.preventDefault();
        props.onClick();
      }}
    >
      <Flex
        position={'absolute'}
        minW={'max-content'}
        left="78px"
        top="4px"
        px={'13.5px'}
        py={'2.5px'}
        color={'purple.600'}
        background="purple.100"
        alignItems={'center'}
        borderRadius="10px 10px 10px 0px"
        zIndex={'99'}
        fontStyle="normal"
        fontWeight="500"
        fontSize="12px"
      >
        <Text mr="4px">{t('Bonus')}</Text>
        <CurrencySymbol boxSize={'10px'} mr={'2px'} />
        <Text> {props.bouns}</Text>
      </Flex>
      <Flex align={'center'}>
        <Currencysymbol boxSize="20px" type={currency} />
        <Text ml="4px" fontStyle="normal" fontWeight="500" fontSize="24px">
          {props.amount}
        </Text>
      </Flex>
    </Flex>
  );
};
const RechargeModal = forwardRef(
  (
    props: {
      onPaySuccess?: () => void;
      onPayError?: () => void;
      onCreatedSuccess?: () => void;
      onCreatedError?: () => void;
      onCancel?: () => void;
      balance: number;
      stripePromise: Promise<Stripe | null>;
      request: AxiosInstance;
    },
    ref
  ) => {
    const balance = props.balance || 0;
    const { t } = useTranslation();
    const { isOpen, onOpen, onClose: _onClose } = useDisclosure();
    const request = props.request;
    useImperativeHandle(
      ref,
      () => ({
        onOpen: () => {
          onOpen();
        },
        onClose: () => {
          onClose();
        }
      }),
      []
    );

    const [step, setStep] = useState(1);

    // 整个流程跑通需要状态管理, 0 初始态， 1 创建支付单， 2 支付中, 3 支付成功
    const [complete, setComplete] = useState<0 | 1 | 2 | 3>(0);
    // 0 是微信，1 是stripe
    const [payType, setPayType] = useState<'wechat' | 'stripe'>('wechat');
    // 计费详情
    const [detail, setDetail] = useState(false);
    const [paymentName, setPaymentName] = useState('');
    const [selectAmount, setSelectAmount] = useState(0);
    const createPaymentRes = useMutation(
      () =>
        request.post<any, ApiResp<Payment>>('/api/account/payment', {
          amount: deFormatMoney(amount),
          paymentMethod: payType
        }),
      {
        onSuccess(data) {
          setPaymentName((data?.data?.paymentName as string).trim());
          props.onCreatedSuccess?.();
          setComplete(2);
        },
        onError(err: any) {
          toast({
            status: 'error',
            title: err?.message || '',
            isClosable: true,
            position: 'top'
          });
          props.onCreatedError?.();
          setComplete(0);
        }
      }
    );

    const { data, isPreviousData } = useQuery(
      ['query-charge-res', { id: paymentName }],
      () =>
        request<any, ApiResp<Pay>>('/api/account/payment/pay', {
          params: {
            id: paymentName
          }
        }),
      {
        refetchInterval: complete === 2 ? 1000 : false,
        enabled: complete === 2,
        cacheTime: 0,
        staleTime: 0,
        onSuccess(data) {
          setTimeout(() => {
            if ((data?.data?.status || '').toUpperCase() === 'SUCCESS') {
              createPaymentRes.reset();
              setComplete(3);
              props.onPaySuccess?.();
              onClose();
              setComplete(0);
            }
          }, 3000);
        }
      }
    );
    const cancalPay = useCallback(() => {
      createPaymentRes.reset();
      props.onCancel?.();
      setComplete(0);
    }, [createPaymentRes]);

    const onClose = () => {
      setDetail(false);
      cancalPay();
      _onClose();
    };

    const { toast } = useCustomToast();
    const { data: bonuses, isSuccess } = useQuery(
      ['bonus'],
      () =>
        request.get<
          any,
          ApiResp<{
            steps: number[];
            ratios: number[];
            specialDiscount: [number, number][];
          }>
        >('/api/price/bonus'),
      {}
    );
    const ratios = bonuses?.data?.ratios || [];
    const steps = bonuses?.data?.steps || [];
    const specialBonus = bonuses?.data?.specialDiscount;
    const [amount, setAmount] = useState(() => 0);
    const getBonus = useCallback(
      (amount: number) => {
        if (isSuccess && ratios && steps && ratios.length === steps.length)
          return getFavorable(steps, ratios, specialBonus)(amount);
        else return 0;
      },
      [isSuccess, ratios, steps, specialBonus]
    );
    const { stripeEnabled, wechatEnabled } = useEnvStore();
    useEffect(() => {
      if (steps && steps.length > 0) {
        setAmount(steps[0]);
      }
    }, [steps]);
    const handleWechatConfirm = () => {
      setPayType('wechat');
      setComplete(1);
      createPaymentRes.mutate();
    };

    const handleStripeConfirm = () => {
      setPayType('stripe');
      if (amount < 10) {
        toast({
          status: 'error',
          title: t('Pay Minimum Tips')
        });
        // 校检，stripe有最低费用的要求
        return;
      }
      setComplete(1);
      createPaymentRes.mutate();
    };
    const currency = useEnvStore((s) => s.currency);
    return (
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent maxW="530px" minH={'495'} display={'flex'} flexDir={'column'}>
          {!detail ? (
            complete === 0 ? (
              <>
                <ModalHeader
                  px={'20px'}
                  py={'12px'}
                  pb={'18px'}
                  bg={'grayModern.25'}
                  borderBottom={'1px solid'}
                  fontWeight={500}
                  fontSize={'16px'}
                  borderColor={'grayModern.100'}
                >
                  {t('Recharge Amount')}
                </ModalHeader>
                <ModalCloseButton top={'8px'} right={'18px'} />
                <Flex
                  pointerEvents={complete === 0 ? 'auto' : 'none'}
                  pt="24px"
                  mt={'0'}
                  pb="28px"
                  w="full"
                  px={'36px'}
                  flexDirection="column"
                  justifyContent="center"
                  alignItems="center"
                >
                  <Flex align={'center'} alignSelf={'flex-start'} mb={'20px'}>
                    <Text color="grayModern.600" fontWeight={'normal'} mr={'20px'}>
                      {t('Balance')}
                    </Text>
                    <Currencysymbol boxSize="20px" type={currency} />
                    <Text ml="4px" color="#24282C" fontSize="24px" fontWeight={'medium'}>
                      {formatMoney(balance).toFixed(2)}
                    </Text>
                  </Flex>
                  <Flex direction={'column'} mb={'20px'}>
                    <Text color="grayModern.600" fontWeight={'normal'} mb={'16px'}>
                      {t('Select Amount')}
                    </Text>
                    <Flex wrap={'wrap'} gap={'16px'}>
                      {steps.map((amount, index) => (
                        <BonusBox
                          key={index}
                          amount={amount}
                          bouns={getBonus(amount)}
                          onClick={() => {
                            setSelectAmount(index);
                            setAmount(amount);
                          }}
                          selected={selectAmount === index}
                        />
                      ))}
                    </Flex>
                  </Flex>
                  <Flex alignSelf={'flex-start'} align={'center'}>
                    <Text color="grayModern.600" mr={'28px'}>
                      {t('Recharge Amount')}
                    </Text>
                    <NumberInput
                      defaultValue={15}
                      clampValueOnBlur={false}
                      min={0}
                      step={step}
                      // mt="8px"
                      w="215px"
                      h="42px"
                      boxSizing="border-box"
                      background="grayModern.50"
                      px={'12px'}
                      border="1px solid"
                      borderColor={'grayModern.200'}
                      borderRadius="8px"
                      alignItems="center"
                      display={'flex'}
                      value={amount}
                      variant={'unstyled'}
                      onChange={(str, v) => (str.trim() ? setAmount(v) : setAmount(0))}
                    >
                      <NumberInputField color={'grayModern.900'} />
                      <Currencysymbol boxSize="14px" mr={'32px'} type={currency} />

                      <NumberInputStepper borderColor={'grayModern.200'}>
                        <NumberIncrementStepper width={'24px'} borderColor={'grayModern.200'}>
                          <Img src={vector.src}></Img>
                        </NumberIncrementStepper>
                        <NumberDecrementStepper w="24px" borderColor={'grayModern.200'}>
                          <Img src={vector.src} transform={'rotate(180deg)'}></Img>
                        </NumberDecrementStepper>
                      </NumberInputStepper>
                    </NumberInput>
                    <Text
                      py={'1px'}
                      px="7px"
                      ml={'10px'}
                      color={'purple.600'}
                      background="purple.100"
                      borderRadius="6px 6px 6px 0px;"
                      fontStyle="normal"
                      fontWeight="500"
                      fontSize="12px"
                      mr="4px"
                    >
                      {t('Bonus')} {getBonus(amount)}
                    </Text>
                    <CurrencySymbol boxSize={'10px'} />
                  </Flex>
                  <Flex
                    alignSelf={'flex-start'}
                    align={'center'}
                    mt={'24px'}
                    onClick={() => setDetail(true)}
                  >
                    <OuterLink text={t('View Discount Rules')}></OuterLink>
                  </Flex>
                  <Flex gap={'16px'} width={'full'} mt={'24px'}>
                    {stripeEnabled && (
                      <Button
                        variant="solid"
                        w="full"
                        h="auto"
                        py="14px"
                        px="34px"
                        onClick={() => {
                          handleStripeConfirm();
                        }}
                      >
                        <Img src={stripe_icon.src} mr="8px" w="24px" h="24px" />
                        <Text fontSize={'14px'} fontWeight={500}>
                          {t('pay with stripe')}
                        </Text>
                      </Button>
                    )}
                    {wechatEnabled && (
                      <Button
                        // size="primary"
                        variant="solid"
                        // bgColor={'grayModern.900'}
                        // color={'white'}
                        w="full"
                        h="auto"
                        py="14px"
                        px="34px"
                        onClick={() => handleWechatConfirm()}
                      >
                        <Img src={wechat_icon.src} mr="8px" w="24px" h="24px" fill={'teal.400'} />
                        <Text fontSize={'14px'} fontWeight={500}>
                          {t('pay with wechat')}
                        </Text>
                      </Button>
                    )}
                  </Flex>
                </Flex>
              </>
            ) : (
              <>
                <ModalHeader
                  m={'24px'}
                  p={'0'}
                  position={'absolute'}
                  display={'flex'}
                  alignItems={'center'}
                  height={'33px'}
                >
                  <Img
                    src={vector.src}
                    w={'20px'}
                    transform={'rotate(-90deg)'}
                    h={'20px'}
                    mr={'16px'}
                    display={'inline-block'}
                    verticalAlign={'middle'}
                    cursor={'pointer'}
                    onClick={() => {
                      cancalPay();
                    }}
                  ></Img>
                  <Text>{t('Recharge Amount')}</Text>
                </ModalHeader>
                <ModalCloseButton top={'24px'} right={'24px'} />
                {payType === 'wechat' ? (
                  <WechatPayment
                    complete={complete}
                    codeURL={!isPreviousData ? data?.data?.codeURL : undefined}
                    tradeNO={!isPreviousData ? data?.data?.tradeNO : undefined}
                  />
                ) : (
                  <StripeForm
                    tradeNO={!isPreviousData ? data?.data?.tradeNO : undefined}
                    complete={complete}
                    stripePromise={props.stripePromise}
                  />
                )}
              </>
            )
          ) : (
            <>
              <ModalHeader
                py={'12px'}
                px={'20px'}
                bg={'grayModern.25'}
                borderBottom={'1px solid'}
                fontWeight={500}
                fontSize={'16px'}
                borderColor={'grayModern.100'}
              >
                <Text>{t('preferential_rules')}</Text>
              </ModalHeader>
              <ModalCloseButton top={'8px'} right={'18px'} />
              <Flex
                flexDirection="column"
                justify={'center'}
                align={'center'}
                px={'36px'}
                py={'24px'}
                display={'flex'}
                justifyContent={'center'}
                alignItems={'center'}
                position={'relative'}
              >
                <SimpleGrid columns={2} rowGap={'13px'}>
                  <Box bgColor={'grayModern.100'} color={'grayModern.600'} px={'24px'} py={'14px'}>
                    {t('Recharge Amount')}
                  </Box>
                  <Box bgColor={'grayModern.100'} px={'24px'} py={'14px'} color={'grayModern.600'}>
                    {t('preferential_strength')}
                  </Box>
                  {steps &&
                    ratios &&
                    steps.length === ratios.length &&
                    steps.map((step, idx) => (
                      <>
                        <Text key={idx} px={'24px'} color={'grayModern.900'}>
                          {step + '<='}
                          {t('Recharge Amount')}
                          {idx < steps.length - 1 ? `< ${steps[idx + 1]}` : ''}
                        </Text>
                        <Text px={'24px'} color={'grayModern.900'}>
                          {t('Bonus')}
                          {ratios[idx].toFixed(2)}%
                        </Text>
                      </>
                    ))}
                  {specialBonus &&
                    specialBonus.map(([k, v], i) => (
                      <>
                        <Text key={i} px={'24px'} color={'grayModern.900'}>
                          {k + '='} {t('Recharge Amount')}{' '}
                        </Text>
                        <Text px={'24px'} color={'grayModern.900'}>
                          {t('Bonus')} {v}
                        </Text>
                      </>
                    ))}
                </SimpleGrid>
              </Flex>
            </>
          )}
        </ModalContent>
      </Modal>
    );
  }
);

RechargeModal.displayName = 'RechargeModal';

export default RechargeModal;

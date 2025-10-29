import vector from '@/assert/Vector.svg';
import stripe_icon from '@/assert/bi_stripe.svg';
import wechat_icon from '@/assert/ic_baseline-wechat.svg';
import alipay_icon from '@/assert/ic_baseline-alipay.svg';
import CurrencySymbol from '@/components/CurrencySymbol';
import { useCustomToast } from '@/hooks/useCustomToast';
import useEnvStore from '@/stores/env';
import useSessionStore from '@/stores/session';
import { ApiResp } from '@/types/api';
import { Pay, Payment } from '@/types/payment';
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
import { isNumber } from 'lodash';
import { useTranslation } from 'next-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import useRechargeStore from '@/stores/recharge';
import { gtmOpenTopup, gtmTopupCheckout } from '@/utils/gtm';
import { Minus, Plus, Loader } from 'lucide-react';

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
      display={'flex'}
      justifyContent={'center'}
      alignItems={'center'}
      position={'relative'}
    >
      <Flex
        height={'295px'}
        direction={'column'}
        align="center"
        justify={'space-between'}
        pt={'24px'}
      >
        <p className="text-lg font-semibold mb-2 text-center">{t('common:scan_with_wechat')}</p>
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
            {t('common:order_number')}： {props.tradeNO || ''}
          </Text>
          <p className="mt-3 text-blue-600 text-sm font-medium flex gap-0.5 items-center justify-center">
            {props.complete !== 3 ? (
              <span className="animate-spin">
                <Loader size={14} />
              </span>
            ) : null}
            <span>
              {props.complete === 3 ? t('common:payment_successful') : t('common:in_payment')}
            </span>
          </p>
        </Box>
      </Flex>
    </Flex>
  );
}
function AlipayPayment(props: { complete: number; codeURL?: string; tradeNO?: string }) {
  const { t } = useTranslation();
  return (
    <Flex
      flexDirection="column"
      px="37px"
      justify={'center'}
      align={'center'}
      m={'auto'}
      display={'flex'}
      justifyContent={'center'}
      alignItems={'center'}
      position={'relative'}
    >
      <Flex height={'295px'} direction={'column'} align="center" justify={'space-between'}>
        <p className="text-lg font-semibold mb-2 text-center">{t('common:scan_with_alipay')}</p>
        {props.complete === 2 && !!props.codeURL ? (
          <QRCodeSVG
            size={185}
            value={props.codeURL}
            style={{ margin: '0 auto' }}
            imageSettings={{
              // 二维码中间的logo图片
              src: alipay_icon.src,
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
            {t('common:order_number')}： {props.tradeNO || ''}
          </Text>
          <p className="mt-3 text-blue-600 text-sm font-medium flex gap-0.5 items-center justify-center">
            {props.complete !== 3 ? (
              <span className="animate-spin">
                <Loader size={14} />
              </span>
            ) : null}
            <span>
              {props.complete === 3 ? t('common:payment_successful') : t('common:in_payment')}
            </span>
          </p>
        </Box>
      </Flex>
    </Flex>
  );
}
const BonusBox = (props: { onClick: () => void; selected: boolean; amount: number }) => {
  return (
    <Flex
      width="100%"
      height="72px"
      justify={'start'}
      align={'center'}
      padding={'calc(var(--spacing) * 4)'}
      border="1.5px solid"
      {...(props.selected
        ? {
            color: 'var(--color-zinc-900)',
            borderColor: 'var(--color-zinc-900)',
            bg: 'var(--color-zinc-50)'
          }
        : {
            borderColor: 'var(--color-zinc-200)',
            bg: 'var(--color-white)'
          })}
      borderRadius="12px"
      position={'relative'}
      cursor={'pointer'}
      onClick={(e) => {
        e.preventDefault();
        props.onClick();
      }}
    >
      <div className="flex gap-1 items-center font-medium">
        <CurrencySymbol />
        <span>{props.amount}</span>
      </div>
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
          gtmOpenTopup();
          onOpen();
        },
        onClose: () => {
          resetProcess();
          onClose();
        }
      }),
      []
    );

    const [step, setStep] = useState(1);

    // 整个流程跑通需要状态管理, 0 初始态， 1 创建支付单， 2 支付中, 3 支付成功
    const [complete, setComplete] = useState<0 | 1 | 2 | 3>(0);
    // 0 是微信，1 是stripe, 2 是支付宝
    const [payType, setPayType] = useState<'wechat' | 'stripe' | 'alipay'>('wechat');
    // 计费详情
    const [detail, setDetail] = useState(false);
    const [paymentName, setPaymentName] = useState('');
    const [selectAmount, setSelectAmount] = useState(0);

    const { session } = useSessionStore();
    const { toast } = useCustomToast();
    const { data: bonuses, isSuccess } = useQuery(
      ['bonus', session.user.id],
      () =>
        request.post<
          any,
          ApiResp<{
            discount: {
              defaultSteps: Record<string, number>;
              firstRechargeDiscount: Record<string, number>;
            };
          }>
        >('/api/price/bonus'),
      {}
    );

    const [defaultSteps, ratios, steps, specialBonus] = useMemo(() => {
      const defaultSteps = Object.entries(bonuses?.data?.discount.defaultSteps || {}).sort(
        (a, b) => +a[0] - +b[0]
      );
      const ratios = defaultSteps.map(([key, value]) => value);
      const steps = defaultSteps.map(([key, value]) => +key);
      const specialBonus = Object.entries(bonuses?.data?.discount.firstRechargeDiscount || {}).sort(
        (a, b) => +a[0] - +b[0]
      );
      const temp: number[] = [];
      specialBonus.forEach(([k, v]) => {
        const step = +k;
        if (steps.findIndex((v) => step === v) === -1) {
          temp.push(+k);
        }
      });
      steps.unshift(...temp);
      ratios.unshift(...temp.map(() => 0));
      return [defaultSteps, ratios, steps, specialBonus];
    }, [bonuses?.data?.discount.defaultSteps, bonuses?.data?.discount.firstRechargeDiscount]);
    const [amount, setAmount] = useState(() => 16);
    const getBonus = (amount: number) => {
      let ratio = 0;
      let specialIdx = specialBonus.findIndex(([k]) => +k === amount);
      // if (specialIdx >= 0) return Math.floor((amount * specialBonus[specialIdx][1]) / 100);
      if (specialIdx >= 0) return Math.floor(specialBonus[specialIdx][1]);
      const step = [...steps].reverse().findIndex((step) => amount >= step);
      if (ratios.length > step && step > -1) ratio = [...ratios].reverse()[step];
      // return Math.floor((amount * ratio) / 100);
      return ratio;
    };
    const { isProcess, setRechargeStatus, resetProcess } = useRechargeStore();
    const { stripeEnabled, wechatEnabled, alipayEnabled } = useEnvStore();
    const createPaymentRes = useMutation(
      () =>
        request.post<any, ApiResp<Payment>>('/api/account/payment', {
          amount: deFormatMoney(amount),
          paymentMethod: payType
        }),
      {
        onSuccess(data) {
          setRechargeStatus({
            paid: amount,
            amount: getBonus(amount) + amount
          });
          gtmTopupCheckout({
            amount
          });
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
    useEffect(() => {
      if (steps && steps.length > 0) {
        const result = steps.map((v, idx) => [v, getBonus(v), idx]).filter(([k, v]) => v > 0);
        if (result.length > 0) {
          const [key, bouns, idx] = result[0];
          setSelectAmount(idx);
          setAmount(key);
        }
      }
    }, [steps]);
    const handleWechatConfirm = () => {
      setPayType('wechat');
      setComplete(1);
      createPaymentRes.mutate();
    };
    const handleAlipayConfirm = () => {
      setPayType('alipay');
      setComplete(1);
      createPaymentRes.mutate();
    };
    const handleStripeConfirm = () => {
      setPayType('stripe');
      if (amount < 10) {
        toast({
          status: 'error',
          title: t('common:pay_minimum_tips')
        });
        // 校检，stripe有最低费用的要求
        return;
      }
      setComplete(1);
      createPaymentRes.mutate();
    };
    const currency = useEnvStore((s) => s.currency);
    useEffect(() => {
      resetProcess();
    }, []);

    return (
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent
          maxW="530px"
          minH={complete === 0 ? 'unset' : '495px'}
          display={'flex'}
          flexDir={'column'}
        >
          {!detail ? (
            complete === 0 ? (
              <>
                <ModalHeader
                  px={'20px'}
                  py={'12px'}
                  bg={'var(--color-white)'}
                  fontWeight={'var(--font-weight-semibold)'}
                  fontSize={'var(--text-lg)'}
                  borderColor={'grayModern.100'}
                >
                  {t('common:credit_purchase')}
                </ModalHeader>
                <ModalCloseButton top={'8px'} right={'18px'} />

                <Flex
                  pointerEvents={complete === 0 ? 'auto' : 'none'}
                  p="24px"
                  mt={'0'}
                  w="full"
                  flexDirection="column"
                  justifyContent="center"
                  alignItems="center"
                >
                  <Flex direction={'column'} mb={'24px'} width={'full'}>
                    <div className="flex flex-col">
                      <section className="w-full bg-plan-payg px-4 py-3 rounded-xl gap-1 flex flex-col h-[88px]">
                        <span className="text-slate-500 text-sm">
                          {t('common:remaining_balance')}
                        </span>
                        <span className="text-2xl font-semibold leading-none flex gap-1 items-center">
                          <CurrencySymbol />
                          <span>{formatMoney(balance).toFixed(2)}</span>
                        </span>
                      </section>

                      <section className="mt-6 mb-2">
                        <div className="flex justify-between">
                          <div className="font-medium">{t('common:select_amount')}</div>
                          {/* {specialBonus && specialBonus.length > 0 && (
                            <div className="text-sm flex gap-1 items-center">
                              <Gift size={16} className="text-blue-600" />
                              <span>{t('common:first_recharge_title')}</span>
                              <MyTooltip
                                px={'12px'}
                                py={'8px'}
                                minW={'unset'}
                                width={'auto'}
                                label={
                                  <Text fontSize={'12px'} fontWeight={400}>
                                    {t('common:first_recharge_tips')}
                                  </Text>
                                }
                              >
                                <CircleHelp size={16} className="text-zinc-400" />
                              </MyTooltip>
                            </div>
                          )} */}
                        </div>
                      </section>
                    </div>

                    <SimpleGrid columns={3} gap={'16px'}>
                      {steps.map((amount, index) => (
                        <BonusBox
                          key={index}
                          amount={amount}
                          onClick={() => {
                            setSelectAmount(index);
                            setAmount(amount);
                          }}
                          selected={selectAmount === index}
                        />
                      ))}
                    </SimpleGrid>
                  </Flex>

                  <div className="flex gap-8 items-center">
                    <div className="font-medium">{t('common:custom_amount')}</div>

                    <NumberInput
                      defaultValue={15}
                      clampValueOnBlur={false}
                      min={0}
                      step={step}
                      value={amount}
                      variant={'unstyled'}
                      bg={'transparent'}
                      className="flex h-10 items-center border hover:border rounded-lg overflow-hidden flex-1"
                      padding={0}
                      _hover={{
                        borderColor: 'var(--border)'
                      }}
                      onChange={(str, v) => {
                        const maxAmount = 10_000_000;
                        if (!str || !isNumber(v) || isNaN(v)) {
                          setAmount(0);
                          return;
                        }
                        if (v > maxAmount) {
                          setAmount(maxAmount);
                          return;
                        }
                        setAmount(v);
                      }}
                    >
                      <NumberInputStepper
                        position={'relative'}
                        border={'unset'}
                        width={'60px'}
                        borderRight={'1px solid var(--border)'}
                      >
                        <NumberDecrementStepper border={'none'}>
                          <Minus size={14} />
                        </NumberDecrementStepper>
                      </NumberInputStepper>

                      <CurrencySymbol className="mx-2" />
                      <NumberInputField bg={'transparent'} />

                      <NumberInputStepper
                        position={'relative'}
                        width={'60px'}
                        borderLeft={'1px solid var(--border)'}
                      >
                        <NumberIncrementStepper border={'none'} borderRadius={'0px'}>
                          <Plus size={14} />
                        </NumberIncrementStepper>
                      </NumberInputStepper>
                    </NumberInput>
                  </div>

                  <Flex gap={'16px'} width={'full'} mt={'24px'}>
                    {stripeEnabled && (
                      <Button
                        variant="solid"
                        w="full"
                        h="auto"
                        py="14px"
                        px="34px"
                        bg={'var(--primary)'}
                        borderRadius={'var(--radius-lg)'}
                        onClick={() => {
                          handleStripeConfirm();
                        }}
                      >
                        <Img src={stripe_icon.src} mr="8px" w="24px" h="24px" />
                        <Text fontSize={'14px'} fontWeight={500}>
                          {t('common:pay_with_stripe')}
                        </Text>
                      </Button>
                    )}
                    {wechatEnabled && (
                      <Button
                        variant="solid"
                        w="full"
                        h="auto"
                        py="14px"
                        px="34px"
                        bg={'var(--primary)'}
                        borderRadius={'var(--radius-lg)'}
                        onClick={() => handleWechatConfirm()}
                      >
                        <Img src={wechat_icon.src} mr="8px" w="24px" h="24px" fill={'teal.400'} />
                        <Text fontSize={'14px'} fontWeight={500}>
                          {t('common:pay_with_wechat')}
                        </Text>
                      </Button>
                    )}
                    {alipayEnabled && (
                      <Button
                        variant="solid"
                        w="full"
                        h="auto"
                        py="14px"
                        px="34px"
                        bg={'var(--primary)'}
                        borderRadius={'var(--radius-lg)'}
                        onClick={() => handleAlipayConfirm()}
                      >
                        <Img src={alipay_icon.src} mr="8px" w="24px" h="24px" fill={'teal.400'} />
                        <Text fontSize={'14px'} fontWeight={500}>
                          {t('common:pay_with_alipay')}
                        </Text>
                      </Button>
                    )}
                  </Flex>
                </Flex>
              </>
            ) : (
              <>
                <ModalHeader
                  px={'20px'}
                  py={'12px'}
                  bg={'var(--color-white)'}
                  fontWeight={'var(--font-weight-semibold)'}
                  fontSize={'var(--text-lg)'}
                  borderColor={'grayModern.100'}
                  borderBottom={'1px solid var(--color-border)'}
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
                  {t('common:recharge_amount')}
                </ModalHeader>
                <ModalCloseButton top={'8px'} right={'18px'} />
                {payType === 'wechat' ? (
                  <WechatPayment
                    complete={complete}
                    codeURL={!isPreviousData ? data?.data?.codeURL : undefined}
                    tradeNO={!isPreviousData ? data?.data?.tradeNO : undefined}
                  />
                ) : payType === 'alipay' ? (
                  <AlipayPayment
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
                bg={'var(--color-white)'}
                fontWeight={'var(--font-weight-semibold)'}
                fontSize={'var(--text-lg)'}
                borderColor={'grayModern.100'}
                borderBottom={'1px solid var(--color-border)'}
              >
                <Text>{t('common:preferential_rules')}</Text>
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
                    {t('common:recharge_amount')}
                  </Box>
                  <Box bgColor={'grayModern.100'} px={'24px'} py={'14px'} color={'grayModern.600'}>
                    {t('common:preferential_strength')}
                  </Box>
                  {steps &&
                    ratios &&
                    steps.length === ratios.length &&
                    steps
                      .map(
                        (step, idx, steps) =>
                          [
                            step,
                            idx < steps.length - 1 ? steps[idx + 1] : undefined,
                            ratios[idx]
                          ] as const
                      )
                      .filter(([step, _2, ratio], idx) => {
                        return (
                          ratio > 0 &&
                          specialBonus.findIndex(([k, v]) => +k === step && v !== 0) === -1
                        );
                      })
                      .map(([pre, next, ratio], idx) => (
                        <>
                          {/* <Text key={idx} pl={'24px'} color={'grayModern.900'}>
                            {pre}
                            {' <= '}
                            {t('common:recharge_amount')}
                            {next ? `< ${next}` : ''}
                          </Text> */}
                          <Text key={idx} pl={'24px'} color={'grayModern.900'}>
                            {pre}
                            {/* = {t('common:recharge_amount')}{' '} */}
                          </Text>
                          <Text px={'24px'} color={'grayModern.900'}>
                            {t('common:bonus')}
                            {ratio.toFixed(2)}
                          </Text>
                        </>
                      ))}
                  {specialBonus &&
                    specialBonus.map(([k, v], i) => (
                      <>
                        <Text key={i} pl={'24px'} color={'grayModern.900'}>
                          {k}
                          {/* = {t('common:recharge_amount')}{' '} */}
                        </Text>
                        <Text pl={'24px'} color={'grayModern.900'}>
                          {t('common:bonus')} {v}
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

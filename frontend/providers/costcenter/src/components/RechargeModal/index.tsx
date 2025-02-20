import vector from '@/assert/Vector.svg';
import alipay_icon from '@/assert/alipay.svg';
import stripe_icon from '@/assert/bi_stripe.svg';
import wechat_icon from '@/assert/ic_baseline-wechat.svg';
import CurrencySymbol from '@/components/CurrencySymbol';
import OuterLink from '@/components/outerLink';
import { RechargePaymentState, RechargePaymentType } from '@/constants/payment';
import { useCustomToast } from '@/hooks/useCustomToast';
import useEnvStore from '@/stores/env';
import useSessionStore from '@/stores/session';
import { ApiResp } from '@/types/api';
import { Pay, Payment, RechargeModalProps, RechargeModalRef } from '@/types/payment';
import { deFormatMoney, formatMoney } from '@/utils/format';
import {
  Box,
  Button,
  ButtonGroup,
  ButtonGroupProps,
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
  Text,
  useDisclosure
} from '@chakra-ui/react';
import { MyTooltip } from '@sealos/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { isNumber } from 'lodash';
import { useTranslation } from 'next-i18next';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import GiftIcon from '../icons/GiftIcon';
import HelpIcon from '../icons/HelpIcon';
import AlipayForm from './AlipayForm';
import BonusBox from './BonusBox';
import StripeForm from './StripeForm';
import WechatPayment from './WechatPayment';

const RechargeModal = forwardRef<RechargeModalRef, RechargeModalProps>((props, ref) => {
  const { t } = useTranslation();
  const { isOpen, onOpen, onClose: _onClose } = useDisclosure();
  const { session } = useSessionStore();
  const { toast } = useCustomToast();
  const { stripeEnabled, wechatEnabled, alipayEnabled, currency } = useEnvStore();
  const enabledPaymentMethodsCount = [stripeEnabled, wechatEnabled, alipayEnabled].filter(
    (x) => !!x
  ).length;
  const paymentButtonVarint: ButtonGroupProps['variant'] =
    enabledPaymentMethodsCount <= 2 ? 'solid' : 'outline';
  const request = props.request;
  const balance = props.balance || 0;
  const [step, setStep] = useState(1);
  const [payType, setPayType] = useState<RechargePaymentType>(RechargePaymentType.Wechat);
  const [detail, setDetail] = useState(false);
  const [paymentName, setPaymentName] = useState('');
  const [selectAmount, setSelectAmount] = useState(0);
  const [amount, setAmount] = useState(0);
  const [recharegPhase, setRecharegPhase] = useState<RechargePaymentState>(
    RechargePaymentState.IDLE
  );
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

  const createPaymentMutation = useMutation(
    () =>
      request.post<any, ApiResp<Payment>>('/api/account/payment', {
        amount: deFormatMoney(amount),
        paymentMethod: payType
      }),
    {
      onSuccess(data) {
        setPaymentName((data?.data?.paymentName as string).trim());
        props.onCreatedSuccess?.();
        setRecharegPhase(RechargePaymentState.PROCESSING);
      },
      onError(err: any) {
        toast({
          status: 'error',
          title: err?.message || '',
          isClosable: true,
          position: 'top'
        });
        props.onCreatedError?.();
        setRecharegPhase(RechargePaymentState.IDLE);
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
      refetchInterval: recharegPhase === RechargePaymentState.PROCESSING ? 1000 : false,
      enabled: recharegPhase === RechargePaymentState.PROCESSING,
      cacheTime: 0,
      staleTime: 0,
      onSuccess(data) {
        setTimeout(() => {
          if ((data?.data?.status || '').toUpperCase() === 'SUCCESS') {
            createPaymentMutation.reset();
            setRecharegPhase(RechargePaymentState.SUCCESS);
            props.onPaySuccess?.();
            onClose();
            setRecharegPhase(RechargePaymentState.IDLE);
          }
        }, 3000);
      }
    }
  );
  const cancalPay = () => {
    createPaymentMutation.reset();
    props.onCancel?.();
    setRecharegPhase(RechargePaymentState.IDLE);
  };
  const onClose = () => {
    setDetail(false);
    cancalPay();
    _onClose();
  };

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
  const getBonus = (amount: number) => {
    let ratio = 0;
    let specialIdx = specialBonus.findIndex(([k]) => +k === amount);
    if (specialIdx >= 0) return Math.floor((amount * specialBonus[specialIdx][1]) / 100);
    const step = [...steps].reverse().findIndex((step) => amount >= step);
    if (ratios.length > step && step > -1) ratio = [...ratios].reverse()[step];
    return Math.floor((amount * ratio) / 100);
  };
  const handleWechatConfirm = () => {
    setPayType(RechargePaymentType.Wechat);
    setRecharegPhase(RechargePaymentState.CREATING);
    createPaymentMutation.mutate();
  };
  const handleStripeConfirm = () => {
    setPayType(RechargePaymentType.Stripe);
    if (amount < 10) {
      toast({
        status: 'error',
        title: t('Pay Minimum Tips')
      });
      // 校检，stripe有最低费用的要求
      return;
    }
    setRecharegPhase(RechargePaymentState.CREATING);
    createPaymentMutation.mutate();
  };
  const handleAlipayConfirm = () => {
    setPayType(RechargePaymentType.Alipay);
    setRecharegPhase(RechargePaymentState.CREATING);
    createPaymentMutation.mutate();
  };
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
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent
        maxW="530px"
        minH={RechargePaymentState.IDLE === recharegPhase ? 'unset' : '495px'}
        display={'flex'}
        flexDir={'column'}
        margin={'auto'}
      >
        {!detail ? (
          RechargePaymentState.IDLE === recharegPhase ? (
            <>
              <ModalHeader
                px={'20px'}
                py={'12px'}
                bg={'grayModern.25'}
                borderBottom={'1px solid'}
                fontWeight={500}
                fontSize={'16px'}
                borderColor={'grayModern.100'}
              >
                {t('credit_purchase')}
              </ModalHeader>
              <ModalCloseButton top={'8px'} right={'18px'} />
              <Flex
                pointerEvents={RechargePaymentState.IDLE === recharegPhase ? 'auto' : 'none'}
                pt="24px"
                mt={'0'}
                pb="28px"
                w="full"
                px={'36px'}
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
              >
                <Flex align={'center'} alignSelf={'flex-start'} mb={'12px'}>
                  <Text color="grayModern.600" fontWeight={'normal'} mr={'24px'}>
                    {t('remaining_balance')}
                  </Text>
                  <CurrencySymbol boxSize="20px" type={currency} fontSize="24px" />
                  <Text ml="4px" color="#24282C" fontWeight={'medium'} fontSize="24px">
                    {formatMoney(balance).toFixed(2)}
                  </Text>
                </Flex>
                <Flex direction={'column'} mb={'20px'} width={'full'}>
                  <Flex mb={'12px'} justify={'space-between'}>
                    <Text color="grayModern.600" fontWeight={'normal'}>
                      {t('Select Amount')}
                    </Text>
                    {specialBonus && specialBonus.length > 0 && (
                      <Flex align={'center'}>
                        <GiftIcon boxSize={'16px'} mr={'8px'}></GiftIcon>
                        <Text
                          mr={'4px'}
                          color={'grayModern.900'}
                          fontSize={'14px'}
                          fontWeight={500}
                        >
                          {t('first_recharge_title')}
                        </Text>
                        <MyTooltip
                          px={'12px'}
                          py={'8px'}
                          minW={'unset'}
                          width={'auto'}
                          label={
                            <Text fontSize={'12px'} fontWeight={400}>
                              {t('first_recharge_tips')}
                            </Text>
                          }
                        >
                          <HelpIcon boxSize={'16px'}></HelpIcon>
                        </MyTooltip>
                      </Flex>
                    )}
                  </Flex>
                  <Flex wrap={'wrap'} gap={'16px'}>
                    {steps.map((amount, index) => (
                      <BonusBox
                        key={index}
                        amount={amount}
                        isFirst={specialBonus.findIndex((a) => +a[0] === amount) >= 0}
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
                  <Text color="grayModern.600" mr={'36px'}>
                    {t('custom_amount')}
                  </Text>
                  <NumberInput
                    defaultValue={15}
                    clampValueOnBlur={false}
                    min={0}
                    flex={1}
                    step={step}
                    // mt="8px"
                    w="200px"
                    h="32px"
                    boxSizing="border-box"
                    background="grayModern.50"
                    pl={'12px'}
                    border="1px solid"
                    borderColor={'grayModern.200'}
                    borderRadius="8px"
                    alignItems="center"
                    display={'flex'}
                    value={amount}
                    variant={'unstyled'}
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
                    <NumberInputField color={'grayModern.900'} borderRadius={'unset'} />
                    <CurrencySymbol boxSize="14px" mr={'32px'} type={currency} />

                    <NumberInputStepper borderColor={'grayModern.200'}>
                      <NumberIncrementStepper width={'24px'} borderColor={'grayModern.200'}>
                        <Img src={vector.src}></Img>
                      </NumberIncrementStepper>
                      <NumberDecrementStepper w="24px" borderColor={'grayModern.200'}>
                        <Img src={vector.src} transform={'rotate(180deg)'}></Img>
                      </NumberDecrementStepper>
                    </NumberInputStepper>
                  </NumberInput>
                  <Flex fontSize={'12px'} align={'center'}>
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
                      {t('Bonus')}
                    </Text>

                    <CurrencySymbol boxSize={'10px'} type={currency} />
                    {getBonus(amount)}
                  </Flex>
                </Flex>
                <Flex
                  alignSelf={'flex-start'}
                  align={'center'}
                  mt={'12px'}
                  onClick={() => setDetail(true)}
                >
                  <OuterLink text={t('View Discount Rules')}></OuterLink>
                </Flex>
                <ButtonGroup
                  width={'full'}
                  mt={'20px'}
                  variant={paymentButtonVarint}
                  flexWrap={paymentButtonVarint === 'outline' ? 'wrap' : 'nowrap'}
                  display={'flex'}
                  __css={
                    paymentButtonVarint === 'outline'
                      ? {
                          '> Button': {
                            py: '10px',
                            '> img': {
                              boxSize: '20px'
                            }
                          },
                          gap: '10px'
                        }
                      : {
                          '> Button': {
                            py: '14px',
                            px: '34px',
                            '> img': {
                              boxSize: '24px'
                            }
                          },
                          gap: '8px'
                        }
                  }
                >
                  {stripeEnabled && (
                    <Button w="full" h="auto" onClick={handleStripeConfirm}>
                      <Img src={stripe_icon.src} mr="8px" />
                      <Text fontSize={'14px'} fontWeight={500}>
                        {t('pay with stripe')}
                      </Text>
                    </Button>
                  )}
                  {wechatEnabled && (
                    <Button w="full" h="auto" onClick={handleWechatConfirm}>
                      <Img src={wechat_icon.src} mr="8px" fill={'teal.400'} />
                      <Text fontSize={'14px'} fontWeight={500}>
                        {t('pay with wechat')}
                      </Text>
                    </Button>
                  )}
                  {alipayEnabled && (
                    <Button
                      // variant="solid"
                      w="full"
                      h="auto"
                      py="14px"
                      px="34px"
                      onClick={handleAlipayConfirm}
                    >
                      <Img src={alipay_icon.src} mr="8px" />
                      <Text fontSize={'14px'} fontWeight={500}>
                        {t('pay with alipay')}
                      </Text>
                    </Button>
                  )}
                </ButtonGroup>
              </Flex>
            </>
          ) : (
            <>
              <ModalHeader
                px={'20px'}
                py={'12px'}
                bg={'grayModern.25'}
                borderBottom={'1px solid'}
                fontWeight={500}
                fontSize={'16px'}
                borderColor={'grayModern.100'}
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
                {t('Recharge Amount')}
              </ModalHeader>
              <ModalCloseButton top={'8px'} right={'18px'} />
              {payType === RechargePaymentType.Wechat ? (
                <WechatPayment
                  rechargePhase={recharegPhase}
                  codeURL={!isPreviousData ? data?.data?.codeURL : undefined}
                  tradeNO={!isPreviousData ? data?.data?.tradeNO : undefined}
                />
              ) : payType === RechargePaymentType.Stripe ? (
                <StripeForm
                  tradeNO={!isPreviousData ? data?.data?.tradeNO : undefined}
                  rechargePhase={recharegPhase}
                  stripePromise={props.stripePromise}
                />
              ) : (
                <AlipayForm
                  codeURL={!isPreviousData ? data?.data?.codeURL : undefined}
                  rechargePhase={recharegPhase}
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
                  steps
                    .map(
                      (step, idx, steps) =>
                        [
                          step,
                          idx < steps.length - 1 ? steps[idx + 1] : undefined,
                          ratios[idx]
                        ] as const
                    )
                    .filter(([_, _2, ratio], idx) => {
                      return ratio > 0;
                    })

                    .map(([pre, next, ratio], idx) => (
                      <>
                        <Text key={idx} pl={'24px'} color={'grayModern.900'}>
                          {pre}
                          {' <= '}
                          {t('Recharge Amount')}
                          {next ? `< ${next}` : ''}
                        </Text>
                        <Text px={'24px'} color={'grayModern.900'}>
                          {t('Bonus')}
                          {ratio.toFixed(2)}%
                        </Text>
                      </>
                    ))}
                {specialBonus &&
                  specialBonus.map(([k, v], i) => (
                    <>
                      <Text key={i} pl={'24px'} color={'grayModern.900'}>
                        {k} = {t('Recharge Amount')}{' '}
                      </Text>
                      <Text pl={'24px'} color={'grayModern.900'}>
                        {t('Bonus')} {v} %
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
});

RechargeModal.displayName = 'RechargeModal';

export default RechargeModal;

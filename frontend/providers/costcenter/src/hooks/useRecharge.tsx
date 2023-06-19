import request from '@/service/request';
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
  Text,
  useDisclosure,
  useToast
} from '@chakra-ui/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useMemo, useState } from 'react';
import wechat_icon from '@/assert/ic_baseline-wechat.svg';
import vector from '@/assert/Vector.svg';
import { deFormatMoney, formatMoney } from '@/utils/format';
import { useTranslation } from 'next-i18next';
import { getFavorable } from '@/utils/favorable';
import { ApiResp } from '@/types/api';
import { Pay, Payment } from '@/types/payment';
import OuterLink from '@/components/outerLink';

function useRecharge(props: {
  onPaySuccess?: () => void;
  onPayError?: () => void;
  onCreatedSuccess?: () => void;
  onCreatedError?: () => void;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const { isOpen, onOpen, onClose: _onClose } = useDisclosure();

  const RechargeModal = ({ balance }: { balance: number }) => {
    const [step, setStep] = useState(1);

    // 整个流程跑通需要状态管理, 0 初始态， 1 创建支付单， 2 支付中, 3 支付成功
    const [complete, setComplete] = useState<0 | 1 | 2 | 3>(0);
    // 计费详情
    const [detail, setDetail] = useState(false);
    const [paymentName, setPaymentName] = useState('');
    const [selectAmount, setSelectAmount] = useState(0);

    const toast = useToast();
    const createPaymentRes = useMutation(
      () =>
        request.post<any, ApiResp<Payment>>('/api/account/payment', {
          amount: deFormatMoney(amount)
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

    const { data } = useQuery(
      ['query-charge-res'],
      () =>
        request<any, ApiResp<Pay>>('/api/account/payment/pay', {
          params: {
            id: paymentName
          }
        }),
      {
        refetchInterval: complete === 2 ? 1000 : false,
        enabled: complete === 2,
        onSuccess(data) {
          setTimeout(() => {
            if (data?.data?.status === 'SUCCESS') {
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
      cancalPay();
      _onClose();
    };

    const { data: bonuses, isSuccess } = useQuery(
      ['bonus'],
      () =>
        request.get<
          any,
          ApiResp<{
            steps: string;
            ratios: string;
          }>
        >('/api/price/bonus'),
      {}
    );
    const ratios = useMemo(
      () => (bonuses?.data?.ratios || '').split(',').map((v) => +v),
      [bonuses?.data?.ratios]
    );
    const steps = useMemo(
      () => (bonuses?.data?.steps || '').split(',').map((v) => +v),
      [bonuses?.data?.steps]
    );
    const [amount, setAmount] = useState(() => 0);
    const getBonus = useCallback(
      (amount: number) => {
        console.log(ratios, steps);
        if (isSuccess && ratios && steps && ratios.length === steps.length)
          return getFavorable(steps, ratios)(amount);
        else return 0;
      },
      [isSuccess, ratios, steps]
    );
    const handleConfirm = () => {
      setComplete(1);
      createPaymentRes.mutate();
    };
    return (
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent maxW="500px" height={'565px'}>
          {!detail ? (
            complete === 0 ? (
              <>
                <ModalHeader px={'24px'} pt={'24px'} pb={'18px'}>
                  {t('Recharge Amount')}
                </ModalHeader>
                <ModalCloseButton top={'24px'} right={'24px'} />
                <Flex
                  pointerEvents={complete === 0 ? 'auto' : 'none'}
                  pt="4px"
                  mt={'0'}
                  w="500px"
                  px={'24px'}
                  flexDirection="column"
                  justifyContent="center"
                  alignItems="center"
                >
                  <Flex align={'center'} alignSelf={'flex-start'} mb={'20px'}>
                    <Text color="#7B838B" fontWeight={'normal'} mr={'24px'}>
                      {t('Balance')}
                    </Text>
                    <Text mt="4px" color="#24282C" fontSize="24px" fontWeight={'medium'}>
                      ¥ {formatMoney(balance).toFixed(2)}
                    </Text>
                  </Flex>
                  <Flex direction={'column'} mb={'20px'}>
                    <Text color="#7B838B" fontWeight={'normal'} mb={'16px'}>
                      {t('Select Amount')}
                    </Text>
                    <Flex wrap={'wrap'} gap={'16px'}>
                      {steps.map((amount, index) => (
                        <Flex
                          width="140px"
                          height="92px"
                          justify={'center'}
                          align={'center'}
                          key={index}
                          {...(selectAmount === index
                            ? {
                                color: '#36ADEF',
                                border: '1.5px solid #36ADEF'
                              }
                            : {
                                border: '1px solid #EFF0F1'
                              })}
                          bg={'#f4f6f8'}
                          borderRadius="4px"
                          position={'relative'}
                          flexGrow="0"
                          cursor={'pointer'}
                          onClick={() => {
                            setSelectAmount(index);
                            setAmount(amount);
                          }}
                        >
                          <Text
                            position={'absolute'}
                            display={'inline-block'}
                            minW={'max-content'}
                            left="78px"
                            top="4px"
                            px={'10px'}
                            color={'#A558C9'}
                            background="#EDDEF4"
                            borderRadius="10px 10px 10px 0px"
                            zIndex={'99'}
                            fontStyle="normal"
                            fontWeight="500"
                            fontSize="12px"
                          >
                            {t('Bonus')}￥{getBonus(amount)}
                          </Text>
                          <Text fontStyle="normal" fontWeight="500" fontSize="24px">
                            ￥{amount}
                          </Text>
                        </Flex>
                      ))}
                    </Flex>
                  </Flex>
                  <Flex alignSelf={'flex-start'} align={'center'}>
                    <Text color="#7B838B" mr={'28px'}>
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
                      background="#F4F6F8"
                      px={'14px'}
                      border="1px solid #EFF0F1"
                      borderRadius="2px"
                      alignItems="center"
                      display={'flex'}
                      value={amount}
                      variant={'unstyled'}
                      onChange={(str, v) => (str.trim() ? setAmount(v) : setAmount(0))}
                    >
                      <Text mr={'4px'}>¥</Text>
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper>
                          <Img src={vector.src}></Img>
                        </NumberIncrementStepper>
                        <NumberDecrementStepper>
                          <Img src={vector.src} transform={'rotate(180deg)'}></Img>
                        </NumberDecrementStepper>
                      </NumberInputStepper>
                    </NumberInput>
                    <Text
                      py={'1px'}
                      px="7px"
                      ml={'10px'}
                      color={'#A558C9'}
                      background="#EDDEF4"
                      borderRadius="6px 6px 6px 0px;"
                      fontStyle="normal"
                      fontWeight="500"
                      fontSize="12px"
                    >
                      {t('Bonus')}
                    </Text>
                    <Text>￥{getBonus(amount)}</Text>
                  </Flex>
                  <Flex
                    alignSelf={'flex-start'}
                    align={'center'}
                    mt={'20px'}
                    onClick={() => setDetail(true)}
                  >
                    <OuterLink text={t('View Discount Rules')}></OuterLink>
                  </Flex>
                  <Button
                    size="primary"
                    variant="primary"
                    mt="20px"
                    w="full"
                    h="48px"
                    onClick={() => handleConfirm()}
                  >
                    {t('Confirm')}
                  </Button>
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
                    {complete === 2 && !!data?.data?.codeURL ? (
                      <QRCodeSVG
                        size={185}
                        value={data?.data?.codeURL}
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
                        {t('Order Number')}： {data?.data?.tradeNO}
                      </Text>

                      <Text color="#717D8A" fontSize="12px">
                        {t('Payment Result')}:
                        {complete === 3 ? t('Payment Successful') : t('In Payment')}
                      </Text>
                    </Box>
                  </Flex>
                </Flex>
              </>
            )
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
                    setDetail(false);
                  }}
                ></Img>
                <Text>{t('Recharge Amount')}</Text>
              </ModalHeader>
              <ModalCloseButton top={'24px'} right={'24px'} />
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
                {steps &&
                  ratios &&
                  steps.length === ratios.length &&
                  steps.map((step, idx) => (
                    <Text key={idx}>
                      {step + '<='} {t('Recharge Amount')}{' '}
                      {idx < steps.length - 1 ? `< ${steps[idx + 1]}` : ''} {t('Bonus')}{' '}
                      {ratios[idx]}%{' '}
                    </Text>
                  ))}
              </Flex>
            </>
          )}
        </ModalContent>
      </Modal>
    );
  };

  return {
    RechargeModal,
    onOpen
  };
}
export default useRecharge;

import request from '@/service/request';
import Currencysymbol from '@/components/CurrencySymbol';
import {
  Button,
  Flex,
  Img,
  Input,
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
import { useMutation } from '@tanstack/react-query';
import { forwardRef, useImperativeHandle, useState } from 'react';
import vector from '@/assert/Vector.svg';
import { deFormatMoney, formatMoney } from '@/utils/format';
import { useTranslation } from 'next-i18next';
import { ApiResp } from '@/types/api';
import { TransferState, transferStatus } from '@/types/Transfer';
import useEnvStore from '@/stores/env';

const TransferModal = forwardRef(
  (
    props: {
      onTransferSuccess?: () => void;
      onTransferError?: () => void;
      onCancel?: () => void;
      balance: number;
      k8s_username: string;
    },
    ref
  ) => {
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
    const currency = useEnvStore((s) => s.currency);
    const { t } = useTranslation();
    const { isOpen, onOpen, onClose: _onClose } = useDisclosure();
    const [to, setTo] = useState('');
    const toast = useToast();
    const balance = props.balance;
    const mutation = useMutation(
      () =>
        request.post<any, ApiResp<transferStatus>>('/api/account/transfer', {
          amount: deFormatMoney(amount),
          to
        }),
      {
        onSuccess(data) {
          mutation.reset();
          setTo('');
          setAmount(0);
          if (data.data?.status.progress === TransferState.TransferStateFailed)
            toast({
              status: 'error',
              title: data.data?.status.reason,
              isClosable: true,
              position: 'top'
            });
          else {
            toast({
              status: 'success',
              title: t('Transfer Success'),
              isClosable: true,
              duration: 2000,
              position: 'top'
            });
            props.onTransferSuccess?.();
            _onClose();
          }
        },
        onError(err: any) {
          toast({
            status: 'error',
            title: err?.message || '',
            isClosable: true,
            position: 'top'
          });
          props.onTransferError?.();
        }
      }
    );

    const verify = () => {
      let trim_to = to.trim();
      if (!trim_to || trim_to.length < 6) {
        toast({
          status: 'error',
          title: t('Recipient ID is invalid'),
          isClosable: true,
          position: 'top'
        });
        return false;
      }
      if (
        (trim_to !== props.k8s_username && trim_to.replace('ns-', '') === props.k8s_username) ||
        trim_to === props.k8s_username
      ) {
        toast({
          status: 'error',
          title: t('The payee cannot be oneself'),
          isClosable: true,
          position: 'top'
        });
        return false;
      }
      // amount 必须是整数
      if (!Number.isInteger(amount)) {
        toast({
          status: 'error',
          title: t('Transfer Amount must be a integer'),
          isClosable: true,
          position: 'top'
        });
        return false;
      }
      if (deFormatMoney(amount + 10) > balance) {
        toast({
          status: 'error',
          title: t('Transfer Amount must be less than balance'),
          isClosable: true,
          position: 'top'
        });
        return false;
      }

      return true;
    };
    const onClose = () => {
      _onClose();
    };

    const [amount, setAmount] = useState(() => 0);

    const handleConfirm = () => {
      if (!verify()) return;
      mutation.mutate();
    };
    return (
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />

        <ModalContent maxW="500px">
          <ModalHeader px={'24px'} pt={'24px'} pb={'18px'} bg={'white'} border={'none'}>
            {t('Transfer Amount')}
          </ModalHeader>
          <ModalCloseButton top={'16px'} right={'24px'} />
          <Flex
            pointerEvents={mutation.isLoading ? 'none' : 'auto'}
            pt="4px"
            mt={'0'}
            pb="32px"
            w="500px"
            px={'24px'}
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
          >
            <Text alignSelf={'flex-start'}>{t('Recipient ID')}</Text>
            <Input
              type={'text'}
              min={0}
              mt="12px"
              mb={'20px'}
              w="full"
              h="42px"
              boxSizing="border-box"
              background="#F4F6F8"
              px={'14px'}
              border="1px solid #EFF0F1"
              borderRadius="2px"
              alignItems="center"
              display={'flex'}
              value={to}
              variant={'unstyled'}
              onChange={(e) => {
                e.preventDefault();
                setTo(e.target.value.trim());
              }}
              isDisabled={mutation.isLoading}
            />
            <Text alignSelf={'flex-start'}>{t('Transfer Amount')}</Text>
            <NumberInput
              defaultValue={15}
              clampValueOnBlur={false}
              min={0}
              w="full"
              h="42px"
              mt="12px"
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
              isDisabled={mutation.isLoading}
            >
              <Currencysymbol w="16px" type={currency} />
              <NumberInputField ml="4px" />
              <NumberInputStepper>
                <NumberIncrementStepper>
                  <Img src={vector.src}></Img>
                </NumberIncrementStepper>
                <NumberDecrementStepper>
                  <Img src={vector.src} transform={'rotate(180deg)'}></Img>
                </NumberDecrementStepper>
              </NumberInputStepper>
            </NumberInput>
            <Flex align={'center'} w="full" mt={'28px'} fontWeight={'500'}>
              <Text fontSize="12px" mr={'12px'}>
                {t('Balance')}
              </Text>
              <Currencysymbol w="16px" type={currency} color="rgba(33, 155, 244, 1)" />
              <Text color="rgba(33, 155, 244, 1)" fontSize={'16px'} ml="4px">
                {formatMoney(balance).toFixed(2)}
              </Text>
              <Button
                size="primary"
                variant="primary"
                w={'auto'}
                ml={'auto'}
                mr={'0px'}
                px="43px"
                py="8px"
                onClick={() => handleConfirm()}
                isLoading={mutation.isLoading}
              >
                {t('Confirm')}
              </Button>
            </Flex>
          </Flex>
        </ModalContent>
      </Modal>
    );
  }
);
TransferModal.displayName = 'TransferModal';
export default TransferModal;

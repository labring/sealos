import vector from '@/assert/Vector.svg';
import Currencysymbol from '@/components/CurrencySymbol';
import request from '@/service/request';
import useEnvStore from '@/stores/env';
import { TransferState, transferStatus } from '@/types/Transfer';
import { ApiResp } from '@/types/api';
import { deFormatMoney, formatMoney } from '@/utils/format';
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
import { useTranslation } from 'next-i18next';
import { forwardRef, useImperativeHandle, useState } from 'react';

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
              title: t('common:transfer_success'),
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
          title: t('common:recipient_id_is_invalid'),
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
          title: t('common:the_payee_cannot_be_oneself'),
          isClosable: true,
          position: 'top'
        });
        return false;
      }
      // amount 必须是整数
      if (!Number.isInteger(amount)) {
        toast({
          status: 'error',
          title: t('common:transfer_amount_must_be_a_integer'),
          isClosable: true,
          position: 'top'
        });
        return false;
      }
      if (deFormatMoney(amount + 10) > balance) {
        toast({
          status: 'error',
          title: t('common:transfer_amount_must_be_less_than_balance'),
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
        <ModalContent maxW="530px">
          <ModalHeader
            px={'20px'}
            py={'12px'}
            bg={'grayModern.25'}
            borderBottom={'1px solid'}
            fontWeight={500}
            fontSize={'16px'}
            color={'grayModern.900'}
            borderColor={'grayModern.100'}
          >
            {t('common:transfer')}
          </ModalHeader>
          <ModalCloseButton top={'8px'} right={'18px'} />
          <Flex
            pointerEvents={mutation.isLoading ? 'none' : 'auto'}
            mt={'0'}
            px="36px"
            w="full"
            py={'24px'}
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
          >
            <Text
              alignSelf={'flex-start'}
              fontWeight={500}
              fontSize={'14px'}
              mb={'8px'}
              color={'grayModern.900'}
            >
              {t('common:recipient_id')}
            </Text>
            <Input
              type={'text'}
              min={0}
              mb={'24px'}
              w="full"
              h="42px"
              boxSizing="border-box"
              background="grayModern.50"
              px={'14px'}
              _placeholder={{
                color: 'grayModern.500'
              }}
              border="1px solid"
              borderColor={'grayModern.200'}
              borderRadius="8px"
              alignItems="center"
              display={'flex'}
              value={to}
              placeholder={t('common:recipient_id')}
              variant={'unstyled'}
              onChange={(e) => {
                e.preventDefault();
                setTo(e.target.value.trim());
              }}
              isDisabled={mutation.isLoading}
            />
            <Text
              alignSelf={'flex-start'}
              fontWeight={500}
              fontSize={'14px'}
              mb={'8px'}
              color={'grayModern.900'}
            >
              {t('common:transfer_amount')}
            </Text>
            <NumberInput
              defaultValue={15}
              clampValueOnBlur={false}
              min={0}
              mb="24px"
              w="full"
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
            <Flex align={'center'} w="full" fontWeight={'500'}>
              <Text fontSize="12px" mr={'12px'} color={'grayModern.900'}>
                {t('common:balance')}
              </Text>
              <Currencysymbol w="16px" type={currency} color="rgba(33, 155, 244, 1)" mr={'6px'} />
              <Text color="brightBlue.600" fontSize={'16px'}>
                {formatMoney(balance).toFixed(2)}
              </Text>
              <Button
                variant="solid"
                w={'auto'}
                ml={'auto'}
                mr={'0px'}
                px="29.5px"
                py="8px"
                onClick={() => handleConfirm()}
                isLoading={mutation.isLoading}
              >
                {t('common:transfer')}
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

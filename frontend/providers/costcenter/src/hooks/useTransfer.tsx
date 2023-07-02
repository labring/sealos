import request from '@/service/request';
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
  Spinner,
  Text,
  useDisclosure,
  useToast
} from '@chakra-ui/react';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import vector from '@/assert/Vector.svg';
import { deFormatMoney, formatMoney } from '@/utils/format';
import { useTranslation } from 'next-i18next';
import { ApiResp } from '@/types/api';
import { TransferState, transferStatus } from '@/types/Transfer';
import { de } from 'date-fns/locale';

function useTransfer(props: {
  onTransferSuccess?: () => void;
  onTransferError?: () => void;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const { isOpen, onOpen, onClose: _onClose } = useDisclosure();

  const TransferModal = ({ balance }: { balance: number }) => {
    const [to, setTo] = useState('');
    const toast = useToast();
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
          props.onTransferSuccess?.();
          data.data?.status.progress === TransferState.TransferStateFailed &&
            toast({
              status: 'error',
              title: data.data?.status.reason,
              isClosable: true,
              position: 'top'
            });
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
      if (!to.trim() || to.trim().length < 6) {
        toast({
          status: 'error',
          title: t('Recipient ID is invalid'),
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
          <ModalHeader px={'24px'} pt={'24px'} pb={'18px'}>
            {t('Transfer Amount')}
          </ModalHeader>
          <ModalCloseButton top={'24px'} right={'24px'} />
          {mutation.isLoading ? (
            <Spinner size="md" mx={'auto'} mb="15px" />
          ) : (
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
              <Flex align={'center'} w="full" mt={'28px'} fontWeight={'500'}>
                <Text fontSize="12px" mr={'12px'}>
                  {t('Balance')}
                </Text>
                <Text color="rgba(33, 155, 244, 1)" fontSize={'16px'}>
                  ¥ {formatMoney(balance).toFixed(2)}
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
                >
                  {t('Confirm')}
                </Button>
              </Flex>
            </Flex>
          )}
        </ModalContent>
      </Modal>
    );
  };

  return {
    TransferModal,
    onOpen
  };
}
export default useTransfer;

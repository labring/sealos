import {
  Button,
  Flex,
  FlexProps,
  Image,
  Input,
  InputGroup,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Stack,
  useDisclosure
} from '@chakra-ui/react';
import { useMutation } from '@tanstack/react-query';
import { useCustomToast } from '@/hooks/useCustomToast';
import { ApiResp } from '@/types';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { strongPassword } from '@/utils/crypto';
import { passwordModifyRequest } from '@/api/auth';
export default function PasswordModify(props: FlexProps) {
  const { onOpen, isOpen, onClose } = useDisclosure();
  const { t } = useTranslation();
  const { toast } = useCustomToast({ status: 'error' });
  const mutation = useMutation(passwordModifyRequest, {
    onSuccess(data) {
      if (data.code === 200) {
        toast({
          status: 'success',
          title: t('passwordChangeSuccess')
        });
        onClose();
      }
    },
    onError(error) {
      toast({ title: (error as ApiResp).message });
    }
  });
  const { register, handleSubmit, reset } = useForm<{
    oldPassword: string;
    newPassword: string;
    againPassword: string;
  }>();
  return (
    <>
      <Flex
        borderRadius={'4px'}
        _hover={{
          background: 'rgba(255, 255, 255, 0.15)'
        }}
        h="28px"
        p="4px"
        transition={'all 0.3s'}
        justify={'center'}
        fontSize={'12px'}
        color="rgba(255, 255, 255, 0.7)"
        align={'center'}
        cursor={'pointer'}
        {...props}
        onClick={() => {
          reset();
          onOpen();
        }}
      >
        {t('change')}
      </Flex>
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent
          borderRadius={'4px'}
          maxW={'380px'}
          bgColor={'#FFF'}
          backdropFilter="blur(150px)"
          p="24px"
        >
          <ModalCloseButton right={'24px'} top="16px" p="0" />
          <ModalHeader bg={'white'} border={'none'} p="0">
            {t('changePassword')}
          </ModalHeader>
          {mutation.isLoading ? (
            <Spinner mx={'auto'} />
          ) : (
            <>
              <ModalBody h="100%" w="100%" p="0" mt="22px">
                <form
                  onSubmit={handleSubmit(
                    ({ oldPassword, newPassword }) => {
                      mutation.mutate({ oldPassword, newPassword });
                    },
                    (errors) => {
                      if (errors.oldPassword) return toast({ title: t('currentPasswordRequired') });
                      if (errors.newPassword) return toast({ title: t('password tips') });
                      if (errors.againPassword) return toast({ title: t('passwordMismatch') });
                    }
                  )}
                >
                  <Stack gap="10px">
                    <Flex
                      w="100%"
                      borderRadius="2px"
                      border="1px solid #DEE0E2"
                      bg="#FBFBFC"
                      align={'center'}
                      py={'11px'}
                      pl={'12px'}
                    >
                      <Input
                        {...register('oldPassword', {
                          required: true
                        })}
                        type="password"
                        autoComplete="current-password"
                        _autofill={{
                          bgColor: '#FBFBFC'
                        }}
                        placeholder={t('currentPassword') || ''}
                        h="20px"
                        fontSize={'14px'}
                        variant={'unstyled'}
                        borderRadius={'unset'}
                      ></Input>
                    </Flex>
                    <Flex
                      w="100%"
                      borderRadius="2px"
                      border="1px solid #DEE0E2"
                      bg="#FBFBFC"
                      align={'center'}
                      py={'11px'}
                      pl={'12px'}
                    >
                      <Input
                        {...register('newPassword', {
                          required: true,
                          validate: strongPassword
                        })}
                        type="password"
                        placeholder={t('newPassword') || ''}
                        autoComplete="new-password"
                        _autofill={{
                          bgColor: '#FBFBFC'
                        }}
                        h="20px"
                        fontSize={'14px'}
                        variant={'unstyled'}
                        borderRadius={'unset'}
                      ></Input>
                    </Flex>
                    <Flex
                      w="100%"
                      borderRadius="2px"
                      border="1px solid #DEE0E2"
                      bg="#FBFBFC"
                      align={'center'}
                      py={'11px'}
                      pl={'12px'}
                    >
                      <Input
                        {...register('againPassword', {
                          required: true,
                          validate(value, formValues) {
                            return value === formValues.newPassword;
                          }
                        })}
                        type="password"
                        _autofill={{
                          bgColor: '#FBFBFC'
                        }}
                        autoComplete="new-password"
                        placeholder={t('confirmNewPassword') || ''}
                        h="20px"
                        fontSize={'14px'}
                        variant={'unstyled'}
                        borderRadius={'unset'}
                      ></Input>
                    </Flex>
                  </Stack>
                  <Button mt="24px" variant={'primary'} w="full" type="submit">
                    {t('Confirm')}
                  </Button>
                </form>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

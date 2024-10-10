import {
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalHeader,
  ModalBody,
  useDisclosure,
  VStack,
  FormControl,
  FormLabel,
  Button,
  Input,
  useToast,
  UseToastOptions,
  Box,
  Flex,
  Center,
  Spinner,
  Link,
  FormErrorMessage,
  HStack,
  TabIndicator,
  FlexProps
} from '@chakra-ui/react';
import { CloseIcon, useMessage, WarningIcon } from '@sealos/ui';
import { useTranslation } from 'next-i18next';
import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  enterpriseRealNameAuthRequest,
  faceAuthGenerateQRcodeUriRequest,
  getFaceAuthStatusRequest
} from '@/api/auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import useSessionStore from '@/stores/session';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode.react';
import { useDropzone } from 'react-dropzone';
import { useConfigStore } from '@/stores/config';
import { DeleteIcon, PictureIcon, UploadIcon, AttachmentIcon } from '../icons';

export function useRealNameAuthNotification(props?: UseToastOptions) {
  const { t } = useTranslation();

  const realNameAuthNotification = useToast({
    position: 'top',
    ...props,
    render: (props) => {
      return (
        <Box
          display="flex"
          width="390px"
          padding="16px 20px"
          justifyContent="space-between"
          alignItems="center"
          borderRadius="6px"
          background="#FFF"
          boxShadow="0px 4px 10px 0px rgba(19, 51, 107, 0.08), 0px 0px 1px 0px rgba(19, 51, 107, 0.08)"
        >
          <Flex direction="column" alignItems="center" gap="6px" flex={1}>
            <Flex width="350px" justifyContent="space-between" alignItems="center">
              <Flex alignItems="center">
                <Center bg="#FFF4E5" borderRadius="full" p={1} mr="12px">
                  <WarningIcon fill="yellow.700" boxSize="16px" />
                </Center>
                <Text
                  color="yellow.600"
                  fontSize="16px"
                  fontWeight={500}
                  fontFamily="PingFang SC"
                  lineHeight="24px"
                  letterSpacing="0.15px"
                  fontStyle="normal"
                >
                  {t('common:realname_auth_reminder')}
                </Text>
              </Flex>
              {props?.isClosable && (
                <Center
                  display="flex"
                  padding="4px"
                  alignItems="center"
                  gap="6px"
                  cursor="pointer"
                  onClick={props.onClose}
                  bg="transparent"
                  border="none"
                  _hover={{}}
                  _active={{}}
                  _focus={{}}
                >
                  <CloseIcon w="16px" h="16px" fill="Black" />
                </Center>
              )}
            </Flex>
            <Flex width="355px" paddingLeft="38px" alignItems="flex-start" gap="10px">
              <Text
                flex="1 0 0"
                color="grayModern.900"
                fontFamily="PingFang SC"
                fontSize="14px"
                fontWeight={400}
                lineHeight="20px"
                letterSpacing="0.25px"
              >
                {t('common:realname_auth_reminder_desc')}
                <RealNameModal onFormSuccess={props.onClose}>
                  <Text
                    as="span"
                    cursor="pointer"
                    color="yellow.600"
                    fontFamily="PingFang SC"
                    fontSize="14px"
                    fontWeight={500}
                    lineHeight="20px"
                    letterSpacing="0.25px"
                    textDecoration="underline"
                  >
                    {t('common:realname_auth_now')}
                  </Text>
                </RealNameModal>
              </Text>
            </Flex>
          </Flex>
        </Box>
      );
    }
  });
  return {
    realNameAuthNotification
  };
}

function RealNameModal(props: {
  children: React.ReactElement;
  onModalOpen?: () => void;
  onModalClose?: () => void;
  onFormSuccess?: () => void;
}): ReactElement {
  const { t } = useTranslation();
  const { children } = props;
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleClose = () => {
    onClose();
    if (props.onModalClose && typeof props.onModalClose === 'function') {
      props.onModalClose();
    }
  };

  return (
    <>
      {children &&
        React.cloneElement(children, {
          onClick: () => {
            onOpen();
            if (props.onModalOpen && typeof props.onModalOpen === 'function') {
              props.onModalOpen();
            }
          }
        })}

      <Modal isOpen={isOpen} onClose={handleClose} isCentered>
        <ModalOverlay />
        <ModalContent
          borderRadius={'12px'}
          maxW={'540px'}
          bgColor={'#FFF'}
          backdropFilter="blur(150px)"
        >
          <ModalCloseButton right={'20px'} top="12px" p="0" />
          <ModalHeader
            bg={'grayModern.25'}
            borderBottomWidth={'1px'}
            borderBottomColor={'grayModern.100'}
            p="15px 20px"
          >
            <Text>{t('common:realName_verification')}</Text>
          </ModalHeader>
          <ModalBody w="100%" py="32px" px={'60px'}>
            <Tabs position="relative" variant="unstyled" isLazy>
              <TabList gap="12px">
                <Tab
                  display="flex"
                  padding="8px 4px"
                  justifyContent="center"
                  alignItems="center"
                  gap="10px"
                  color="grayModern.500"
                  fontWeight={500}
                  _selected={{ color: 'grayModern.900' }}
                  _focus={{ boxShadow: 'none' }}
                >
                  {t('common:personal_verification')}
                </Tab>
                <Tab
                  display="flex"
                  padding="8px 4px"
                  justifyContent="center"
                  alignItems="center"
                  fontWeight={500}
                  gap="10px"
                  color="grayModern.500"
                  _selected={{ color: 'grayModern.900' }}
                  _focus={{ boxShadow: 'none' }}
                >
                  {t('common:enterprise_verification')}
                </Tab>
              </TabList>
              <TabIndicator height="2px" bg="grayModern.900" borderRadius="1px" />
              <TabPanels mt="28px">
                <TabPanel p="0">
                  <FaceIdRealNameAuthORcode
                    onFormSuccess={() => {
                      onClose();
                      if (props.onFormSuccess && typeof props.onFormSuccess === 'function') {
                        props.onFormSuccess();
                      }
                    }}
                  />
                </TabPanel>
                <TabPanel p="0">
                  <EnterpriseVerification
                    onFormSuccess={() => {
                      onClose();
                      if (props.onFormSuccess && typeof props.onFormSuccess === 'function') {
                        props.onFormSuccess();
                      }
                    }}
                  />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

export function RealNameAuthForm(
  props: FlexProps & {
    onFormSuccess?: () => void;
  }
) {
  const { t } = useTranslation();
  return (
    <Tabs position="relative" variant="unstyled" isLazy>
      <TabList gap="12px">
        <Tab
          display="flex"
          padding="8px 4px"
          justifyContent="center"
          alignItems="center"
          gap="10px"
          color="grayModern.500"
          fontWeight={500}
          _selected={{ color: 'grayModern.900' }}
          _focus={{ boxShadow: 'none' }}
        >
          {t('common:personal_verification')}
        </Tab>
        <Tab
          display="flex"
          padding="8px 4px"
          justifyContent="center"
          alignItems="center"
          fontWeight={500}
          gap="10px"
          color="grayModern.500"
          _selected={{ color: 'grayModern.900' }}
          _focus={{ boxShadow: 'none' }}
        >
          {t('common:enterprise_verification')}
        </Tab>
      </TabList>
      <TabIndicator height="2px" bg="grayModern.900" borderRadius="1px" />
      <TabPanels mt="28px">
        <TabPanel p="0">
          <FaceIdRealNameAuthORcode
            onFormSuccess={() => {
              if (props.onFormSuccess && typeof props.onFormSuccess === 'function') {
                props.onFormSuccess();
              }
            }}
          />
        </TabPanel>
        <TabPanel p="0">
          <EnterpriseVerification
            onFormSuccess={() => {
              if (props.onFormSuccess && typeof props.onFormSuccess === 'function') {
                props.onFormSuccess();
              }
            }}
          />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}

export function FaceIdRealNameAuthORcode(
  props: FlexProps & {
    onFormSuccess?: () => void;
  }
) {
  const { t } = useTranslation();
  const { message } = useMessage();
  const queryClient = useQueryClient();
  const [isPolling, setIsPolling] = useState(false);
  const { session } = useSessionStore((s) => s);
  const { setSessionProp } = useSessionStore();
  const [refetchCount, setRefetchCount] = useState(0);

  const { data, isLoading, error, refetch } = useQuery(
    ['faceIdAuth'],
    faceAuthGenerateQRcodeUriRequest,
    {
      retry: false,
      refetchOnWindowFocus: false
    }
  );

  const handleRefetch = useCallback(() => {
    setRefetchCount((prev) => prev + 1);
    refetch();
  }, [refetch]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const bizToken = data?.data?.bizToken;

    if (!bizToken) {
      return;
    }

    const stopPolling = () => {
      if (intervalId) clearInterval(intervalId);
      setIsPolling(false);
    };

    const startPolling = () => {
      if (!isPolling) {
        setIsPolling(true);
        intervalId = setInterval(async () => {
          try {
            const result = await getFaceAuthStatusRequest({ bizToken });
            if (result.data?.status === 'Success') {
              message({
                title: t('common:face_recognition_success'),
                status: 'success',
                duration: 2000,
                isClosable: true
              });

              setSessionProp('user', {
                ...useSessionStore.getState().session!.user!,
                realName: result.data?.realName
              });

              queryClient.invalidateQueries([session?.token, 'UserInfo']);

              stopPolling();

              if (props.onFormSuccess && typeof props.onFormSuccess === 'function') {
                props.onFormSuccess();
              }
            }
            if (result.data?.status === 'Failed') {
              message({
                title: t('common:face_recognition_failed'),
                status: 'error',
                duration: 2000,
                isClosable: true
              });

              stopPolling();
              handleRefetch();
            }
          } catch (error: any) {
            console.error('Error checking face ID auth status:', error);
            message({
              title: error.message,
              status: 'error',
              duration: 2000,
              isClosable: true
            });
          }
        }, 2000);
      }
    };

    startPolling();

    return stopPolling;
  }, [session?.token, data, data?.data?.bizToken]);

  if (error) {
    return (
      <Box>
        <Text color="red.500">{t('common:failed_to_get_qr_code')}</Text>
        <Flex mt="28px">
          <Button onClick={() => handleRefetch()}>{t('common:retry_get_qr_code')}</Button>
        </Flex>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Center>
        <Spinner />
        <Text ml={3}>{t('common:loading')}</Text>
      </Center>
    );
  }

  return (
    <Box>
      {data?.data?.url && (
        <>
          <Flex flexDirection="column" alignItems="center" gap="16px" alignSelf="stretch">
            <Text
              color="grayModern.600"
              fontFamily="PingFang SC"
              fontSize="14px"
              fontStyle="normal"
              fontWeight={500}
              lineHeight="20px"
              letterSpacing="0.1px"
              textAlign="center"
            >
              {t('common:scan_qr_code_for_face_recognition')}
            </Text>
            <Center>
              <QRCode value={data.data.url} size={200} />
            </Center>
            {isPolling && (
              <Text
                color="grayModern.600"
                fontFamily="PingFang SC"
                fontSize="12px"
                fontStyle="normal"
                fontWeight={500}
                lineHeight="20px" // 142.857%
                letterSpacing="0.1px"
                textAlign="center"
              >
                {t('common:waiting_for_face_recognition')}
              </Text>
            )}
          </Flex>
        </>
      )}
    </Box>
  );
}

function FileUploadBox({
  onDrop,
  file,
  removeFile,
  label,
  description,
  isAttachment
}: {
  onDrop: (acceptedFiles: File[]) => void;
  file: File | null;
  removeFile: () => void;
  label: string;
  description: string;
  isAttachment?: boolean;
}) {
  const { commonConfig } = useConfigStore((s) => s);
  const enterpriseSupportingMaterialsUri = commonConfig?.enterpriseSupportingMaterials;
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    }
  });
  const { t } = useTranslation();

  return (
    <Box
      h="116px"
      display="flex"
      justifyContent="space-between"
      alignItems="flex-start"
      alignSelf="stretch"
      gap="var(--xs, 4px)"
    >
      <Text
        mb={2}
        color="grayModern.900"
        fontFamily="PingFang SC"
        fontSize="14px"
        fontStyle="normal"
        fontWeight={500}
        lineHeight="20px"
        letterSpacing="0.1px"
      >
        {label}
      </Text>
      <Box
        w="328px"
        h="116px"
        display="flex"
        flexDirection="column"
        alignItems="flex-start"
        gap="8px"
      >
        <Text
          color="var(--light-general-on-surface-lowest, var(--Gray-Modern-500, #667085))"
          fontFamily="PingFang SC"
          fontSize="12px"
          fontStyle="normal"
          fontWeight={500}
          lineHeight="16px"
          letterSpacing="0.5px"
        >
          {description}
        </Text>
        <Box
          id="upload-box"
          h="64px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          gap="10px"
          width="100%"
          borderRadius="var(--sm, 6px)"
          border={
            file
              ? '1px dashed var(--Bright-Blue-500, #219BF4)'
              : '1px dashed var(--Gray-Modern-300, #C4CBD7)'
          }
          bg={file ? 'var(--Bright-Blue-50, #F0FBFF)' : 'var(--Gray-Modern-25, #FBFBFC)'}
          cursor="pointer"
          {...getRootProps()}
        >
          <input {...getInputProps()} />
          <Flex direction="column" alignItems="center" color="blue.500" gap="2px">
            <UploadIcon width="20px" height="20px" />
            <Text
              color="var(--light-general-on-surface, var(--Gray-Modern-900, #111824))"
              fontFamily="PingFang SC"
              fontSize="10px"
              fontStyle="normal"
              fontWeight={500}
              lineHeight="14px"
              letterSpacing="0.2px"
            >
              {t('common:click_to_upload_file')}
            </Text>
          </Flex>
        </Box>{' '}
        <Flex
          display="flex"
          flexDirection="row"
          alignItems="center" // Change to center for vertical alignment
          justifyContent="space-between"
          gap="4px"
          alignSelf="stretch"
          mt="-1.5"
        >
          <Flex flex="1" alignItems="center">
            {file ? (
              <Flex alignItems="center" justifyContent="flex-start" width="100%">
                <Flex alignItems="center" gap="8px" minWidth="0">
                  <PictureIcon h="16px" w="16px" flexShrink="0" />
                  <Text
                    flexShrink={1}
                    maxWidth="200px"
                    color="var(--light-general-on-surface-low, var(--Gray-Modern-600, #485264))"
                    fontFamily="PingFang SC"
                    fontSize="12px"
                    fontStyle="normal"
                    fontWeight={400}
                    lineHeight="140%"
                    whiteSpace="nowrap"
                    overflow="hidden"
                    textOverflow="ellipsis"
                  >
                    {file.name}
                  </Text>
                </Flex>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile();
                  }}
                  variant="ghost"
                  style={{
                    display: 'flex',
                    width: '24px',
                    height: '24px',
                    padding: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 'auto',
                    flexShrink: 0
                  }}
                >
                  <DeleteIcon h="16px" w="16px" />
                </Button>
              </Flex>
            ) : null}
          </Flex>
          {isAttachment && (
            <Link
              gap="var(--sm, 6px)"
              display="flex"
              alignItems="center"
              padding="var(--xs, 4px)"
              ml="auto"
              href={enterpriseSupportingMaterialsUri}
              download
              // mt={file ? '0' : '4px'}
            >
              <Flex alignItems="center" gap="6px">
                <AttachmentIcon h="16px" w="16px" />
                <Text
                  color="var(--light-sealos-secondary-text, var(--Bright-Blue-600, #0884DD))"
                  fontFamily="PingFang SC"
                  fontSize="12px"
                  fontWeight={500}
                  lineHeight="16px"
                  letterSpacing="0.5px"
                >
                  {t('common:attachment')}
                </Text>
              </Flex>
            </Link>
          )}
        </Flex>
      </Box>
    </Box>
  );
}

function EnterpriseVerification(
  props: FlexProps & {
    onFormSuccess?: () => void;
  }
) {
  const { t } = useTranslation();
  const { message } = useMessage();

  const { session } = useSessionStore((s) => s);
  const { setSessionProp } = useSessionStore();

  const queryClient = useQueryClient();

  const schema = z.object({
    enterpriseName: z
      .string()
      .min(1, { message: t('common:enterprise_name_required') })
      .max(50, { message: t('common:enterprise_name_required') }),
    enterpriseQualification: z.instanceof(File).nullable(),
    supportingMaterials: z.instanceof(File).nullable()
  });

  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      enterpriseName: '',
      enterpriseQualification: null,
      supportingMaterials: null
    }
  });

  const enterpriseQualification = watch('enterpriseQualification');
  const supportingMaterials = watch('supportingMaterials');

  const onDropEnterpriseQualification = useCallback(
    (acceptedFiles: File[]) => {
      setValue('enterpriseQualification', acceptedFiles[0], { shouldValidate: true });
    },
    [setValue]
  );

  const onDropCertificateMaterial = useCallback(
    (acceptedFiles: File[]) => {
      setValue('supportingMaterials', acceptedFiles[0], { shouldValidate: true });
    },
    [setValue]
  );

  const removeEnterpriseQualification = () =>
    setValue('enterpriseQualification', null, { shouldValidate: true });
  const removeSupportingMaterials = () =>
    setValue('supportingMaterials', null, { shouldValidate: true });

  const enterpriseRealNameAuthMutation = useMutation(enterpriseRealNameAuthRequest, {
    onSuccess: (data) => {
      if (data.code === 200) {
        message({
          title: t('common:upload_success'),
          status: 'success',
          duration: 2000,
          isClosable: true,
          position: 'top'
        });

        queryClient.invalidateQueries([session?.token, 'UserInfo']);
        setSessionProp('user', {
          ...useSessionStore.getState().session!.user!,
          enterpriseVerificationStatus: data.data?.status
        });

        reset();

        if (props.onFormSuccess && typeof props.onFormSuccess === 'function') {
          props.onFormSuccess();
        }
      } else {
        message({
          title: data.message,
          status: 'error',
          position: 'top',
          duration: 2000,
          isClosable: true
        });
      }
    },
    onError: (error: Error) => {
      message({
        title: error.message,
        status: 'error',
        position: 'top',
        duration: 2000,
        isClosable: true
      });
    }
  });

  const onValidate = async (data: {
    enterpriseName: string;
    enterpriseQualification: File | null;
    supportingMaterials: File | null;
  }) => {
    if (!data.enterpriseQualification || !data.supportingMaterials) {
      message({
        title: t('common:please_fill_all_fields'),
        status: 'warning',
        position: 'top',
        duration: 2000,
        isClosable: true
      });

      return;
    }
    const formData = new FormData();
    formData.append('enterpriseName', data.enterpriseName);
    formData.append('enterpriseQualification', data.enterpriseQualification);
    formData.append('supportingMaterials', data.supportingMaterials);
    enterpriseRealNameAuthMutation.mutate(formData);
  };

  const onInvalid = () => {
    const firstErrorMessage = Object.values(errors)[0]?.message;
    if (firstErrorMessage) {
      message({
        title: firstErrorMessage,
        status: 'error',
        position: 'top',
        duration: 2000,
        isClosable: true
      });
    }
  };

  const onSubmit = handleSubmit(onValidate, onInvalid);

  return (
    <form onSubmit={onSubmit}>
      <VStack
        align="flex-start"
        gap="24px"
        sx={{
          flexDirection: 'column'
        }}
      >
        <FormControl isInvalid={!!errors.enterpriseName}>
          <HStack
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            alignSelf="stretch"
            h="32px"
          >
            <FormLabel
              color="grayModern.900"
              fontFamily="PingFang SC"
              fontSize="14px"
              fontStyle="normal"
              fontWeight={500}
              lineHeight="20px"
              letterSpacing="0.1px"
            >
              {t('common:enterprise_name')}
            </FormLabel>
            <Input
              placeholder={t('common:please_enter_your_enterprise_name')}
              {...register('enterpriseName')}
              display="flex"
              width="328px"
              height="32px"
              padding="8px 12px"
              alignItems="center"
              borderRadius="6px"
              border="1px solid #E8EBF0"
              background="#F7F8FA"
              color="grayModern.500"
            />
          </HStack>
          {errors.enterpriseName && (
            <FormErrorMessage>{errors.enterpriseName.message}</FormErrorMessage>
          )}
        </FormControl>

        <FileUploadBox
          onDrop={onDropEnterpriseQualification}
          file={enterpriseQualification}
          removeFile={removeEnterpriseQualification}
          label={t('common:business_license')}
          description={t('common:please_upload_the_business_license')}
        />

        <FileUploadBox
          onDrop={onDropCertificateMaterial}
          file={supportingMaterials}
          removeFile={removeSupportingMaterials}
          label={t('common:supporting_materials')}
          description={t('common:please_upload_the_supporting_materials')}
          isAttachment={true}
        />

        <Flex alignItems="flex-end" gap="36px" alignSelf="stretch" flexDirection="column">
          <Flex flexDirection="column" gap="16px" alignItems="flex-end">
            <Button
              type="submit"
              colorScheme="blue"
              // isDisabled={!enterpriseQualification || !supportingMaterials}
              isLoading={enterpriseRealNameAuthMutation.isLoading}
              display="flex"
              padding="var(--xs, 4px)"
              justifyContent="center"
              alignItems="center"
              gap="var(--sm, 6px)"
              borderRadius="8px"
              width="90px"
            >
              {t('common:confirm')}
            </Button>
          </Flex>
        </Flex>
      </VStack>
    </form>
  );
}

export default RealNameModal;

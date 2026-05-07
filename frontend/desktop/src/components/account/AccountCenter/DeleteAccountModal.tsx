import {
  checkRemainResource,
  deleteUserRequest,
  forceDeleteUser,
  getAmount,
  getDeleteUserStatus,
  getWorkspacesPlans
} from '@/api/auth';
import { nsListRequest } from '@/api/namespace';
import { RegionResourceType, ResourceType } from '@/services/backend/svc/checkResource';
import useAppStore from '@/stores/app';
import useSessionStore from '@/stores/session';
import { ApiResp, ValueOf } from '@/types';
import { RESOURCE_STATUS } from '@/types/response/checkResource';
import {
  DELETE_USER_EXECUTION_STATUS,
  DeleteUserFailure,
  DeleteUserFinalStatusResponse,
  DeleteUserInitiateResponse
} from '@/types/response/deleteUser';
import { getPlanBackgroundClass } from '@/utils/styling';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Button,
  ButtonProps,
  Center,
  Divider,
  FormControl,
  HStack,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  VStack
} from '@chakra-ui/react';
import { Badge } from '@sealos/shadcn-ui/badge';
import { cn } from '@sealos/shadcn-ui';
import { InfoCircleIcon, LinkIcon, WarnTriangeIcon } from '@sealos/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildSubscribedWorkspaceRows,
  DeleteFlowStep,
  getDeleteFlowStepFromStatus
} from './DeleteAccountModal.utils';
import { SettingInput } from './SettingInput';
import { SettingInputGroup } from './SettingInputGroup';

type DeleteExecutionState = {
  deleteId: string;
  status: DeleteUserFinalStatusResponse['status'];
  failedWorkspaces: DeleteUserFailure[];
};

const appKeyList = [
  '',
  'system-dbprovider',
  'system-applaunchpad',
  '',
  'system-cronjob',
  '',
  'system-objectstorage',
  'system-cloudserver',
  'system-template'
] as const;

const generateURL = (resource: ResourceType, domain: string) => {
  const appKey = appKeyList[resource.type];
  if (!appKey) return '';

  return `https://${domain}?workspaceUid=${resource.workspace.uid}&openapp=${appKey}`;
};

const createDefaultDeleteExecutionState = (): DeleteExecutionState => ({
  deleteId: '',
  status: DELETE_USER_EXECUTION_STATUS.PENDING,
  failedWorkspaces: []
});

export default function DeleteAccount(props: ButtonProps) {
  const { onOpen, isOpen, onClose: disclosureOnClose } = useDisclosure();
  const { t } = useTranslation();
  const { t: cloudProvidersT } = useTranslation('cloudProviders');
  const { t: appT } = useTranslation('applist');
  const queryClient = useQueryClient();
  const router = useRouter();
  const { delSession, setToken, session } = useSessionStore();
  const { openDesktopApp } = useAppStore();

  const [flowStep, setFlowStep] = useState(DeleteFlowStep.BOOTSTRAP);
  const [nickname, setNickname] = useState('');
  const [verifyValue, setVerifyValue] = useState('');
  const [forceDeleteValue, setForceDeleteValue] = useState('');
  const [code, setCode] = useState('');
  const [deleteExecution, setDeleteExecution] = useState<DeleteExecutionState>(
    createDefaultDeleteExecutionState
  );

  const verifyWords = t('common:deletemyaccount');
  const forceDeleteKeywords = t('common:force_delete_keywords');

  const appType = [
    '',
    appT('db'),
    appT('app'),
    appT('terminal'),
    appT('job'),
    appT('other'),
    appT('object-storage'),
    appT('cloud-vm'),
    appT('app-store')
  ];

  const resetFormState = useCallback(() => {
    setNickname('');
    setVerifyValue('');
    setForceDeleteValue('');
    setCode('');
    setDeleteExecution(createDefaultDeleteExecutionState());
  }, []);

  const closeModal = useCallback(() => {
    resetFormState();
    setFlowStep(DeleteFlowStep.BOOTSTRAP);
    disclosureOnClose();
  }, [disclosureOnClose, resetFormState]);

  const handleLogout = useCallback(async () => {
    delSession();
    queryClient.clear();
    setToken('');
    await router.replace('/signin');
  }, [delSession, queryClient, router, setToken]);

  useEffect(() => {
    if (flowStep !== DeleteFlowStep.SUCCESS) return;

    const timer = window.setTimeout(() => {
      void handleLogout();
    }, 1500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [flowStep, handleLogout]);

  const openCostCenterApp = useCallback(() => {
    openDesktopApp({
      appKey: 'system-costcenter',
      pathname: '/',
      query: {
        mode: 'create'
      },
      messageData: {
        type: 'InternalAppCall',
        mode: 'create'
      }
    });
  }, [openDesktopApp]);

  const { data: amountData } = useQuery({
    queryKey: ['getAmount', { userId: session?.user?.userCrUid }],
    queryFn: getAmount,
    enabled: !!session?.user,
    staleTime: 60 * 1000
  });

  const { data: namespaces = [], isLoading: namespacesLoading } = useQuery({
    queryKey: ['teamList', 'deleteAccount'],
    queryFn: nsListRequest,
    enabled: !!session?.user,
    select(data) {
      return data.data?.namespaces || [];
    },
    refetchOnWindowFocus: false
  });

  const namespaceIds = useMemo(() => namespaces.map((namespace) => namespace.id), [namespaces]);

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['planList', 'deleteAccount', ...namespaceIds],
    queryFn: () => getWorkspacesPlans(namespaceIds),
    enabled: namespaceIds.length > 0,
    select(data) {
      return data.data?.plans || [];
    },
    refetchOnWindowFocus: false
  });

  const subscribedWorkspaceRows = useMemo(
    () => buildSubscribedWorkspaceRows(namespaces, plans),
    [namespaces, plans]
  );

  const hasSubscribedWorkspaces = subscribedWorkspaceRows.length > 0;

  const applyDeleteStatus = useCallback((data: DeleteUserFinalStatusResponse) => {
    setDeleteExecution({
      deleteId: data.deleteId,
      status: data.status,
      failedWorkspaces: data.failedWorkspaces || []
    });
    setFlowStep(getDeleteFlowStepFromStatus(data.status));
  }, []);

  const mutationCheck = useMutation({
    mutationFn: checkRemainResource,
    onSuccess(data) {
      if (data.message === RESOURCE_STATUS.REMAIN_RESOURCE) {
        setFlowStep(DeleteFlowStep.REMAIN_RESOURCES);
      }
    },
    onError(data: { code: number; message: ValueOf<RESOURCE_STATUS>; data: RegionResourceType[] }) {
      if (data.message === RESOURCE_STATUS.REMAIN_RESOURCE) {
        setFlowStep(DeleteFlowStep.REMAIN_RESOURCES);
      }
    }
  });

  const mutationDelete = useMutation({
    mutationFn: deleteUserRequest,
    onSuccess(data: ApiResp<DeleteUserInitiateResponse>) {
      if (!data.data) return;
      applyDeleteStatus(data.data);
    }
  });

  const mutationForceDelete = useMutation(
    (payload: { code: string }) =>
      forceDeleteUser(payload) as unknown as Promise<ApiResp<DeleteUserInitiateResponse>>,
    {
      onSuccess(data: ApiResp<DeleteUserInitiateResponse>) {
        if (!data.data) return;
        applyDeleteStatus(data.data);
        setCode('');
        setForceDeleteValue('');
      }
    }
  );

  useQuery({
    queryKey: ['delete-user-status', deleteExecution.deleteId],
    queryFn: () => getDeleteUserStatus(deleteExecution.deleteId),
    enabled:
      isOpen &&
      !!deleteExecution.deleteId &&
      deleteExecution.status === DELETE_USER_EXECUTION_STATUS.PENDING,
    refetchInterval(data) {
      return data?.data?.status === DELETE_USER_EXECUTION_STATUS.PENDING ? 3000 : false;
    },
    refetchOnWindowFocus: false,
    onSuccess(data) {
      if (!data.data) return;
      applyDeleteStatus(data.data);
    }
  });

  useEffect(() => {
    if (!isOpen) return;
    if (flowStep !== DeleteFlowStep.BOOTSTRAP) return;
    if (namespacesLoading || (namespaceIds.length > 0 && plansLoading)) return;

    setFlowStep(
      hasSubscribedWorkspaces ? DeleteFlowStep.SUBSCRIPTION_WARNING : DeleteFlowStep.FINAL_CONFIRM
    );
  }, [
    flowStep,
    hasSubscribedWorkspaces,
    isOpen,
    namespaceIds.length,
    namespacesLoading,
    plansLoading
  ]);

  const isInsufficientBalance =
    (amountData?.data?.balance || 0) < (amountData?.data?.deductionBalance || 0);

  const isBusy =
    mutationCheck.isLoading ||
    mutationDelete.isLoading ||
    mutationForceDelete.isLoading ||
    flowStep === DeleteFlowStep.BOOTSTRAP ||
    (flowStep === DeleteFlowStep.PENDING && !deleteExecution.deleteId);

  const canDismiss = ![DeleteFlowStep.PENDING, DeleteFlowStep.SUCCESS].includes(flowStep);
  const isFinalConfirmationStep = flowStep === DeleteFlowStep.FINAL_CONFIRM;
  const isForceDeleteStep = flowStep === DeleteFlowStep.FORCE_DELETE;
  const isRemainResourcesStep = flowStep === DeleteFlowStep.REMAIN_RESOURCES;
  const isSubscribedWarningStep = flowStep === DeleteFlowStep.SUBSCRIPTION_WARNING;
  const isSuccessStep = flowStep === DeleteFlowStep.SUCCESS;
  const isFailedStep = flowStep === DeleteFlowStep.FAILED;
  const isPendingStep = flowStep === DeleteFlowStep.PENDING;

  const isFinalConfirmValid =
    nickname === session?.user?.name &&
    verifyValue === verifyWords &&
    !isBusy &&
    !isInsufficientBalance;
  const isForceDeleteValid =
    forceDeleteValue === forceDeleteKeywords && !isBusy && !isInsufficientBalance;

  const remainResourceRows = (mutationCheck.data?.data?.regionResourceList || []).flatMap((item) =>
    item.resource
      .filter((resource) => [1, 2, 4, 6, 7, 8].includes(resource.type))
      .map(
        (resource) =>
          [
            item.region.displayName,
            resource.workspace.displayName,
            appType[resource.type],
            generateURL(resource, item.region.domain)
          ] as const
      )
  );

  const handleSubmitDelete = async () => {
    if (isFinalConfirmationStep) {
      const res = await mutationCheck.mutateAsync();
      const nextCode = res.data?.code || '';

      if (res.message === RESOURCE_STATUS.REMAIN_RESOURCE) {
        setCode(nextCode);
        setFlowStep(DeleteFlowStep.REMAIN_RESOURCES);
      } else if (res.message === RESOURCE_STATUS.RESULT_SUCCESS) {
        mutationDelete.mutate();
      }

      return;
    }

    if (isRemainResourcesStep) {
      setFlowStep(DeleteFlowStep.FORCE_DELETE);
      return;
    }

    if (isForceDeleteStep && code) {
      mutationForceDelete.mutate({ code });
    }
  };

  const getModalWidth = () => {
    if (isRemainResourcesStep || isSubscribedWarningStep || isFailedStep) return '540px';
    return '400px';
  };

  const getBodyDescription = () => {
    if (isSubscribedWarningStep) return t('common:delete_account_subscription_warning');
    if (isFinalConfirmationStep) return t('common:deleteaccounttitle');
    if (isRemainResourcesStep) return t('common:delete_account_remain_resources');
    if (isForceDeleteStep) return t('common:force_delete_tips');
    if (isPendingStep) return t('common:delete_account_pending_description');
    if (isSuccessStep) return t('common:delete_account_success_description');
    if (isFailedStep) return t('common:delete_account_failed_description');
    return '';
  };

  return (
    <>
      <Button
        onClick={() => {
          resetFormState();
          setFlowStep(DeleteFlowStep.BOOTSTRAP);
          onOpen();
        }}
        variant={'ghost'}
        bgColor={'grayModern.150'}
        p={'8px 14px'}
        color={'red.600'}
        {...props}
      >
        {t('common:delete_account_button')}
      </Button>
      <Modal
        isOpen={isOpen}
        onClose={canDismiss ? closeModal : () => undefined}
        isCentered
        closeOnOverlayClick={canDismiss}
        closeOnEsc={canDismiss}
      >
        <ModalOverlay />
        <ModalContent
          borderRadius={'10px'}
          maxW={getModalWidth()}
          bgColor={'#FFF'}
          backdropFilter="blur(150px)"
        >
          <ModalHeader
            px={'20px'}
            py={'12px'}
            bg={'grayModern.25'}
            borderBottom={'1px solid'}
            fontWeight={500}
            fontSize={'16px'}
            display={'flex'}
            gap={'10px'}
            borderColor={'grayModern.100'}
          >
            <WarnTriangeIcon boxSize={'24px'} fill={isSuccessStep ? 'green.500' : 'yellow.500'} />
            <Text>{t('common:delete_account_title')}</Text>
          </ModalHeader>
          {canDismiss && <ModalCloseButton top={'8px'} right={'20px'} />}
          <ModalBody h="100%" w="100%" px="36px" pt="24px" pb="32px" fontSize={'14px'}>
            {isBusy ? (
              <Center minH={'160px'}>
                <Spinner mx="auto" />
              </Center>
            ) : (
              <VStack alignItems={'stretch'} gap={'0'} fontWeight={'400'} color={'grayModern.900'}>
                {isSubscribedWarningStep ? (
                  <>
                    <Text mb={'12px'}>{t('common:deleteaccounttitle')}</Text>
                    <Alert
                      status="warning"
                      variant="left-accent"
                      borderRadius={'8px'}
                      alignItems={'flex-start'}
                      mb={'12px'}
                    >
                      <AlertIcon mt={'2px'} />
                      <VStack alignItems={'stretch'} spacing={'4px'}>
                        <AlertTitle fontSize={'13px'} fontWeight={600}>
                          {t('common:delete_account_subscription_warning_title')}
                        </AlertTitle>
                        <AlertDescription fontSize={'12px'} color={'grayModern.700'}>
                          {t('common:delete_account_subscription_warning')}
                        </AlertDescription>
                      </VStack>
                    </Alert>
                  </>
                ) : (
                  <Text mb={'12px'}>{getBodyDescription()}</Text>
                )}

                {(isFinalConfirmationStep || isRemainResourcesStep || isForceDeleteStep) &&
                  isInsufficientBalance && (
                    <HStack
                      color={'red.500'}
                      bgColor={'red.50'}
                      p={'6px 12px'}
                      fontWeight={'500'}
                      borderRadius={'6px'}
                      gap={'4px'}
                    >
                      <InfoCircleIcon boxSize={'14px'} />
                      <Text fontSize={'11px'}>{t('common:insufficient_balance')}</Text>
                    </HStack>
                  )}

                {(isFinalConfirmationStep || isRemainResourcesStep || isForceDeleteStep) && (
                  <HStack
                    color={'red.500'}
                    bgColor={'red.50'}
                    p={'6px 12px'}
                    fontWeight={'500'}
                    mt={'12px'}
                    borderRadius={'6px'}
                    gap={'4px'}
                  >
                    <InfoCircleIcon boxSize={'14px'} />
                    <Text fontSize={'11px'}>{t('common:irreversibleactiontips')}</Text>
                  </HStack>
                )}

                {!isPendingStep && !isSuccessStep && !isFailedStep ? (
                  <Divider borderColor={'grayModern.200'} my={'24px'} />
                ) : null}

                {isSubscribedWarningStep && (
                  <TableContainer>
                    <Table color={'grayModern.600'} fontSize={'12px'} fontWeight={500}>
                      <Thead>
                        <Tr>
                          {[t('common:workspace'), t('common:plan')].map((label, index, arr) => (
                            <Th
                              key={label}
                              bgColor={'grayModern.100'}
                              borderLeftRadius={index === 0 ? '6px' : '0px'}
                              borderRightRadius={index === arr.length - 1 ? '6px' : '0px'}
                              border="none"
                              color={'grayModern.700'}
                              py={'8px'}
                              textTransform={'none'}
                            >
                              {label}
                            </Th>
                          ))}
                        </Tr>
                      </Thead>
                      <Tbody>
                        {subscribedWorkspaceRows.map((workspace) => (
                          <Tr key={`${workspace.namespace}-${workspace.planName}`}>
                            <Td borderColor="grayModern.200" py="8px">
                              <Text>{workspace.workspaceName}</Text>
                            </Td>
                            <Td borderColor="grayModern.200" py="8px">
                              <Badge
                                variant={'subscription'}
                                className={cn(
                                  getPlanBackgroundClass(
                                    workspace.planName,
                                    workspace.planName === 'PAYG',
                                    false
                                  )
                                )}
                              >
                                {workspace.planName}
                              </Badge>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                )}

                {isFinalConfirmationStep && (
                  <>
                    <FormControl isInvalid={nickname !== session?.user?.name} mb={'12px'}>
                      <HStack fontWeight={400} mb={'10px'}>
                        <Text>{t('common:please_enter_username')}</Text>
                        <Text fontWeight={600}>{session?.user?.name}</Text>
                        <Text>{t('common:confirm')}</Text>
                      </HStack>
                      <SettingInputGroup>
                        <SettingInput
                          type="text"
                          value={nickname}
                          onChange={(e) => {
                            setNickname(e.target.value);
                          }}
                        />
                      </SettingInputGroup>
                    </FormControl>
                    <FormControl isInvalid={verifyValue !== verifyWords}>
                      <HStack mb={'12px'}>
                        <Text>{t('common:please_enter')}</Text>
                        <Text fontWeight={600}>{verifyWords}</Text>
                        <Text>{t('common:confirm_again')}</Text>
                      </HStack>
                      <SettingInputGroup>
                        <SettingInput
                          type="text"
                          value={verifyValue}
                          onChange={(e) => {
                            setVerifyValue(e.target.value);
                          }}
                        />
                      </SettingInputGroup>
                    </FormControl>
                  </>
                )}

                {isRemainResourcesStep && (
                  <TableContainer>
                    <Table color={'grayModern.600'} fontSize={'12px'} fontWeight={500}>
                      <Thead>
                        <Tr>
                          {[
                            t('common:region'),
                            t('common:team'),
                            appT('app_type'),
                            t('common:link')
                          ].map((label, index, arr) => (
                            <Th
                              key={label}
                              bgColor={'grayModern.100'}
                              borderLeftRadius={index === 0 ? '6px' : '0px'}
                              borderRightRadius={index === arr.length - 1 ? '6px' : '0px'}
                              border="none"
                              color={'grayModern.700'}
                              py={'8px'}
                              textTransform={'none'}
                            >
                              {label}
                            </Th>
                          ))}
                        </Tr>
                      </Thead>
                      <Tbody>
                        {remainResourceRows.map((item, index) => (
                          <Tr key={index}>
                            {[
                              <Text key={0}>{cloudProvidersT(item[0] as any)}</Text>,
                              <Text key={1}>{item[1]}</Text>,
                              <Text key={2}>{item[2]}</Text>,
                              item[3] ? (
                                <IconButton
                                  key={3}
                                  icon={<LinkIcon />}
                                  minW={'auto'}
                                  variant={'ghost'}
                                  boxSize={'32px'}
                                  color={'grayModern.600'}
                                  aria-label={t('common:link')}
                                  onClick={() => {
                                    window.open(item[3], '_self');
                                  }}
                                />
                              ) : (
                                <Text key={3}>-</Text>
                              )
                            ].map((cell, cellIndex) => (
                              <Td borderColor="grayModern.200" py="8px" key={cellIndex}>
                                {cell}
                              </Td>
                            ))}
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                )}

                {isForceDeleteStep && (
                  <FormControl isInvalid={forceDeleteValue !== forceDeleteKeywords}>
                    <HStack mb={'12px'}>
                      <Text>{t('common:please_enter')}</Text>
                      <Text fontWeight={600}>{forceDeleteKeywords}</Text>
                      <Text>{t('common:confirm')}</Text>
                    </HStack>
                    <SettingInputGroup>
                      <SettingInput
                        type="text"
                        value={forceDeleteValue}
                        onChange={(e) => {
                          setForceDeleteValue(e.target.value);
                        }}
                      />
                    </SettingInputGroup>
                  </FormControl>
                )}

                {isPendingStep && (
                  <Center minH={'180px'}>
                    <VStack spacing={'12px'}>
                      <Spinner />
                      <Text fontWeight={500}>{t('common:delete_account_pending_title')}</Text>
                      <Text fontSize={'12px'} color={'grayModern.600'} textAlign={'center'}>
                        {t('common:delete_account_pending_hint')}
                      </Text>
                    </VStack>
                  </Center>
                )}

                {isSuccessStep && (
                  <Center minH={'180px'}>
                    <VStack spacing={'12px'}>
                      <Text fontWeight={600} fontSize={'16px'}>
                        {t('common:delete_account_success_title')}
                      </Text>
                      <Text fontSize={'12px'} color={'grayModern.600'} textAlign={'center'}>
                        {t('common:delete_account_success_hint')}
                      </Text>
                    </VStack>
                  </Center>
                )}

                {isFailedStep && (
                  <VStack alignItems={'stretch'} spacing={'12px'}>
                    <Text fontSize={'12px'} color={'grayModern.600'}>
                      {t('common:delete_account_failed_hint')}
                    </Text>
                    {deleteExecution.failedWorkspaces.length > 0 ? (
                      <TableContainer>
                        <Table color={'grayModern.600'} fontSize={'12px'} fontWeight={500}>
                          <Thead>
                            <Tr>
                              {[t('common:workspace'), t('common:status')].map(
                                (label, index, arr) => (
                                  <Th
                                    key={label}
                                    bgColor={'grayModern.100'}
                                    borderLeftRadius={index === 0 ? '6px' : '0px'}
                                    borderRightRadius={index === arr.length - 1 ? '6px' : '0px'}
                                    border="none"
                                    color={'grayModern.700'}
                                    py={'8px'}
                                    textTransform={'none'}
                                  >
                                    {label}
                                  </Th>
                                )
                              )}
                            </Tr>
                          </Thead>
                          <Tbody>
                            {deleteExecution.failedWorkspaces.map((workspace, index) => (
                              <Tr key={`${workspace.workspaceUid}-${index}`}>
                                <Td borderColor="grayModern.200" py="8px">
                                  <VStack alignItems={'stretch'} spacing={'2px'}>
                                    <Text>{workspace.workspaceName}</Text>
                                    <Text fontSize={'11px'} color={'grayModern.500'}>
                                      {workspace.action}
                                    </Text>
                                  </VStack>
                                </Td>
                                <Td borderColor="grayModern.200" py="8px">
                                  <Text color={'red.500'}>{workspace.message}</Text>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Text fontSize={'12px'} color={'red.500'}>
                        {t('common:delete_account_failed_no_details')}
                      </Text>
                    )}
                  </VStack>
                )}

                {isSubscribedWarningStep && (
                  <HStack gap={'12px'} justifyContent={'flex-end'} mt={'24px'}>
                    <Button
                      onClick={openCostCenterApp}
                      variant={'outline'}
                      p={'8px 19px'}
                      fontSize={'12px'}
                      h="auto"
                    >
                      {t('common:delete_account_open_cost_center')}
                    </Button>
                    <Button
                      onClick={closeModal}
                      variant={'outline'}
                      p={'8px 19px'}
                      fontSize={'12px'}
                      h="auto"
                    >
                      {t('common:cancel')}
                    </Button>
                    <Button
                      onClick={() => setFlowStep(DeleteFlowStep.FINAL_CONFIRM)}
                      h="auto"
                      variant={'outline'}
                      py={'8px'}
                      px={'19px'}
                      color={'red.600'}
                      fontSize={'12px'}
                    >
                      {t('common:delete_account_delete_immediately')}
                    </Button>
                  </HStack>
                )}

                {(isFinalConfirmationStep || isRemainResourcesStep || isForceDeleteStep) && (
                  <HStack gap={'12px'} justifyContent={'flex-end'} mt={'24px'}>
                    <Button
                      onClick={closeModal}
                      variant={'outline'}
                      p={'8px 19px'}
                      fontSize={'12px'}
                      h="auto"
                    >
                      {t('common:cancel')}
                    </Button>
                    <Button
                      onClick={handleSubmitDelete}
                      h="auto"
                      variant={'outline'}
                      py={'8px'}
                      px={isRemainResourcesStep ? '14px' : '19px'}
                      color={'red.600'}
                      fontSize={'12px'}
                      isDisabled={
                        (isFinalConfirmationStep && !isFinalConfirmValid) ||
                        (isForceDeleteStep && !isForceDeleteValid)
                      }
                    >
                      {isRemainResourcesStep
                        ? t('common:delete_account_force_button')
                        : t('common:delete_account_button')}
                    </Button>
                  </HStack>
                )}

                {isFailedStep && (
                  <HStack justifyContent={'flex-end'} mt={'24px'}>
                    <Button
                      onClick={closeModal}
                      variant={'outline'}
                      p={'8px 19px'}
                      fontSize={'12px'}
                      h="auto"
                    >
                      {t('common:cancel')}
                    </Button>
                  </HStack>
                )}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

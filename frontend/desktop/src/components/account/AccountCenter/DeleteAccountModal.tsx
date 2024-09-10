import { checkRemainResource, forceDeleteUser, getAmount } from '@/api/auth';
import { RegionResourceType, ResourceType } from '@/services/backend/svc/checkResource';
import useAppStore from '@/stores/app';
import useSessionStore from '@/stores/session';
import { ValueOf } from '@/types';
import { RESOURCE_STATUS } from '@/types/response/checkResource';
import {
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
import { InfoCircleIcon, LinkIcon, WarnTriangeIcon } from '@sealos/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { SettingInput } from './SettingInput';
import { SettingInputGroup } from './SettingInputGroup';
enum PageStatus {
  IDLE,
  REMAIN_RESOURCES,
  FORCE_DELETE
}
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
  let openapp: string = appKey;
  let url = `https://${domain}?workspaceUid=${resource.workspace.uid}&openapp=${openapp}`;
  return url;
};
export default function DeleteAccount({ ...props }: ButtonProps) {
  const { onOpen, isOpen, onClose: _onClose } = useDisclosure();
  const { t } = useTranslation();
  const { t: cloudProvidersT } = useTranslation('cloudProviders');
  const { t: appT } = useTranslation('applist');
  const queryClient = useQueryClient();
  const { delSession, setToken, session } = useSessionStore();
  const [pagestatus, setPagestatus] = useState(PageStatus.IDLE);
  const [nickname, setnickname] = useState('');
  const verifyWords = t('common:deletemyaccount');
  const forceDeleteKeywords = t('common:force_delete_keywords');
  const router = useRouter();
  const [verifyValue, setVerifyValue] = useState('');
  const [forceDeleteValue, setForceDeleteValue] = useState('');
  const [code, setCode] = useState('');
  const { openApp } = useAppStore();
  const appType = [
    '', // 0
    appT('db'), // 1
    appT('app'), // 2
    appT('terminal'), // 3
    appT('job'), // 4
    appT('other'), // 5
    appT('object-storage'), // 6
    appT('cloud-vm'), // 7
    appT('app-store') // 8
  ];
  const onClose = () => {
    setPagestatus(PageStatus.IDLE);
    setForceDeleteValue('');
    setVerifyValue('');
    setnickname('');
    setCode('');
    _onClose();
  };
  const mutationForce = useMutation({
    mutationFn: forceDeleteUser,
    onSuccess() {
      delSession();
      queryClient.clear();
      setToken('');
      router.replace('/signin');
      setToken('');
    }
  });

  const { data: amountData } = useQuery({
    queryKey: ['getAmount', { userId: session?.user?.userCrUid }],
    queryFn: getAmount,
    enabled: !!session?.user,
    staleTime: 60 * 1000
  });
  const isInsufficientBalance =
    (amountData?.data?.balance || 0) < (amountData?.data?.deductionBalance || 0);

  const mutationCheck = useMutation({
    mutationFn: checkRemainResource,
    onSuccess(data) {
      if (data.message === RESOURCE_STATUS.REMAIN_RESOURCE)
        setPagestatus(PageStatus.REMAIN_RESOURCES);
    },
    onError(data: { code: number; message: ValueOf<RESOURCE_STATUS>; data: RegionResourceType[] }) {
      if (data.message === RESOURCE_STATUS.REMAIN_RESOURCE)
        setPagestatus(PageStatus.REMAIN_RESOURCES);
    }
  });
  return (
    <>
      {
        <Button
          onClick={onOpen}
          variant={'ghost'}
          bgColor={'grayModern.150'}
          p={'8px 14px'}
          color={'red.600'}
          {...props}
        >
          {t('common:delete_account_button')}
        </Button>
      }
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent
          borderRadius={'10px'}
          maxW={pagestatus === PageStatus.REMAIN_RESOURCES ? '540px' : '400px'}
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
            <WarnTriangeIcon boxSize={'24px'} fill={'yellow.500'} />
            <Text>{t('common:delete_account_title')}</Text>
          </ModalHeader>
          <ModalCloseButton top={'8px'} right={'20px'} />
          <ModalBody h="100%" w="100%" px="36px" pt="24px" pb="32px" fontSize={'14px'}>
            {mutationCheck.isLoading || mutationForce.isLoading ? (
              <Center>
                <Spinner mx="auto" />
              </Center>
            ) : (
              <VStack alignItems={'stretch'} gap={'0'} fontWeight={'400'} color={'grayModern.900'}>
                {pagestatus === PageStatus.IDLE ? (
                  <Text mb={'12px'}>{t('common:deleteaccounttitle')}</Text>
                ) : pagestatus === PageStatus.REMAIN_RESOURCES ? (
                  <Text mb={'12px'}>{t('common:delete_account_remain_resources')}</Text>
                ) : (
                  <Text mb={'12px'}>{t('common:force_delete_tips')}</Text>
                )}
                {isInsufficientBalance && (
                  <HStack
                    color={'red.500'}
                    bgColor={'red.50'}
                    p={'6px 12px'}
                    fontWeight={'500'}
                    borderRadius={'6px'}
                    gap={'4px'}
                  >
                    <InfoCircleIcon boxSize={'14px'}></InfoCircleIcon>
                    <Text fontSize={'11px'}>{t('common:insufficient_balance')}</Text>
                  </HStack>
                )}
                <HStack
                  color={'red.500'}
                  bgColor={'red.50'}
                  p={'6px 12px'}
                  fontWeight={'500'}
                  mt={'12px'}
                  borderRadius={'6px'}
                  gap={'4px'}
                >
                  <InfoCircleIcon boxSize={'14px'}></InfoCircleIcon>
                  <Text fontSize={'11px'}>{t('common:irreversibleactiontips')}</Text>
                </HStack>

                {pagestatus !== PageStatus.REMAIN_RESOURCES ? (
                  <Divider borderColor={'grayModern.200'} my={'24px'} />
                ) : null}
                {pagestatus === PageStatus.IDLE ? (
                  <>
                    {' '}
                    <FormControl isInvalid={nickname !== session?.user.name} mb={'12px'}>
                      <HStack fontWeight={400} mb={'10px'}>
                        <Text>{t('common:please_enter_username')}</Text>
                        <Text fontWeight={600}>{session?.user.name}</Text>
                        <Text>{t('common:confirm')}</Text>
                      </HStack>
                      <SettingInputGroup>
                        <SettingInput
                          type="text"
                          value={nickname}
                          onChange={(e) => {
                            setnickname(e.target.value);
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
                ) : pagestatus === PageStatus.REMAIN_RESOURCES ? (
                  <TableContainer mt={'24px'}>
                    <Table color={'grayModern.600'} fontSize={'12px'} fontWeight={500}>
                      <Thead>
                        <Tr>
                          {[
                            t('common:region'),
                            t('common:team'),
                            appT('app_type'),
                            t('common:link')
                          ].map((t, index, arr) => (
                            <Th
                              bgColor={'grayModern.100'}
                              borderLeftRadius={index === 0 ? '6px' : '0px'}
                              borderRightRadius={index === arr.length - 1 ? '6px' : '0px'}
                              border="none"
                              key={t}
                            >
                              {t}
                            </Th>
                          ))}
                        </Tr>
                      </Thead>
                      <Tbody>
                        {(mutationCheck.data?.data?.regionResourceList || [])
                          .flatMap((item) =>
                            item.resource
                              .filter((item) => [1, 2, 4, 6, 7, 8].includes(item.type))
                              .map(
                                (resouce) =>
                                  [
                                    item.region.displayName,
                                    resouce.workspace.displayName,
                                    appType[resouce.type],
                                    generateURL(resouce, item.region.domain)
                                  ] as const
                              )
                          )
                          .map((item, index) => (
                            <Tr key={index}>
                              {[
                                <Text key={0}>{cloudProvidersT(item[0] as any)}</Text>,
                                <Text key={1}>{item[1]}</Text>,
                                <Text key={2}>{item[2]}</Text>,
                                item[3] ? (
                                  <IconButton
                                    icon={<LinkIcon />}
                                    minW={'auto'}
                                    variant={'ghost'}
                                    boxSize={'32px'}
                                    color={'grayModern.600'}
                                    aria-label={''}
                                    onClick={() => {
                                      window.open(item[3], '_self');
                                    }}
                                  />
                                ) : (
                                  <Text key={3}>-</Text>
                                )
                              ].map((item, index) => (
                                <Td borderColor="grayModern.200" py="8px" key={index}>
                                  {item}
                                </Td>
                              ))}
                            </Tr>
                          ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                ) : (
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
                <HStack gap={'12px'} justifyContent={'flex-end'} mt={'24px'}>
                  <Button
                    onClick={onClose}
                    variant={'outline'}
                    p={'8px 19px'}
                    fontSize={'12px'}
                    h="auto"
                    {...props}
                  >
                    {t('common:cancel')}
                  </Button>
                  <Button
                    onClick={async () => {
                      if (pagestatus === PageStatus.IDLE) {
                        const res = await mutationCheck.mutateAsync();
                        const code = res.data?.code || '';
                        if (res.message === RESOURCE_STATUS.REMAIN_RESOURCE) {
                          setPagestatus(PageStatus.REMAIN_RESOURCES);
                          setCode(code);
                        } else if (res.message === RESOURCE_STATUS.RESULT_SUCCESS) {
                          mutationForce.mutate({ code });
                        }
                        setnickname('');
                        setVerifyValue('');
                      } else if (pagestatus === PageStatus.REMAIN_RESOURCES) {
                        // direct to force delete page
                        setPagestatus(PageStatus.FORCE_DELETE);
                      } else {
                        // force delete
                        mutationForce.mutate({ code });
                        setCode('');
                        setForceDeleteValue('');
                        setnickname('');
                        setVerifyValue('');
                        setPagestatus(PageStatus.IDLE);
                      }
                    }}
                    h="auto"
                    variant={'outline'}
                    py={'8px'}
                    px={pagestatus === PageStatus.REMAIN_RESOURCES ? '14px' : '19px'}
                    color={'red.600'}
                    fontSize={'12px'}
                    {...props}
                  >
                    {pagestatus === PageStatus.REMAIN_RESOURCES
                      ? t('common:delete_account_force_button')
                      : t('common:delete_account_button')}
                  </Button>
                </HStack>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

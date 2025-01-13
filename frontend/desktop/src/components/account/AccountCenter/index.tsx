import { UserInfo } from '@/api/auth';
import PasswordModify from '@/components/account/AccountCenter/PasswordModify';
import { useConfigStore } from '@/stores/config';
import useSessionStore from '@/stores/session';
import { ValueOf } from '@/types';
import {
  Badge,
  Center,
  Flex,
  HStack,
  IconButton,
  IconButtonProps,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  useDisclosure,
  VStack
} from '@chakra-ui/react';
import { CloseIcon, LeftArrowIcon, SettingIcon } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useMemo, useState } from 'react';
import { RealNameAuthForm } from '../RealNameModal';
import { AuthModifyList } from './AuthModifyList';
import { BINDING_STATE_MODIFY_BEHAVIOR, BindingModifyButton } from './BindingModifyButton';
import { ConfigItem } from './ConfigItem';
import DeleteAccount from './DeleteAccountModal';
import { EmailBind, PhoneBind } from './SmsModify/SmsBind';
import { EmailChange, PhoneChange } from './SmsModify/SmsChange';
import { EmailUnBind, PhoneUnBind } from './SmsModify/SmsUnbind';
enum _PageState {
  INDEX = 0
  // WECHAT_BIND,
  // WECHAT_UNBIND,
  // GITHUB_UNBIND,
  // GITHUB_BIND
}
enum PasswordState {
  PASSWORD = 10
}
enum PhoneState {
  PHONE_BIND = 20,
  PHONE_UNBIND,
  PHONE_CHANGE_BIND
}
enum EmailState {
  EMAIL_BIND = 30,
  EMAIL_UNBIND,
  EMAIL_CHANGE_BIND
}

enum RealNameState {
  REALNAME_AUTH = 40
}

const PageState = Object.assign(
  Object.assign({}, _PageState, EmailState, PhoneState),
  PasswordState,
  RealNameState
);

export default function Index(props: Omit<IconButtonProps, 'aria-label'>) {
  const { commonConfig } = useConfigStore();
  const { session } = useSessionStore((s) => s);
  const conf = useConfigStore();
  const { t } = useTranslation();
  const logo = '/images/default-user.svg';
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [pageState, setPageState] = useState<ValueOf<typeof PageState>>(PageState.INDEX);
  const resetPageState = () => {
    setPageState(PageState.INDEX);
    infoData.refetch();
  };
  const modalTitle = useMemo(() => {
    if (pageState === PageState.INDEX) return t('common:account_settings');
    else if (pageState === PageState.PASSWORD) return t('common:changepassword');
    else if (Object.values(PhoneState).includes(pageState as PhoneState))
      return t('common:changephone'); // bind or unbind
    else if (Object.values(EmailState).includes(pageState as EmailState))
      return t('common:changeemail');
    else if (pageState === PageState.REALNAME_AUTH) return t('common:realName_verification');
    else return '';
  }, [t, pageState]);

  const infoData = useQuery({
    queryFn: UserInfo,
    queryKey: [session?.token, 'UserInfo'],
    select(d) {
      return d.data?.info;
    }
  });

  const providerState = useMemo(() => {
    const providerList = ['PHONE', 'PASSWORD', 'GITHUB', 'WECHAT', 'GOOGLE', 'EMAIL'] as const;
    const state = (infoData.data?.oauthProvider || []).reduce(
      (pre, cur) => {
        const { providerType, providerId } = cur;
        // @ts-ignore
        if (!providerList.includes(providerType)) return pre;
        // @ts-ignore
        pre[providerType].isBinding = true;
        if (providerType === 'PHONE' || providerType === 'EMAIL') pre[providerType].id = providerId;
        pre.total += 1;
        return pre;
      },
      {
        total: 0,
        PHONE: {
          isBinding: false,
          id: ''
        },
        EMAIL: {
          isBinding: false,
          id: ''
        },
        GITHUB: {
          isBinding: false
        },
        WECHAT: {
          isBinding: false
        },
        GOOGLE: {
          isBinding: false
        },
        PASSWORD: {
          isBinding: false
        },
        AVATAR_URL: ''
      }
    );
    state.AVATAR_URL = infoData.data?.avatarUri || '';
    return state;
  }, [infoData.data?.oauthProvider]);

  return (
    <>
      <IconButton
        aria-label={'setting'}
        cursor={'pointer'}
        borderRadius={'4px'}
        boxSize={'24px'}
        onClick={(e) => {
          e.preventDefault();
          return onOpen();
        }}
        {...props}
        variant={'white-bg-icon'}
        icon={<SettingIcon boxSize={'16px'} fill={'rgba(255, 255, 255, 0.7)'} />}
      />
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
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
            <HStack gap={'5px'}>
              {pageState !== PageState.INDEX && (
                <LeftArrowIcon
                  boxSize={'24px'}
                  cursor={'pointer'}
                  onClick={() => {
                    setPageState(PageState.INDEX);
                  }}
                />
              )}
              <Text fontWeight={'500'} fontSize={'18px'}>
                {modalTitle}
              </Text>
            </HStack>
          </ModalHeader>
          {infoData.isSuccess && infoData.data ? (
            <ModalBody w="100%" py="32px" px={'60px'}>
              {pageState === PageState.INDEX ? (
                <VStack
                  w={'420px'}
                  alignItems={'stretch'}
                  fontSize={'14px'}
                  fontWeight={500}
                  gap={'20px'}
                  color={'grayModern.900'}
                >
                  {/* <ConfigItem/> */}
                  <HStack>
                    <Text w={'120px'}>{t('common:avatar')}</Text>
                    <Flex flex={1}>
                      <Center boxSize={'48px'} bg={'grayModern.150'} borderRadius="full">
                        <Image
                          objectFit={'cover'}
                          borderRadius="full"
                          src={infoData.data.avatarUri}
                          fallbackSrc={logo}
                          alt="user avator"
                          draggable={'false'}
                        />
                      </Center>
                    </Flex>
                  </HStack>
                  <HStack>
                    <Text w={'120px'}>{t('common:nickname')}</Text>
                    <Flex flex={1}>{infoData.data.nickname}</Flex>
                  </HStack>
                  <HStack>
                    <Text w={'120px'}>{'ID'}</Text>
                    <Flex flex={1}>{infoData.data.id}</Flex>
                  </HStack>
                  {commonConfig?.realNameAuthEnabled && (
                    <ConfigItem
                      LeftElement={<Text>{t('common:realname_info')}</Text>}
                      RightElement={
                        infoData.data.enterpriseVerificationStatus === 'Success' ||
                        infoData.data.realName ? (
                          <Flex flex={1}>
                            <Text
                              maxWidth="200px"
                              whiteSpace="nowrap"
                              overflow="hidden"
                              textOverflow="ellipsis"
                            >
                              {infoData?.data.enterpriseRealName || infoData?.data.realName}
                            </Text>
                          </Flex>
                        ) : (
                          <Badge
                            cursor="pointer"
                            _active={{ transform: 'scale(0.95)' }}
                            colorScheme="red"
                            onClick={() => setPageState(PageState.REALNAME_AUTH)}
                          >
                            {t('common:no_realname_auth')} <CloseIcon boxSize={3} ml={1} />
                          </Badge>
                        )
                      }
                    />
                  )}
                  {conf.authConfig?.idp.password.enabled && providerState.PASSWORD.isBinding && (
                    <ConfigItem
                      LeftElement={<Text>{t('common:password')}</Text>}
                      RightElement={
                        <>
                          <Text>*********</Text>
                          <BindingModifyButton
                            modifyBehavior={BINDING_STATE_MODIFY_BEHAVIOR.CHANGE_BINDING}
                            onClick={() => {
                              setPageState(PageState.PASSWORD);
                            }}
                          />
                        </>
                      }
                    />
                  )}
                  {conf.authConfig?.idp.sms.enabled && conf.authConfig.idp.sms.ali.enabled && (
                    <ConfigItem
                      LeftElement={<Text>{t('common:phone')}</Text>}
                      RightElement={
                        <>
                          <Text>
                            {providerState.PHONE.isBinding
                              ? providerState.PHONE.id.replace(/(\d{3})\d+(\d{4})/, '$1****$2')
                              : t('common:unbound')}
                          </Text>
                          <Flex gap={'5px'}>
                            <BindingModifyButton
                              modifyBehavior={
                                providerState.PHONE.isBinding
                                  ? BINDING_STATE_MODIFY_BEHAVIOR.CHANGE_BINDING
                                  : BINDING_STATE_MODIFY_BEHAVIOR.BINDING
                              }
                              onClick={() => {
                                providerState.PHONE.isBinding
                                  ? setPageState(PageState.PHONE_CHANGE_BIND)
                                  : setPageState(PageState.PHONE_BIND);
                              }}
                            />
                            {providerState.PHONE.isBinding && providerState.total > 1 && (
                              <BindingModifyButton
                                modifyBehavior={BINDING_STATE_MODIFY_BEHAVIOR.UNBINDING}
                                onClick={() => {
                                  setPageState(PageState.PHONE_UNBIND);
                                }}
                              />
                            )}
                          </Flex>
                        </>
                      }
                    />
                  )}
                  {conf.authConfig?.idp.sms.enabled && conf.authConfig.idp.sms.email.enabled && (
                    <ConfigItem
                      LeftElement={<Text>{t('common:email')}</Text>}
                      RightElement={
                        <>
                          <Text>
                            {providerState.EMAIL.isBinding
                              ? providerState.EMAIL.id.replace(/(\d{3})\d+(\d{4})/, '$1****$2')
                              : t('common:unbound')}
                          </Text>
                          <Flex gap={'5px'}>
                            <BindingModifyButton
                              modifyBehavior={
                                providerState.EMAIL.isBinding
                                  ? BINDING_STATE_MODIFY_BEHAVIOR.CHANGE_BINDING
                                  : BINDING_STATE_MODIFY_BEHAVIOR.BINDING
                              }
                              onClick={() => {
                                providerState.EMAIL.isBinding
                                  ? setPageState(PageState.EMAIL_CHANGE_BIND)
                                  : setPageState(PageState.EMAIL_BIND);
                              }}
                            />
                            {providerState.EMAIL.isBinding && providerState.total > 1 && (
                              <BindingModifyButton
                                modifyBehavior={BINDING_STATE_MODIFY_BEHAVIOR.UNBINDING}
                                onClick={() => {
                                  setPageState(PageState.EMAIL_UNBIND);
                                }}
                              />
                            )}
                          </Flex>
                        </>
                      }
                    />
                  )}
                  <AuthModifyList
                    avatarUrl={infoData.data.avatarUri}
                    isOnlyOne={providerState.total === 1}
                    GITHUBIsBinding={providerState.GITHUB.isBinding}
                    GOOGLEIsBinding={providerState.GOOGLE.isBinding}
                    WECHATIsBinding={providerState.WECHAT.isBinding}
                  />
                  <ConfigItem
                    LeftElement={<Text>{t('common:delete_account')}</Text>}
                    RightElement={
                      <>
                        <Text>{t('common:delete_account_tips')}</Text>
                        <DeleteAccount />
                      </>
                    }
                  />
                </VStack>
              ) : (
                <VStack
                  w={'420px'}
                  alignItems={'stretch'}
                  fontSize={'14px'}
                  fontWeight={400}
                  gap={'20px'}
                  color={'grayModern.900'}
                >
                  {pageState === PageState.PASSWORD ? (
                    <PasswordModify onClose={resetPageState} />
                  ) : pageState === PageState.PHONE_BIND ? (
                    <PhoneBind onClose={resetPageState} />
                  ) : pageState === PageState.PHONE_UNBIND ? (
                    <PhoneUnBind onClose={resetPageState} />
                  ) : pageState === PageState.PHONE_CHANGE_BIND ? (
                    <PhoneChange onClose={resetPageState} />
                  ) : pageState === PageState.EMAIL_BIND ? (
                    <EmailBind onClose={resetPageState} />
                  ) : pageState === PageState.EMAIL_UNBIND ? (
                    <EmailUnBind onClose={resetPageState} />
                  ) : pageState === PageState.EMAIL_CHANGE_BIND ? (
                    <EmailChange onClose={resetPageState} />
                  ) : pageState === PageState.REALNAME_AUTH ? (
                    <RealNameAuthForm onFormSuccess={resetPageState} />
                  ) : null}
                </VStack>
              )}
            </ModalBody>
          ) : (
            <Center h="100%">
              <Spinner />
            </Center>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}

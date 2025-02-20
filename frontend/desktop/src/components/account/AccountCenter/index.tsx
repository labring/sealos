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
                        infoData.data.enterpriseRealName || infoData.data.realName ? (
                          <Flex flex={1} alignItems="center" gap="4px">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="17"
                              viewBox="0 0 16 17"
                              fill="none"
                            >
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M12.6667 4.43778L8.41778 2.98243C8.13698 2.88625 7.83213 2.88651 7.55151 2.98317L3.33333 4.43606V9.42245C3.33333 11.9998 5.42267 14.0891 8 14.0891C10.5773 14.0891 12.6667 11.9998 12.6667 9.42245V4.43778ZM2.31306 3.37727C2.12574 3.44179 2 3.61808 2 3.81621V9.42245C2 12.7362 4.68629 15.4225 8 15.4225C11.3137 15.4225 14 12.7362 14 9.42245V3.81679C14 3.61838 13.8739 3.44191 13.6862 3.37761L8.84983 1.72104C8.28825 1.52868 7.67854 1.5292 7.11729 1.72252L2.31306 3.37727ZM5.10471 7.85479C5.36506 7.59444 5.78717 7.59444 6.04752 7.85479L7.58137 9.38864L10.4987 6.47126C10.7591 6.21091 11.1812 6.21091 11.4416 6.47126C11.7019 6.73161 11.7019 7.15372 11.4416 7.41407L8.05518 10.8005C8.04844 10.8072 8.0416 10.8137 8.03465 10.8201C7.7732 11.063 7.3643 11.0572 7.10987 10.8028L5.10471 8.7976C4.84436 8.53725 4.84436 8.11514 5.10471 7.85479Z"
                                fill="#039855"
                              />
                            </svg>
                            <Text
                              maxWidth="200px"
                              whiteSpace="nowrap"
                              overflow="hidden"
                              textOverflow="ellipsis"
                              color="var(--light-general-on-surface-lowest, var(--Gray-Modern-500, #667085))"
                              fontFamily="PingFang SC"
                              fontSize="14px"
                              fontStyle="normal"
                              fontWeight={500}
                              lineHeight="20px"
                              letterSpacing="0.1px"
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
                            display="flex"
                            padding="4px 4px 4px 8px"
                            justifyContent="center"
                            alignItems="center"
                            gap="2px"
                            borderRadius="6px"
                            bg="var(--Red-50, #FEF3F2)"
                            color="var(--Red-500, #F04438)"
                            fontFamily="PingFang SC"
                            fontSize="14px"
                            fontStyle="normal"
                            fontWeight="500"
                            lineHeight="20px"
                            letterSpacing="0.1px"
                            textTransform="none"
                          >
                            {t('common:no_realname_auth')}
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="17"
                              viewBox="0 0 16 17"
                              fill="none"
                            >
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M5.52876 4.02876C5.26841 4.28911 5.26841 4.71122 5.52876 4.97157L9.05735 8.50016L5.52876 12.0288C5.26841 12.2891 5.26841 12.7112 5.52876 12.9716C5.78911 13.2319 6.21122 13.2319 6.47157 12.9716L10.4716 8.97157C10.7319 8.71122 10.7319 8.28911 10.4716 8.02876L6.47157 4.02876C6.21122 3.76841 5.78911 3.76841 5.52876 4.02876Z"
                                fill="#F04438"
                              />
                            </svg>
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

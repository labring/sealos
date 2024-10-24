import Iconfont from '@/components/iconfont';
import request from '@/services/request';
import useAppStore from '@/stores/app';
import { formatTime } from '@/utils/tools';
import { Box, Button, Flex, Text, UseDisclosureReturn } from '@chakra-ui/react';
import { ClearOutlineIcon, CloseIcon, NotificationIcon, WarnIcon, useMessage } from '@sealos/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { produce } from 'immer';
import { useTranslation } from 'next-i18next';
import { useEffect, useRef, useState } from 'react';
import styles from './index.module.scss';
import { TNotification } from '@/types';
import { listNotification } from '@/api/platform';

type NotificationProps = {
  disclosure: UseDisclosureReturn;
  onAmount: (amount: number) => void;
};

export default function Notification(props: NotificationProps) {
  const { t, i18n } = useTranslation();
  const { disclosure, onAmount } = props;
  const { installedApps, openApp } = useAppStore();
  const [readNotes, setReadNotes] = useState<TNotification[]>([]);
  const [unReadNotes, setUnReadNotes] = useState<TNotification[]>([]);
  const { message } = useMessage();
  const isForbiddenRef = useRef(false);

  const [MessageConfig, setMessageConfig] = useState<{
    activeTab: 'read' | 'unread';
    activePage: 'index' | 'detail';
    msgDetail?: TNotification;
    popupMessage?: TNotification;
  }>({
    activeTab: 'unread',
    activePage: 'index',
    msgDetail: undefined,
    popupMessage: undefined
  });

  const { refetch } = useQuery(['getNotifications'], () => listNotification(), {
    onSuccess: (data) => {
      if (data.data) {
        handleNotificationData(data.data);
      }
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 5 * 60 * 1000
  });

  const compareByTimestamp = (a: TNotification, b: TNotification) => b?.timestamp - a?.timestamp;

  const handleNotificationData = (data: TNotification[]) => {
    const unReadMessage = data.filter((item) => !item.isRead);
    const readMessage = data.filter((item) => item.isRead);

    unReadMessage.sort(compareByTimestamp);
    readMessage.sort(compareByTimestamp);

    if (unReadMessage?.[0]?.desktopPopup && !isForbiddenRef.current) {
      setMessageConfig(
        produce((draft) => {
          draft.popupMessage = unReadMessage[0];
        })
      );
    }

    onAmount(unReadMessage?.length || 0);
    setReadNotes(readMessage);
    setUnReadNotes(unReadMessage);
  };

  const notifications = MessageConfig.activeTab === 'unread' ? unReadNotes : readNotes;

  const readMsgMutation = useMutation({
    mutationFn: (name: string[]) =>
      request.post<{ code: number; reason: string }>('/api/notification/read', { name }),
    onSettled: () => refetch(),
    onSuccess: (data) => {
      if (data.data.code === 403) {
        isForbiddenRef.current = true;
        message({
          status: 'warning',
          title: data.data.reason
        });
        setMessageConfig(
          produce((draft) => {
            draft.popupMessage = undefined;
          })
        );
      }
    }
  });

  const goMsgDetail = (item: TNotification) => {
    if (MessageConfig.activeTab === 'unread') {
      readMsgMutation.mutate([item?.name]);
    }
    setMessageConfig(
      produce((draft) => {
        draft.activePage = 'detail';
        draft.msgDetail = item;
        draft.popupMessage = undefined;
      })
    );
  };

  const markAllAsRead = () => {
    const names = unReadNotes?.map((item: TNotification) => item?.name);
    readMsgMutation.mutate(names);
    setMessageConfig(
      produce((draft) => {
        draft.popupMessage = undefined;
      })
    );
  };

  const handleCharge = () => {
    const costCenter = installedApps.find((i) => i.key === 'system-costcenter');
    if (!costCenter) return;
    openApp(costCenter, {
      query: {
        openRecharge: 'true'
      }
    });
  };

  const resetMessageState = () => {
    setMessageConfig(
      produce((draft) => {
        draft.activeTab = 'unread';
        draft.activePage = 'index';
        draft.msgDetail = undefined;
      })
    );
    disclosure.onClose();
  };

  useEffect(() => {
    if (i18n.language) {
      refetch();
    }
  }, [i18n.language, refetch]);

  const getNotificationIcon = (from: string | undefined) => {
    switch (from) {
      case 'Debt-System':
        return <WarnIcon />;
      case 'Active-System':
        return '🎉';
      default:
        return <NotificationIcon color={'brightBlue.300'} />;
    }
  };

  return disclosure.isOpen ? (
    <>
      <Box className={styles.bg} onClick={resetMessageState} cursor={'auto'}></Box>
      <Box className={clsx(styles.container)}>
        <Flex
          className={clsx(styles.title)}
          h={'32px'}
          alignItems={'center'}
          justifyContent={'center'}
          position="relative"
        >
          <Box
            className={clsx(styles.back_btn)}
            onClick={() =>
              setMessageConfig(
                produce((draft) => {
                  draft.activePage = 'index';
                })
              )
            }
            data-active={MessageConfig.activePage}
          >
            <Iconfont iconName="icon-left" color="#239BF2" width={32} height={32} />
          </Box>
          <Text>
            {MessageConfig.activePage === 'index'
              ? t('common:message_center')
              : MessageConfig.msgDetail?.i18n[i18n.language]?.title}
          </Text>
        </Flex>
        {MessageConfig.activePage === 'index' ? (
          <>
            <Flex alignItems={'center'}>
              <Box
                className={clsx(MessageConfig.activeTab === 'unread' && styles.active, styles.tab)}
                onClick={() =>
                  setMessageConfig(
                    produce((draft) => {
                      draft.activeTab = 'unread';
                    })
                  )
                }
              >
                {t('common:unread')} ({unReadNotes?.length || 0})
              </Box>
              <Box
                ml={'12px'}
                className={clsx(MessageConfig.activeTab === 'read' && styles.active, styles.tab)}
                onClick={() =>
                  setMessageConfig(
                    produce((draft) => {
                      draft.activeTab = 'read';
                    })
                  )
                }
              >
                {t('common:have_read')}
              </Box>
              <Button
                ml={'auto'}
                onClick={() => markAllAsRead()}
                variant={'white-bg-icon'}
                leftIcon={<ClearOutlineIcon color={'rgba(255, 255, 255, 0.60)'} />}
                iconSpacing="4px"
                borderRadius={'4px'}
              >
                <Text className={styles.tab}>{t('common:read_all')}</Text>
              </Button>
            </Flex>
            <Flex pt={'9px'} pb="12px" direction={'column'} h="430px" className={styles.scrollWrap}>
              {notifications?.map((item: TNotification) => {
                return (
                  <Flex
                    mt={'8px'}
                    direction={'column'}
                    className={clsx(styles.message)}
                    key={item?.uid}
                    onClick={() => goMsgDetail(item)}
                  >
                    <Text className={styles.title}>{item.i18n[i18n.language]?.title}</Text>
                    <Text flexShrink={0} mt="4px" noOfLines={1} className={clsx(styles.desc)}>
                      {item.i18n[i18n.language]?.message}
                    </Text>
                    <Flex
                      mt="4px"
                      justifyContent={'space-between'}
                      className={clsx(styles.desc, styles.footer)}
                    >
                      <Text>
                        {t('common:from')}「{item.i18n[i18n.language]?.from}」
                      </Text>
                      <Text>{formatTime((item?.timestamp || 0) * 1000, 'YYYY-MM-DD HH:mm')}</Text>
                    </Flex>
                  </Flex>
                );
              })}
            </Flex>
          </>
        ) : (
          <Box
            h="430px"
            w="100%"
            mt="16px"
            p="16px"
            borderRadius={'12px'}
            backgroundColor="rgba(255, 255, 255, 0.9)"
          >
            <Flex
              className={clsx(styles.desc, styles.footer)}
              color="#717D8A"
              fontSize="10px"
              fontWeight="400"
            >
              <Text>
                {t('common:from')}「{MessageConfig.msgDetail?.i18n[i18n.language]?.from}」
              </Text>
              <Box display={'inline-block'} ml={'auto'}>
                {formatTime((MessageConfig.msgDetail?.timestamp || 0) * 1000, 'YYYY-MM-DD HH:mm')}
              </Box>
            </Flex>
            <Text
              whiteSpace="pre-wrap"
              mt="14px"
              fontSize="12px"
              fontWeight={400}
              color="#000000"
              h="300px"
              overflowY="auto"
            >
              {MessageConfig.msgDetail?.i18n[i18n.language]?.message}
            </Text>
            {MessageConfig.msgDetail?.i18n['en']?.from === 'Debt-System' && (
              <Flex justifyContent={'center'} mt="26px">
                <Button
                  w="159px"
                  h="32px"
                  bg="#24282C"
                  borderRadius={'4px'}
                  color={'#FFF'}
                  fontSize={'12px'}
                  variant={'primary'}
                  onClick={() => {
                    resetMessageState();
                    handleCharge();
                  }}
                >
                  {t('common:charge')}
                </Button>
              </Flex>
            )}
          </Box>
        )}
      </Box>
    </>
  ) : (
    <>
      {MessageConfig?.popupMessage && (
        <Box
          cursor={'default'}
          position={'absolute'}
          w="320px"
          h={'170px'}
          top={'48px'}
          right={'0px'}
          bg="rgba(220, 220, 224, 0.05)"
          backdropFilter={'blur(50px)'}
          boxShadow={'0px 15px 20px 0px rgba(0, 0, 0, 0.10)'}
          borderRadius={'12px 0px 12px 12px'}
          p="20px"
          zIndex={9}
          color={'white'}
        >
          <Flex alignItems={'center'}>
            {getNotificationIcon(MessageConfig.popupMessage?.i18n['en']?.from)}
            <Text fontSize={'16px'} fontWeight={600} ml="10px">
              {MessageConfig.popupMessage?.i18n[i18n.language]?.title}
            </Text>
            <CloseIcon
              ml="auto"
              fill={'white'}
              cursor={'pointer'}
              onClick={() => {
                const temp = MessageConfig.popupMessage;
                setMessageConfig(
                  produce((draft) => {
                    draft.popupMessage = undefined;
                  })
                );
                readMsgMutation.mutate([temp?.name || '']);
              }}
            />
          </Flex>
          <Text
            whiteSpace="pre-wrap"
            mt="14px"
            fontSize="12px"
            fontWeight={400}
            className="overflow-auto"
            noOfLines={2}
            height={'36px'}
          >
            {MessageConfig.popupMessage?.i18n[i18n.language]?.message}
          </Text>

          <Flex alignItems={'center'} justifyContent={'end'} mt="18px" gap="8px">
            <Button
              w="78px"
              h="32px"
              bg="rgba(255, 255, 255, 0.20)"
              borderRadius={'4px'}
              variant={'unstyled'}
              color={'white'}
              onClick={() => {
                const temp = MessageConfig.popupMessage;
                setMessageConfig(
                  produce((draft) => {
                    draft.activePage = 'detail';
                    draft.msgDetail = temp;
                    draft.popupMessage = undefined;
                  })
                );
                readMsgMutation.mutate([temp?.name || '']);
                disclosure.onOpen();
              }}
            >
              {t('common:detail')}
            </Button>
            {MessageConfig.msgDetail?.i18n['en']?.from === 'Debt-System' && (
              <Button
                w="78px"
                h="32px"
                variant={'unstyled'}
                bg={'white'}
                color={'grayModern.900'}
                borderRadius={'4px'}
                onClick={() => {
                  const temp = MessageConfig.popupMessage;
                  setMessageConfig(
                    produce((draft) => {
                      draft.popupMessage = undefined;
                    })
                  );
                  readMsgMutation.mutate([temp?.name || '']);
                  handleCharge();
                }}
              >
                {t('common:charge')}
              </Button>
            )}
          </Flex>
        </Box>
      )}
    </>
  );
}

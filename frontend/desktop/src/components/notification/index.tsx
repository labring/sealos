import { Box, Flex, Text, Img, UseDisclosureReturn } from '@chakra-ui/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import Iconfont from '@/components/iconfont';
import { useMemo, useState } from 'react';
import request from '@/services/request';
import { formatTime } from '@/utils/tools';
import styles from './index.module.scss';
import { useTranslation } from 'next-i18next';
import warnIcon from 'public/icons/clear-outlined.svg';

type NotificationItem = {
  metadata: {
    creationTimestamp: string;
    labels: {
      isRead: string;
    };
    name: string;
    namespace: string;
    uid: string;
  };
  spec: {
    from: string;
    message: string;
    timestamp: number;
    title: string;
  };
};

type TNotification = {
  disclosure: UseDisclosureReturn;
  onAmount: (amount: number) => void;
};

export default function Notification(props: TNotification) {
  const { t } = useTranslation();
  const { disclosure, onAmount } = props;
  const [activeTab, setActiveTab] = useState<'read' | 'unread'>('unread');
  const [activePage, setActivePage] = useState<'index' | 'detail'>('index');
  const [msgDetail, setMsgDetail] = useState<NotificationItem>();
  const [notification, setNotification] = useState([]);

  const { refetch } = useQuery(['getAwsAll'], () => request('/api/notification/list'), {
    onSuccess: (data) => {
      onAmount(
        data?.data?.items?.filter(
          (item: NotificationItem) => !JSON.parse(item?.metadata?.labels?.isRead || 'false')
        )?.length || 0
      );
      setNotification(data?.data?.items);
    },
    refetchInterval: 1 * 60 * 1000
  });

  const [unread_notes, read_notes] = useMemo(() => {
    const unread: NotificationItem[] = [];
    const read: NotificationItem[] = [];

    notification?.forEach((item: NotificationItem) => {
      JSON.parse(item?.metadata?.labels?.isRead || 'false') ? read.push(item) : unread.push(item);
    });

    const compareByTimestamp = (a: NotificationItem, b: NotificationItem) =>
      b?.spec?.timestamp - a?.spec?.timestamp;

    return [unread.sort(compareByTimestamp), read.sort(compareByTimestamp)];
  }, [notification]);

  const notifications = activeTab === 'unread' ? unread_notes : read_notes;

  const readMsgMutation = useMutation({
    mutationFn: (name: string[]) => request.post('/api/notification/read', { name }),
    onSettled: () => refetch()
  });

  const goMsgDetail = (item: NotificationItem) => {
    if (activeTab === 'unread') {
      readMsgMutation.mutate([item?.metadata?.name]);
    }
    setActivePage('detail');
    setMsgDetail(item);
  };

  const markAllAsRead = () => {
    const names = unread_notes?.map((item: NotificationItem) => item?.metadata?.name);
    readMsgMutation.mutate(names);
  };

  return disclosure.isOpen ? (
    <>
      <Box className={styles.bg} onClick={disclosure.onClose} cursor={'auto'}></Box>
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
            onClick={() => setActivePage('index')}
            data-active={activePage}
          >
            <Iconfont iconName="icon-left" color="#239BF2" width={32} height={32} />
          </Box>
          <Text>{activePage === 'index' ? t('Message Center') : msgDetail?.spec?.title}</Text>
        </Flex>
        {activePage === 'index' ? (
          <>
            <Flex alignItems={'center'}>
              <Box
                className={clsx(activeTab === 'unread' && styles.active, styles.tab)}
                onClick={() => setActiveTab('unread')}
              >
                {t('Unread')} ({unread_notes?.length || 0})
              </Box>
              <Box
                ml={'12px'}
                className={clsx(activeTab === 'read' && styles.active, styles.tab)}
                onClick={() => setActiveTab('read')}
              >
                {t('Have Read')}
              </Box>
              <Flex ml={'auto'} onClick={() => markAllAsRead()}>
                <Img src={warnIcon.src}></Img>
                <Text ml="4px" color={'#434F61'} className={styles.tab}>
                  {t('Read All')}
                </Text>
              </Flex>
            </Flex>
            <Flex pt={'9px'} pb="12px" direction={'column'} h="430px" className={styles.scrollWrap}>
              {notifications?.map((item: NotificationItem) => {
                return (
                  <Flex
                    mt={'8px'}
                    direction={'column'}
                    className={clsx(styles.message)}
                    key={item?.metadata?.uid}
                    onClick={() => goMsgDetail(item)}
                  >
                    <Text className={styles.title}>{item?.spec?.title}</Text>
                    <Text flexShrink={0} mt="4px" noOfLines={1} className={clsx(styles.desc)}>
                      {item?.spec?.message}
                    </Text>
                    <Flex
                      mt="4px"
                      justifyContent={'space-between'}
                      className={clsx(styles.desc, styles.footer)}
                    >
                      <Text>
                        {t('From')}「{item?.spec?.from}」
                      </Text>
                      <Text>
                        {formatTime((item?.spec?.timestamp || 0) * 1000, 'YYYY-MM-DD HH:mm')}
                      </Text>
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
                {t('From')}「{msgDetail?.spec?.from}」
              </Text>
              <Box display={'inline-block'} ml={'auto'}>
                {formatTime((msgDetail?.spec?.timestamp || 0) * 1000, 'YYYY-MM-DD HH:mm')}
              </Box>
            </Flex>
            <Text
              whiteSpace="pre-wrap"
              mt="14px"
              fontSize="12px"
              fontWeight={400}
              color="#000000"
              className="overflow-auto"
            >
              {msgDetail?.spec?.message}
            </Text>
          </Box>
        )}
      </Box>
    </>
  ) : (
    <></>
  );
}

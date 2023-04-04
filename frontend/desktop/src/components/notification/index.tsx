import { Box, Flex, Text } from '@chakra-ui/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import Iconfont from 'components/iconfont';
import { useEffect, useMemo, useState } from 'react';
import request from 'services/request';
import { formatTime } from 'utils/format';
import styles from './index.module.scss';

type NotificationItem = {
  metadata: {
    creationTimestamp: string;
    labels?: {
      isRead?: boolean;
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
  isShow: boolean;
  onClose: () => void;
  onAmount: (amount: number) => void;
};

export default function Notification(props: TNotification) {
  const { isShow, onClose, onAmount } = props;
  const [activeTab, setActiveTab] = useState<'read' | 'unread'>('unread');
  const [activePage, setActivePage] = useState<'index' | 'detail'>('index');
  const [msgDetail, setMsgDetail] = useState<NotificationItem>();
  const [notification, setNotification] = useState([]);

  const { data, isSuccess, refetch } = useQuery(
    ['getAwsAll'],
    () => request('/api/notification/list'),
    {
      onSuccess: (data) => {
        onAmount(
          data?.data?.items?.filter((item: NotificationItem) => !item?.metadata?.labels?.isRead)
            ?.length || 0
        );
        setNotification(data?.data?.items);
      }
    }
  );

  const unread_notes = useMemo(
    () => notification?.filter((item: NotificationItem) => !item?.metadata?.labels?.isRead),
    [notification]
  );

  const read_notes = useMemo(
    () => notification?.filter((item: NotificationItem) => item?.metadata?.labels?.isRead),
    [notification]
  );

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

  return (
    <>
      <div
        className={styles.bg}
        onClick={() => onClose()}
        style={{
          display: isShow ? 'block' : 'none'
        }}
      ></div>
      <div className={clsx(styles.container)} data-show={isShow}>
        <Flex
          className={clsx(styles.title)}
          h={'32px'}
          alignItems={'center'}
          justifyContent={'center'}
          position="relative"
        >
          <div
            className={clsx(styles.back_btn, activePage === 'index' ? 'hidden' : 'absolute left-0')}
            onClick={() => setActivePage('index')}
          >
            <Iconfont iconName="icon-left" color="#239BF2" width={32} height={32} />
          </div>
          <div>{activePage === 'index' ? '消息中心' : msgDetail?.spec?.title}</div>
        </Flex>
        {activePage === 'index' ? (
          <>
            <Flex>
              <div
                className={clsx(activeTab === 'unread' && styles.active, styles.tab)}
                onClick={() => setActiveTab('unread')}
              >
                未读 ({unread_notes?.length || 0})
              </div>
              <div
                className={clsx(activeTab === 'read' && styles.active, styles.tab, 'ml-4')}
                onClick={() => setActiveTab('read')}
              >
                已读
              </div>
              <Text
                color={'#434F61'}
                className={clsx(styles.tab, 'ml-auto')}
                onClick={() => markAllAsRead()}
              >
                全部已读
              </Text>
            </Flex>
            <Flex direction={'column'} h="430px" className={clsx(styles.scrollWrap, 'pt-3 pb-4')}>
              {notifications?.map((item: NotificationItem) => {
                return (
                  <Flex
                    mt={'8px'}
                    direction={'column'}
                    className={clsx(styles.message)}
                    key={item?.metadata?.uid}
                    onClick={() => goMsgDetail(item)}
                  >
                    <div className={styles.title}>{item?.spec?.title}</div>
                    <Text mt="4px" noOfLines={1} className={clsx(styles.desc)}>
                      {item?.spec?.message}
                    </Text>
                    <Flex className={clsx(styles.desc, styles.footer)}>
                      <div>来自「{item?.spec?.from}」</div>
                      <div className="inline-block ml-auto">
                        {formatTime(item?.spec?.timestamp || '', 'YYYY-MM-DD HH:mm')}
                      </div>
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
              <div>来自「{msgDetail?.spec?.from}」</div>
              <div className="inline-block ml-auto">
                {formatTime(msgDetail?.spec?.timestamp || '', 'YYYY-MM-DD HH:mm')}
              </div>
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
      </div>
    </>
  );
}

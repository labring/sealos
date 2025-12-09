import { getGlobalNotification } from '@/api/platform';
import { Alert, AlertIcon, AlertDescription, CloseButton, Box } from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { Info, X } from 'lucide-react';
import { useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useGlobalNotificationStore } from '@/stores/globalNotification';
import DOMPurify from 'dompurify';

function GlobalNotificationComponent() {
  const { i18n } = useTranslation();
  const { message } = useMessage();
  const { closedNotificationId, setClosedNotificationId } = useGlobalNotificationStore();

  const { data: notification } = useQuery({
    queryKey: ['globalNotification'],
    queryFn: async () => {
      const { data } = await getGlobalNotification();
      return data;
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: 30 * 60 * 1000,
    retry: 1,
    enabled: true
  });

  useEffect(() => {
    if (!notification || !notification.licenseFrontend) return;

    const title = notification?.i18n[i18n?.language]?.title;
    message({
      title: title,
      status: 'info',
      isClosable: true
    });
  }, [notification, i18n?.language, message]);

  if (!notification || notification.licenseFrontend) {
    return null;
  }

  const notificationId = notification?.uid;
  if (!notificationId) {
    return null;
  }
  if (closedNotificationId === notificationId) {
    return null;
  }

  const rawContent = notification?.i18n[i18n?.language]?.title || '';
  const sanitizedContent = DOMPurify.sanitize(rawContent);

  const handleClose = () => {
    setClosedNotificationId(notificationId);
  };

  return (
    <Box padding={'8px'} paddingBlockEnd={'0'} marginBottom={'-6px'}>
      <Alert
        status="warning"
        variant="subtle"
        rounded={'0.75rem'}
        backgroundColor={'#FFF7ED'}
        border={'1px solid #FED7AA'}
        fontSize={'0.875rem'}
        lineHeight={'1.25rem'}
      >
        <AlertIcon color={'#EA580C'}>
          <Info />
        </AlertIcon>
        <AlertDescription width={'full'} dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
        <CloseButton size={'24px'} alignSelf="center" position="relative" onClick={handleClose}>
          <X size={16} />
        </CloseButton>
      </Alert>
    </Box>
  );
}

export const GlobalNotification = memo(GlobalNotificationComponent);

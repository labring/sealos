import { getGlobalNotification } from '@/api/platform';
import { Alert, AlertIcon, AlertDescription, CloseButton, Box } from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { Info } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useGlobalNotificationStore } from '@/stores/globalNotification';
import DOMPurify from 'dompurify';

export function GlobalNotification() {
  const { i18n } = useTranslation();
  const { message } = useMessage();
  const { closedNotificationId, setClosedNotificationId } = useGlobalNotificationStore();

  const { data: notification } = useQuery({
    queryKey: ['globalNotification'],
    queryFn: async () => {
      const { data } = await getGlobalNotification();
      return data;
    }
  });

  // Show popup notification for licenseFrontend notifications
  useEffect(() => {
    if (!notification || !notification.licenseFrontend) return;

    const title = notification?.i18n[i18n?.language]?.title;
    message({
      title: title,
      status: 'info',
      isClosable: true
    });
  }, [notification, i18n?.language, message]);

  // Checks for banner display
  if (!notification || notification.licenseFrontend) {
    return null;
  }

  const notificationId = notification?.uid;
  if (!notificationId) {
    return null;
  }

  // Don't show if closed
  if (closedNotificationId === notificationId) {
    return null;
  }

  // Why use `title`? But it's the current behavior, let's keep it.
  const rawContent = notification?.i18n[i18n?.language]?.title || '';
  const sanitizedContent = DOMPurify.sanitize(rawContent);

  const handleClose = () => {
    setClosedNotificationId(notificationId);
  };

  return (
    <Box padding={'8px'} paddingBlockEnd={'0'}>
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
        <CloseButton alignSelf="center" position="relative" onClick={handleClose} />
      </Alert>
    </Box>
  );
}

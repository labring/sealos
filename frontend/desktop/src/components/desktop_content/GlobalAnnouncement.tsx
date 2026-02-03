import { getGlobalNotification } from '@/api/platform';
import { Box, Center, Text } from '@chakra-ui/react';
import { ArrowRight, Volume2 } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useGlobalNotificationStore } from '@/stores/globalNotification';
import DOMPurify from 'dompurify';
import { useConfigStore } from '@/stores/config';
import useSessionStore from '@/stores/session';
import { useGuideModalStore } from '@/stores/guideModal';
import { track } from '@sealos/gtm';

function GlobalAnnouncementComponent() {
  const { i18n, t } = useTranslation();
  const { layoutConfig } = useConfigStore();
  const { isGuest } = useSessionStore();
  const { openGuideModal } = useGuideModalStore();

  // Hooks must be called unconditionally
  const { data: notifications } = useQuery({
    queryKey: ['globalNotification'],
    queryFn: async () => {
      const { data } = await getGlobalNotification();
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: 30 * 60 * 1000,
    retry: 1,
    enabled: !!layoutConfig?.common.announcementEnabled
  });

  // Check total switch
  if (!layoutConfig?.common.announcementEnabled) {
    return null;
  }

  // Filter 'Desktop-Announcement' type
  const announcementNotification = notifications?.find((n) => n?.from === 'Desktop-Announcement');

  // Determine content and click handler
  let content: string;
  let onClick: () => void;
  let isHtmlContent = false;

  if (announcementNotification?.uid) {
    // Show notification content (cannot be closed)
    const rawContent = announcementNotification?.i18n[i18n?.language]?.title || '';
    content = DOMPurify.sanitize(rawContent);
    isHtmlContent = true;

    onClick = () => {};
  } else {
    // Show guide message (fallback)
    if (isGuest()) {
      return null;
    }
    content = t('v2:onboard_guide');
    onClick = () => {
      track('announcement_click', {
        module: 'dashboard',
        announcement_id: 'onboarding_guide_prompt'
      });
      openGuideModal();
    };
  }

  return (
    <Center mx={'12px'}>
      <Center
        width={'fit-content'}
        borderRadius={'54px'}
        border={'1px solid rgba(228, 228, 231, 0.50)'}
        bg={'linear-gradient(90deg, rgba(245, 245, 245, 0.20) 0%, rgba(212, 212, 212, 0.20) 100%)'}
        gap={'8px'}
        p={'8px 12px'}
        cursor={'pointer'}
        onClick={onClick}
      >
        <Box position="relative" className="gradient-icon">
          <Volume2 width={16} height={16} />
        </Box>
        <Text
          fontSize={'14px'}
          fontWeight={'500'}
          background={'linear-gradient(120deg, #636363 0%, #000 100%)'}
          backgroundClip={'text'}
          sx={{
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
          {...(isHtmlContent
            ? { dangerouslySetInnerHTML: { __html: content } }
            : { children: content })}
        />
        <Box position="relative" className="gradient-icon">
          <ArrowRight width={16} height={16} />
        </Box>
      </Center>
    </Center>
  );
}

export const GlobalAnnouncement = memo(GlobalAnnouncementComponent);

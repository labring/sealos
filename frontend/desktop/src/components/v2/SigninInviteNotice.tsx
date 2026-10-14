import { Alert, AlertDescription, Button, Text } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import type { SigninInviteIssue } from '@/services/backend/activity/registration';

export default function SigninInviteNotice({
  issue,
  onRetry
}: {
  issue: SigninInviteIssue;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Alert status="warning" flexDirection="column" alignItems="start" gap={2}>
      <AlertDescription>
        {t(`common:activity_invite_${issue}`)}
        <Text mt={1}>{t('common:activity_invite_register_hint')}</Text>
      </AlertDescription>
      {issue === 'error' && (
        <Button variant="link" onClick={onRetry}>
          {t('common:activity_invite_retry')}
        </Button>
      )}
    </Alert>
  );
}

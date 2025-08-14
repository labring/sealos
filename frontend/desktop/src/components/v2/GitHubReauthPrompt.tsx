import { useConfigStore } from '@/stores/config';
import useSessionStore from '@/stores/session';
import { getProxiedOAuth2InitiatorUrl } from '@/utils/oauth2';
import {
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Box,
  VStack,
  Text
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

export function GitHubReauthPrompt({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { authConfig } = useConfigStore();
  const { generateState, setProvider } = useSessionStore();

  const handleGitHubOAuth = () => {
    const githubConf = authConfig?.idp.github;
    if (!githubConf) {
      throw new Error('GitHub configuration not found');
    }

    const state = generateState();

    if (githubConf.proxyAddress) {
      setProvider('GITHUB');
      window.location.href = getProxiedOAuth2InitiatorUrl({
        callbackUrl: authConfig.callbackURL,
        provider: 'GITHUB',
        state,
        proxyAddress: githubConf.proxyAddress,
        id: githubConf.clientID,
        additionalParams: {
          prompt: 'select_account'
        }
      });
    } else {
      window.location.href = `https://github.com/login/oauth/authorize?client_id=${githubConf.clientID}&redirect_uri=${authConfig.callbackURL}&scope=user:email%20read:user&state=${state}&prompt=select_account`;
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t('v2:github_login_failed')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack gap="6">
              <Box>
                <Text fontSize="md">{t('v2:github_login_email_conflict_description')}</Text>
              </Box>
              <VStack w="full" gap="2">
                <Button w="full" onClick={handleGitHubOAuth}>
                  {t('v2:github_reauth_select_account')}
                </Button>
                <Button variant="outline" w="full" onClick={onClose}>
                  {t('v2:change_login_method')}
                </Button>
              </VStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

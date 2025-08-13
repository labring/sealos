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

export function GitHubReauthPrompt({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
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
          <ModalHeader>GitHub 登录失败</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack gap="6">
              <Box>
                <Text fontSize="md">
                  你尝试登录的 GitHub 账户所使用的邮件地址已被另一个 Sealos 账户使用。
                </Text>
                <Text fontSize="md">你可以重新选择 GitHub账户，或换用其他登录方式。</Text>
              </Box>
              <VStack w="full" gap="2">
                <Button w="full" onClick={handleGitHubOAuth}>
                  使用其他 GitHub 账户登录
                </Button>
                <Button variant="outline" w="full" onClick={onClose}>
                  更换登录方式
                </Button>
              </VStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

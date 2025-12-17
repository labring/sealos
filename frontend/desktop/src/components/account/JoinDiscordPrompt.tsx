import { useConfigStore } from '@/stores/config';
import { useJoinDiscordPromptStore } from '@/stores/joinDiscordPrompt';
import {
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Checkbox
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function JoinDiscordPrompt({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();

  const store = useJoinDiscordPromptStore();
  const { layoutConfig } = useConfigStore();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !layoutConfig?.discordInviteLink) {
      return;
    }

    if (!store.dontShowAgain && !store.open && !store.autoOpenBlocked) {
      store.setOpen(true);
    }
  }, [store, isClient, layoutConfig?.discordInviteLink]);

  const handleClose = () => {
    store.setOpen(false);
    // Pervent auto open
    store.blockAutoOpen();
  };

  const handleOpenDiscord = () => {
    window.open(layoutConfig?.discordInviteLink, '_blank');
  };

  if (!layoutConfig?.discordInviteLink) return null;
  return (
    <>
      <div onClick={() => store.setOpen(true)}>{children}</div>
      <Modal isOpen={store.open} onClose={handleClose}>
        <ModalOverlay />
        <ModalContent borderRadius={'16px'} maxW={{ base: '100%', md: '540px' }}>
          <ModalHeader
            style={{
              paddingLeft: '24px',
              paddingRight: '24px',
              paddingTop: '24px',
              paddingBottom: '0',
              border: 'none',
              background: 'none',
              fontSize: '18px',
              fontWeight: 'semibold'
            }}
          >
            {t('v2:join_discord_prompt.title')}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody
            style={{
              padding: '24px'
            }}
          >
            <p style={{ fontSize: '14px' }}>{t('v2:join_discord_prompt.description')}</p>
          </ModalBody>

          <ModalFooter
            style={{
              paddingTop: '0',
              paddingLeft: '24px',
              paddingRight: '24px',
              display: 'flex',
              justifyContent: 'space-between'
            }}
          >
            <Checkbox
              isChecked={store.dontShowAgain}
              onChange={(e) => store.setDontShowAgain(e.target.checked)}
              style={{
                color: '#71717A'
              }}
            >
              {t('v2:join_discord_prompt.do_not_show_again')}
            </Checkbox>

            <div>
              <Button variant="outline" mr={3} onClick={handleClose}>
                {t('v2:join_discord_prompt.cancel')}
              </Button>
              <Button onClick={() => handleOpenDiscord()}>
                {t('v2:join_discord_prompt.join_discord')}
              </Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

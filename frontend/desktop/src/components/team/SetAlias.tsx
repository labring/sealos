import { setAliasRequest } from '@/api/namespace';
import { useCustomToast } from '@/hooks/useCustomToast';
import { ApiResp } from '@/types';
import { TeamUserDto } from '@/types/user';
import {
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Input
} from '@chakra-ui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function SetAlias({
  open,
  onOpenChange,
  targetTeamUser,
  nsUid
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetTeamUser: TeamUserDto | null;
  nsUid: string;
}) {
  const { t } = useTranslation();
  const [alias, setAlias] = useState(targetTeamUser?.alias ?? '');

  const { toast } = useCustomToast({ status: 'error' });
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: setAliasRequest,
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['ns-detail'], exact: false });
      onOpenChange(false);
    },
    onError(error) {
      toast({ title: (error as ApiResp).message });
    }
  });

  return (
    <>
      <Modal isOpen={open} onClose={() => onOpenChange(false)}>
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
            Set Alias
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody
            style={{
              padding: '24px'
            }}
          >
            <Input
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Set alias to help identify member more easily."
              defaultValue={targetTeamUser?.alias}
              width={'full'}
            />
          </ModalBody>

          <ModalFooter
            style={{
              paddingTop: '0',
              paddingLeft: '24px',
              paddingRight: '24px',
              display: 'flex',
              justifyContent: 'flex-end'
            }}
          >
            <div>
              <Button variant="outline" mr={3} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (targetTeamUser) {
                    mutation.mutate({
                      alias: alias.length > 0 ? alias : null,
                      targetUserCrUid: targetTeamUser.crUid,
                      ns_uid: nsUid
                    });
                    return;
                  }

                  onOpenChange(false);
                }}
              >
                Confirm
              </Button>
            </div>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

import React, { useCallback, useMemo, useRef } from 'react';
import {
  Box,
  ModalBody,
  ModalCloseButton,
  BoxProps,
  Flex,
  useTheme,
  Input,
  ModalFooter,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { SEALOS_DOMAIN } from '@/store/static';
import { Tip } from '@sealos/ui';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import { useRequest } from '@/hooks/useRequest';
import { postAuthCname } from '@/api/platform';

export type CustomAccessModalParams = {
  publicDomain: string;
  customDomain: string;
};

const CustomAccessModal = ({
  publicDomain,
  customDomain,
  onClose,
  onSuccess
}: CustomAccessModalParams & { onClose: () => void; onSuccess: (e: string) => void }) => {
  const ref = useRef<HTMLInputElement>(null);
  const theme = useTheme();
  const { t } = useTranslation();

  const titleStyles: BoxProps = {
    fontWeight: 'bold',
    mb: 2
  };

  const completePublicDomain = useMemo(() => `${publicDomain}.${SEALOS_DOMAIN}`, [publicDomain]);

  const { mutate: authCNAME, isLoading } = useRequest({
    mutationFn: async () => {
      const val = ref.current?.value || '';
      if (!val) {
        return onSuccess('');
      }
      await postAuthCname({
        publicDomain: completePublicDomain,
        customDomain: val
      });
      return val;
    },
    onSuccess,
    errorToast: 'Custom Domain Error'
  });

  return (
    <>
      <Modal isOpen onClose={onClose} lockFocusAcrossFrames={false}>
        <ModalOverlay />
        <ModalContent maxH={'90vh'} maxW={'90vw'} width={'530px'}>
          <ModalHeader>{t('Custom Domain')}</ModalHeader>
          <ModalBody>
            <ModalCloseButton />
            <Box {...titleStyles}>CNAME</Box>
            <Flex
              alignItems={'center'}
              h={'35px'}
              bg={'myWhite.500'}
              px={4}
              borderRadius={'md'}
              border={theme.borders.base}
              userSelect={'all'}
            >
              {completePublicDomain}
            </Flex>
            <Box {...titleStyles} mt={7}>
              {t('Custom Domain')}
            </Box>
            <Input
              width={'100%'}
              ref={ref}
              defaultValue={customDomain}
              bg={'myWhite.500'}
              placeholder={t('Input your custom domain') || 'Input your custom domain'}
            />

            <Tip
              mt={3}
              size={'sm'}
              whiteSpace={'pre-wrap'}
              icon={<InfoOutlineIcon />}
              text={`${t('CNAME Tips', { domain: completePublicDomain })}`}
            />
          </ModalBody>
          <ModalFooter>
            <Button width={'80px'} isLoading={isLoading} onClick={authCNAME}>
              {t('Confirm')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default CustomAccessModal;

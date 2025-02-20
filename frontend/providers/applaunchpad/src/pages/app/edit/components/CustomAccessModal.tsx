import React, { useMemo, useRef } from 'react';
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
import { useTranslation } from 'next-i18next';
import { Tip } from '@sealos/ui';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import { useRequest } from '@/hooks/useRequest';
import { postAuthCname } from '@/api/platform';
import { SEALOS_USER_DOMAINS } from '@/store/static';

export type CustomAccessModalParams = {
  publicDomain: string;
  customDomain: string;
  domain: string;
};

const CustomAccessModal = ({
  publicDomain,
  customDomain,
  domain,
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

  const completePublicDomain = useMemo(() => `${publicDomain}.${domain}`, [publicDomain, domain]);

  const cnameTips = useMemo(() => {
    return SEALOS_USER_DOMAINS.map((item) => `${publicDomain}.${item.name}`).join(` ${t('or')} `);
  }, [publicDomain, t]);

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
              text={`${t('CNAME Tips', {
                domain: customDomain ? cnameTips : completePublicDomain
              })}`}
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

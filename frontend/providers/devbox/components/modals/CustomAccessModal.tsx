import { InfoOutlineIcon } from '@chakra-ui/icons';
import {
  Box,
  BoxProps,
  Button,
  Flex,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useTheme
} from '@chakra-ui/react';
import { Tip } from '@sealos/ui';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';

import { postAuthCname } from '@/api/platform';
import { useRequest } from '@/hooks/useRequest';

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
  const t = useTranslations();

  const titleStyles: BoxProps = {
    fontWeight: 'bold',
    mb: 2
  };

  const { mutate: authCNAME, isLoading } = useRequest({
    mutationFn: async () => {
      const val = ref.current?.value || '';
      if (!val) {
        return onSuccess('');
      }
      await postAuthCname({
        publicDomain: publicDomain,
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
              {publicDomain}
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
              text={t('CNAME Tips', { domain: publicDomain })}
            />
          </ModalBody>
          <ModalFooter>
            <Button width={'80px'} isLoading={isLoading} onClick={() => authCNAME()}>
              {t('confirm')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default CustomAccessModal;

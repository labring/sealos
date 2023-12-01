import {
  Text,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useDisclosure,
  ButtonProps,
  SimpleGrid,
  Box,
  IconButton,
  HStack,
  Spinner
} from '@chakra-ui/react';
import ListIcon from '@/components/Icons/ListIcon';
import { initUser } from '@/api/bucket';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from '@/consts';
import { useCopyData } from '@/utils/tools';
import CopyIcon from '@/components/Icons/CopyIcon';
import { useTranslation } from 'next-i18next';
export default function ParamterModal({ ...styles }: ButtonProps) {
  const { onOpen, onClose, isOpen } = useDisclosure();
  const miniouser = useQuery([QueryKey.bucketUser], initUser);
  const { copyData } = useCopyData();
  const { t } = useTranslation();
  return (
    <>
      <Button onClick={onOpen} variant={'secondary'} gap={'8px'} {...styles}>
        <ListIcon w="16px" h="16px" />
        <Text>{t('s3ServiceParams')}</Text>
      </Button>
      <Modal isOpen={isOpen} onClose={onClose} isCentered trapFocus={false}>
        <ModalOverlay />
        <ModalContent
          borderRadius={'4px'}
          maxW={'600px'}
          bgColor={'#FFF'}
          backdropFilter="blur(150px)"
          p="24px"
        >
          <ModalCloseButton right={'24px'} top="24px" p="0" />
          <ModalHeader p="0">{t('s3ServiceParams')}</ModalHeader>
          <ModalBody h="100%" w="100%" p="20px">
            {miniouser.isSuccess ? (
              <SimpleGrid columns={2} spacingY={'15px'} gridTemplateColumns={'auto max-content'}>
                <Box>Access Key</Box>
                <HStack gap="9px">
                  <Text>{miniouser.data.secret.CONSOLE_ACCESS_KEY}</Text>
                  <IconButton
                    aria-label={'copy'}
                    variant={'white-bg-icon'}
                    p="4px"
                    icon={<CopyIcon boxSize={'16px'} />}
                    onClick={() => {
                      console.log(miniouser.data.secret.CONSOLE_ACCESS_KEY);
                      copyData(miniouser.data.secret.CONSOLE_ACCESS_KEY);
                    }}
                  />
                </HStack>
                <Box>Secret Key</Box>
                <HStack gap="9px">
                  <Text>{miniouser.data.secret.CONSOLE_SECRET_KEY}</Text>
                  <IconButton
                    p="4px"
                    aria-label={'copy'}
                    variant={'white-bg-icon'}
                    icon={<CopyIcon boxSize={'16px'} />}
                    onClick={() => copyData(miniouser.data.secret.CONSOLE_SECRET_KEY)}
                  />
                </HStack>
                <Box>Internal</Box>
                <HStack gap="9px">
                  <Text>{miniouser.data?.secret.internal}</Text>
                  <IconButton
                    p="4px"
                    aria-label={'copy'}
                    variant={'white-bg-icon'}
                    icon={<CopyIcon boxSize={'16px'} />}
                    onClick={() => copyData(miniouser.data.secret.internal)}
                  />
                </HStack>
                <Box>External</Box>
                <HStack gap="9px">
                  <Text>{miniouser.data.secret.external}</Text>
                  <IconButton
                    p="4px"
                    aria-label={'copy'}
                    variant={'white-bg-icon'}
                    icon={<CopyIcon boxSize={'16px'} />}
                    onClick={() => copyData(miniouser.data?.secret.external)}
                  />
                </HStack>
              </SimpleGrid>
            ) : (
              <Spinner />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

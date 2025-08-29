import { useTranslation } from 'next-i18next';
import { useRef } from 'react';
import {
  Box,
  Flex,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Alert,
  AlertIcon,
  Badge,
  Button,
  CloseButton,
  HStack,
  Image,
  Text,
  VStack
} from '@chakra-ui/react';

const StopBackupModal = ({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  dbName
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  dbName: string;
}) => {
  const { t } = useTranslation();
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog
      isOpen={isOpen}
      leastDestructiveRef={cancelRef}
      onClose={onClose}
      isCentered
      size="md"
    >
      <AlertDialogOverlay>
        <AlertDialogContent borderRadius="8px" maxW="480px" mx={4}>
          <AlertDialogHeader fontSize="18px" fontWeight="600" pb={4} position="relative">
            <Flex justify="space-between" align="center">
              <Text>{t('backups.stop_backup')}</Text>
              <CloseButton onClick={onClose} size="sm" />
            </Flex>
          </AlertDialogHeader>

          <AlertDialogBody pb={6}>
            <VStack spacing={4} align="stretch">
              <Alert status="warning" borderRadius="6px" bg={'#FEFCE8'}>
                <AlertIcon />
                <Text fontSize="14px" color={'#A16207'}>
                  {t('backups.stop_backup_tip')}
                </Text>
              </Alert>

              <Flex align="center" justify="space-between" p={3} borderRadius="6px" bg="gray.50">
                <HStack spacing={3}>
                  <Box
                    borderRadius="6px"
                    overflow="hidden"
                    bg="white"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    border="1px solid"
                    borderColor="gray.200"
                    w="24px"
                    h="24px"
                  >
                    <Image
                      src="/icons/database.svg"
                      alt="Database"
                      w="16px"
                      h="16px"
                      fallback={<Box w="16px" h="16px" bg="green.500" borderRadius="2px" />}
                    />
                  </Box>
                  <VStack align="start" spacing={0}>
                    <Text fontSize="14px" fontWeight="500" color="gray.900">
                      Database
                    </Text>
                    <Text fontSize="12px" color="gray.600">
                      {t('backups.db_backup_running')}
                    </Text>
                  </VStack>
                </HStack>
                <Badge
                  colorScheme="green"
                  variant="subtle"
                  fontSize="12px"
                  px={2}
                  py={1}
                  borderRadius="4px"
                >
                  {t('backups.backup_running')}
                </Badge>
              </Flex>
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter pt={0}>
            <HStack spacing={3}>
              <Button ref={cancelRef} onClick={onCancel} variant="outline" size="md" px={6}>
                {t('backups.stop_update_cancel')}
              </Button>
              <Button
                onClick={onConfirm}
                bg={'red.600'}
                color="white"
                _hover={{ bg: 'red.700' }}
                size="md"
                px={6}
              >
                {t('backups.stop_backup_confirm')}
              </Button>
            </HStack>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
};

export default StopBackupModal;

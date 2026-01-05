import { restoreBackup } from '@/api/db';
import Tip from '@/components/Tip';
import { BackupItemType } from '@/types/db';
import { getErrText } from '@/utils/tools';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay
} from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { useMutation } from '@tanstack/react-query';
import { customAlphabet } from 'nanoid';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 6);

const RestoreModal = ({
  backupInfo,
  onClose,
  onSuccess
}: {
  backupInfo: BackupItemType;
  onClose: () => void;
  onSuccess?: () => void;
}) => {
  const router = useRouter();
  const { t } = useTranslation();
  const { message: toast } = useMessage();

  // Limit name length.
  const generateDefaultDatabaseName = () => {
    const baseName = `${backupInfo.dbName}-${nanoid()}`;
    return baseName.length > 50 ? baseName.substring(0, 50) : baseName;
  };

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    mode: 'onBlur',
    defaultValues: {
      databaseName: generateDefaultDatabaseName()
    }
  });

  const { mutate: onclickRestore, isLoading } = useMutation({
    mutationFn: ({ databaseName }: { databaseName: string }) => {
      return restoreBackup({
        databaseName,
        backupName: backupInfo.name
      });
    },
    onSuccess() {
      router.replace(`/dbs`);
      toast({
        status: 'success',
        title: t('restore_success')
      });
      onClose();
    },
    onError(err) {
      toast({
        status: 'error',
        title: t(getErrText(err, 'The restore task has been created failed !')),
        duration: 6000,
        isClosable: true
      });
    }
  });

  return (
    <>
      <Modal isOpen onClose={onClose} lockFocusAcrossFrames={false}>
        <ModalOverlay />
        <ModalContent maxW={'min(600px, 90vw)'}>
          <ModalHeader>{t('restore_database')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody display={'flex'} pb={8}>
            <Box>
              <Tip
                icon={<InfoOutlineIcon fontSize={'16px'} />}
                size="sm"
                text={t('restore_backup_tip')}
                borderRadius={'md'}
              />
              <Box>
                <Flex mt={8} alignItems={'flex-start'}>
                  <Box flex={'0 0 120px'} pt={2}>
                    {t('database_name')}
                  </Box>
                  <FormControl isInvalid={Boolean(errors.databaseName)} flex={1}>
                    <Input
                      {...register('databaseName', {
                        required: t('database_name_cannot_empty'),
                        maxLength: {
                          value: 50,
                          message: t('database_name_max_length', { length: 50 })
                        }
                      })}
                    />
                    <FormErrorMessage mt={1}>
                      {errors.databaseName && String(errors.databaseName.message)}
                    </FormErrorMessage>
                  </FormControl>
                </Flex>
              </Box>
              <Box mt={10} textAlign={'end'}>
                <Button
                  isLoading={isLoading}
                  variant={'solid'}
                  onClick={handleSubmit((data) =>
                    onclickRestore({ databaseName: data.databaseName })
                  )}
                >
                  {t('Start')}
                </Button>
              </Box>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default RestoreModal;

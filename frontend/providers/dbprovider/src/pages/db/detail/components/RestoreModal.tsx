import { createDB } from '@/api/db';
import Tip from '@/components/Tip';
import { useToast } from '@/hooks/useToast';
import { BackupItemType, DBDetailType } from '@/types/db';
import { getErrText } from '@/utils/tools';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Flex,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay
} from '@chakra-ui/react';
import { useMutation } from '@tanstack/react-query';
import { customAlphabet } from 'nanoid';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 6);

const BackupModal = ({
  db,
  backupInfo,
  onClose,
  onSuccess
}: {
  db: DBDetailType;
  backupInfo: BackupItemType;
  onClose: () => void;
  onSuccess?: () => void;
}) => {
  if (!db) return <></>;
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();

  const { register, handleSubmit, getValues } = useForm({
    defaultValues: {
      databaseName: `${db.dbName}-${nanoid()}`
    }
  });

  const { mutate: onclickRestore, isLoading } = useMutation({
    mutationFn: ({ databaseName }: { databaseName: string }) => {
      const dbData = {
        ...db,
        dbName: databaseName
      };
      return createDB({
        dbForm: dbData,
        isEdit: false,
        backupInfo: backupInfo
      });
    },
    onSuccess() {
      router.replace(`/dbs`);
      toast({
        status: 'success',
        title: t('Restore Success')
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
      <Modal isOpen onClose={onClose}>
        <ModalOverlay />
        <ModalContent maxW={'min(600px, 90vw)'}>
          <ModalHeader>{t('Restore Database')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody display={'flex'} pb={8}>
            <Box px={'50px'}>
              <Tip
                icon={<InfoOutlineIcon fontSize={'16px'} />}
                size="sm"
                text={t('Restore Backup Tip')}
              />
              <Box>
                <Flex mt={8} alignItems={'center'}>
                  <Box flex={'0 0 120px'}>{t('Database Name')}</Box>
                  <Input
                    bg={'myWhite.300'}
                    {...register('databaseName', {
                      required: t('Database Name cannot empty') || 'Database Name cannot empty'
                    })}
                  />
                </Flex>
              </Box>
              <Box mt={10} textAlign={'end'}>
                <Button
                  isLoading={isLoading}
                  variant={'primary'}
                  // @ts-ignore
                  onClick={() => handleSubmit(onclickRestore)()}
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

export default BackupModal;

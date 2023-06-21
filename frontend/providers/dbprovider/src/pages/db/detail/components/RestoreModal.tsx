import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  Button,
  Flex,
  Input
} from '@chakra-ui/react';
import { useMutation } from '@tanstack/react-query';
import { getErrText } from '@/utils/tools';
import { useToast } from '@/hooks/useToast';
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 6);
import Tip from '@/components/Tip';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import { useTranslation } from 'next-i18next';
import { useForm } from 'react-hook-form';
import { DBDetailType } from '@/types/db';
import { json2CreateCluster, json2Account } from '@/utils/json2Yaml';
import { useRouter } from 'next/router';
import { applyYamlList } from '@/api/db';

const BackupModal = ({
  db,
  backupName,
  onClose,
  onSuccess
}: {
  db: DBDetailType;
  backupName: string;
  onClose: () => void;
  onSuccess?: () => void;
}) => {
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
      const yamlList = [json2CreateCluster(dbData, backupName), json2Account(dbData)];
      return applyYamlList(yamlList, 'create');
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

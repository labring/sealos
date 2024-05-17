import { applyYamlList, getDBSecret } from '@/api/db';
import {
  applyDumpCR,
  deleteMigrateJobByName,
  getLogByNameAndContainerName,
  getMigratePodList
} from '@/api/migrate';
import { uploadFile } from '@/api/platform';
import FileSelect from '@/components/FileSelect';
import MyIcon from '@/components/Icon';
import { useToast } from '@/hooks/useToast';
import { DBDetailType } from '@/types/db';
import { DumpForm } from '@/types/migrate';
import {
  Box,
  Button,
  Divider,
  Flex,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  useDisclosure
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import QuotaBox from '@/components/QuotaBox';

enum MigrateStatusEnum {
  Prepare = 'Prepare',
  Progress = 'Progress',
  Success = 'Success',
  Fail = 'Fail',
  Running = 'Running'
}

export default function DumpImport({ db }: { db?: DBDetailType }) {
  const { t } = useTranslation();
  const [files, setFiles] = useState<File[]>([]);
  const { toast } = useToast();
  const [migrateStatus, setMigrateStatus] = useState<MigrateStatusEnum>(MigrateStatusEnum.Prepare);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const formHook = useForm<DumpForm>();
  const [migrateName, setMigrateName] = useState('');
  const [podName, setPodName] = useState('');
  const timeElapsedRef = useRef(0);
  const [fileProgressText, setFileProgressText] = useState('');
  const LogBox = useRef<HTMLDivElement>(null);

  const handleConfirm = async () => {
    formHook.handleSubmit(
      async (data) => {
        try {
          setMigrateStatus(MigrateStatusEnum.Progress);
          if (files.length <= 0) {
            closeMigrate();
            return toast({
              title: t('Lost File'),
              status: 'error'
            });
          }
          const form = new FormData();
          files.forEach((file) => {
            form.append('file', file, encodeURIComponent(file.name));
          });
          const result = await uploadFile(form, (e) => {
            if (!e.progress) return;
            const percent = Math.round(e.progress * 100);
            if (percent < 100) {
              setFileProgressText(t('file.Uploading', { percent }) || '');
            } else {
              setFileProgressText(t('file.Upload Success') || '');
            }
          });

          if (!result[0]) {
            closeMigrate();
            return toast({
              title: t('File upload failed'),
              status: 'error'
            });
          }
          formHook.setValue('fileName', result[0]);
          const res = await applyDumpCR({ ...data, fileName: result[0] });
          setMigrateName(res.name);
        } catch (error: any) {
          toast({
            title: String(error),
            status: 'error'
          });
          closeMigrate();
        }
      },
      (error) => {
        onClose();
        const deepSearch = (obj: any): string => {
          if (!obj) return t('Submit Error');
          if (!!obj.message) {
            return obj.message;
          }
          return deepSearch(Object.values(obj)[0]);
        };
        toast({
          title: deepSearch(error),
          status: 'error',
          position: 'top',
          duration: 3000,
          isClosable: true
        });
      }
    )();
  };

  const closeMigrate = async () => {
    try {
      if (migrateStatus === MigrateStatusEnum.Progress && db?.dbName && migrateName) {
        await deleteMigrateJobByName(migrateName);
      }
      onClose();
      setMigrateStatus(MigrateStatusEnum.Prepare);
      setMigrateName('');
      setPodName('');
    } catch (error) {
      console.log(error, 'close migrate error');
    }
  };

  useQuery(['getFileMigratePodList'], () => getMigratePodList(migrateName, 'file'), {
    enabled: !!migrateName,
    refetchInterval: 5000,
    onSuccess(data) {
      console.log(data, 'pod');
      let podStatus = data?.[0]?.status?.phase;
      if (data?.[0]?.metadata?.name && podStatus) {
        if (podStatus === 'Succeeded') {
          setMigrateStatus(MigrateStatusEnum.Success);
        } else if (podStatus === 'Failed') {
          setMigrateStatus(MigrateStatusEnum.Fail);
        }
        setPodName(data[0].metadata.name);
      }
    }
  });

  const { data: log = '' } = useQuery(
    ['getLogByNameAndContainerName', podName],
    () =>
      getLogByNameAndContainerName({
        podName: podName,
        containerName: migrateName,
        stream: false
      }),
    {
      refetchInterval: 5000,
      enabled: !!podName && !!migrateName && migrateStatus === MigrateStatusEnum.Fail
    }
  );

  useQuery(
    ['getDBSecret'],
    () => {
      if (db?.dbName && db?.dbType) {
        return getDBSecret({ dbName: db?.dbName, dbType: db?.dbType });
      } else {
        return null;
      }
    },
    {
      enabled: !!db?.dbName,
      onSuccess(res) {
        if (!res) return;
        formHook.reset((old) => ({
          ...old,
          databaseHost: res.host,
          databasePassword: res.password,
          databaseUser: res.username,
          databaseType: db?.dbType || '',
          dbName: db?.dbName || ''
        }));
      },
      onError(err) {
        toast({
          title: String(err),
          status: 'error'
        });
      }
    }
  );

  return (
    <Box h={'100%'} position={'relative'} px="26px" pb="40px">
      <Flex borderRadius={'4px'} border={'1px solid #EAEBF0'} h="100%">
        <Box flex={'0 1 256px'} borderRight={'1px solid #EAEBF0'}>
          <QuotaBox />
          {/* {db && (
            <PriceBox
              components={[
                {
                  cpu: db?.cpu,
                  memory: db?.memory,
                  storage: db?.storage,
                  replicas: [db?.replicas || 1, db?.replicas || 1]
                },
                ...(db?.dbType === DBTypeEnum.redis
                  ? (() => {
                      const config = RedisHAConfig(db?.replicas > 1);
                      return [
                        {
                          ...config,
                          replicas: [config.replicas, config.replicas]
                        }
                      ];
                    })()
                  : [])
              ]}
            />
          )} */}
        </Box>
        <Box flex={1} pt="35px" px="68px" overflowY={'auto'}>
          <Text color={'#24282C'} fontSize={'16px'} fontWeight={500}>
            {t('Upload dump file')}
          </Text>

          <FileSelect fileExtension="*" multiple={false} files={files} setFiles={setFiles} />

          <Text mt="60px" color={'#24282C'} fontSize={'16px'} fontWeight={500}>
            {t('Target Database')}
          </Text>

          <Flex alignItems={'center'} mt="22px">
            <Text fontSize={'14px'} fontWeight={400} w="160px" color={'#333333'}>
              {t('DB Name')}
            </Text>
            <Input
              maxW={'400px'}
              isInvalid={!!formHook.formState?.errors?.databaseName}
              {...formHook.register('databaseName', {
                required: t('Database Name Empty') || ''
              })}
            />
          </Flex>
          {db?.dbType === 'mongodb' && (
            <Flex alignItems={'center'} mt="22px">
              <Text fontSize={'14px'} fontWeight={400} w="160px" color={'#333333'}>
                {t('Collection Name')}
              </Text>
              <Input maxW={'400px'} {...formHook.register('collectionName')} />
            </Flex>
          )}
          <Flex justifyContent={'end'}>
            <Button mt="40px" w="156px" h={'40px'} variant={'primary'} onClick={onOpen}>
              {t('Migrate Now')}
            </Button>
          </Flex>
        </Box>
      </Flex>

      <Modal
        isOpen={isOpen}
        onClose={closeMigrate}
        closeOnOverlayClick={false}
        lockFocusAcrossFrames={false}
      >
        <ModalOverlay />
        {migrateStatus === MigrateStatusEnum.Prepare && (
          <ModalContent>
            <ModalHeader>{t('Prompt')}</ModalHeader>
            <ModalBody>
              <ModalCloseButton />
              <Flex>
                <Text> {t('Are you sure to perform database migration')} </Text>
              </Flex>
              <ModalFooter>
                <Button colorScheme={'gray'} onClick={closeMigrate}>
                  {t('Cancel')}
                </Button>
                <Button ml={3} variant={'primary'} onClick={handleConfirm}>
                  {t('Confirm')}
                </Button>
              </ModalFooter>
            </ModalBody>
          </ModalContent>
        )}

        {migrateStatus === MigrateStatusEnum.Progress && (
          <ModalContent>
            <ModalBody>
              <ModalCloseButton />
              <Flex
                flexDirection={'column'}
                alignItems={'center'}
                justifyContent={'center'}
                pt="75px"
                pb="42px"
                px="24px"
              >
                <Flex alignItems={'center'} justifyContent={'center'} gap="10px">
                  <Spinner />
                  <Text fontSize={'24px'} fontWeight={500} color={'#24282C'}>
                    {t('Migrating')}
                  </Text>
                </Flex>
                <Text mt="28px" mb="8px" fontSize={'14px'} fontWeight={400} color={'#7B838B'}>
                  {fileProgressText}
                </Text>
                <Text fontSize={'14px'} fontWeight={400} color={'#7B838B'}>
                  {t('Migration prompt information')}
                </Text>
              </Flex>
            </ModalBody>
          </ModalContent>
        )}

        {(migrateStatus === MigrateStatusEnum.Success ||
          migrateStatus === MigrateStatusEnum.Fail) && (
          <ModalContent maxW={migrateStatus === MigrateStatusEnum.Fail ? '60%' : '392px'}>
            <ModalCloseButton />
            <ModalBody>
              {migrateStatus === MigrateStatusEnum.Success && (
                <Flex
                  flexDirection={'column'}
                  alignItems={'center'}
                  justifyContent={'center'}
                  pt="75px"
                  pb="42px"
                  px="24px"
                >
                  <MyIcon name="success" w={'42px'} h="42px"></MyIcon>
                  <Text mt="16px" fontSize={'20px'} fontWeight={500} color={'#24282C'}>
                    {t('Migration Successful')}
                  </Text>
                </Flex>
              )}
              {migrateStatus === MigrateStatusEnum.Fail && (
                <Flex
                  flexDirection={'column'}
                  alignItems={'center'}
                  justifyContent={'center'}
                  pt="75px"
                  pb="12px"
                  px="24px"
                >
                  <MyIcon name="error" w={'42px'} h="42px"></MyIcon>
                  <Text mt="16px" fontSize={'20px'} fontWeight={500} color={'#24282C'}>
                    {t('Migration Failed')}
                  </Text>
                  <Divider mt="44px" mb="24px" />
                  <Text
                    mt="20px"
                    fontSize={'14px'}
                    fontWeight={400}
                    color={'#7B838B'}
                    dangerouslySetInnerHTML={{ __html: log ? log : 'Have Error' }}
                  ></Text>
                </Flex>
              )}
            </ModalBody>
          </ModalContent>
        )}
      </Modal>
    </Box>
  );
}

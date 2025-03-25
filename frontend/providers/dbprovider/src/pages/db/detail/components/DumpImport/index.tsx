import { getDBSecret } from '@/api/db';
import {
  applyDumpCR,
  deleteMigrateJobByName,
  getLogByNameAndContainerName,
  getMigratePodList
} from '@/api/migrate';
import { uploadFile } from '@/api/platform';
import FileSelect from '@/components/FileSelect';
import MyIcon from '@/components/Icon';
import QuotaBox from '@/components/QuotaBox';
import { DBDetailType } from '@/types/db';
import { DumpForm } from '@/types/migrate';
import {
  Box,
  Button,
  Divider,
  Flex,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Spinner,
  Text,
  useDisclosure,
  VStack
} from '@chakra-ui/react';
import { useMessage } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useRef, useState } from 'react';
import { FormProvider, useForm, useFormContext } from 'react-hook-form';

enum MigrateStatusEnum {
  Prepare = 'Prepare',
  Progress = 'Progress',
  Success = 'Success',
  Fail = 'Fail',
  Running = 'Running'
}

const DatabaseNameSelect = ({
  templateList
}: {
  templateList: { uid: string; name: string }[];
}) => {
  const { watch, setValue } = useFormContext<any>();
  const [inputValue, setInputValue] = useState('');

  const handleDatabaseNameSelect = (databasename: string) => {
    setInputValue(databasename);
    setValue('databasename', inputValue);
    handler.onClose();
  };
  const handler = useDisclosure();
  const { t } = useTranslation();

  const handleCreateDatabaseName = () => {
    setValue('databasename', inputValue);
    handler.onClose();
  };
  return (
    <>
      <Popover
        placement="bottom-start"
        isOpen={handler.isOpen}
        onOpen={handler.onOpen}
        onClose={handler.onClose}
      >
        <PopoverTrigger>
          <Flex
            width={'350px'}
            bgColor={'grayModern.50'}
            border={'1px solid'}
            borderColor={'grayModern.200'}
            borderRadius={'6px'}
            py={'8px'}
            px={'12px'}
            justify={'space-between'}
          >
            <Text fontSize={'12px'} width={400}>
              {watch('databasename')}
            </Text>
            <MyIcon name="chevronDown" boxSize={'16px'} color={'grayModern.500'} />
          </Flex>
        </PopoverTrigger>
        <PopoverContent>
          <PopoverBody
            p="6px"
            width="280px"
            boxShadow="box-shadow: 0px 0px 1px 0px #13336B1A,box-shadow: 0px 4px 10px 0px #13336B1A"
            border="none"
            borderRadius="6px"
          >
            <Input
              width="full"
              height="32px"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
              }}
              // border="1px solid #219BF4"
              // boxShadow="0px 0px 0px 2.4px rgba(51, 112, 255, 0.15)"
              borderRadius="4px"
              fontSize="12px"
              placeholder={t('search_or_create_database')}
              _focus={{
                border: '1px solid #219BF4',
                boxShadow: '0px 0px 0px 2.4px rgba(51, 112, 255, 0.15)'
              }}
            />
            <VStack spacing="0" align="stretch" mt={'4px'}>
              {templateList
                .filter((v) => v.name.toLowerCase().includes(inputValue.toLowerCase()))
                .map((v) => (
                  <Box
                    key={v.uid}
                    p="8px 12px"
                    borderRadius={'4px'}
                    fontSize="12px"
                    cursor="pointer"
                    _hover={{ bg: 'rgba(17, 24, 36, 0.05)' }}
                    onClick={() => handleDatabaseNameSelect(v.name)}
                  >
                    {v.name}
                  </Box>
                ))}

              {inputValue && !templateList.find((v) => v.name === inputValue) && (
                <HStack
                  p="8px 12px"
                  spacing="8px"
                  cursor="pointer"
                  _hover={{ bg: 'rgba(17, 24, 36, 0.05)' }}
                  onClick={handleCreateDatabaseName}
                >
                  <MyIcon name="add" w={'16px'} h={'16px'} />
                  <Text fontSize="12px" lineHeight="16px" letterSpacing="0.004em" color="#111824">
                    {`${t('create_database')} ${inputValue}`}
                  </Text>
                </HStack>
              )}
            </VStack>
          </PopoverBody>
        </PopoverContent>
      </Popover>
    </>
  );
};

export default function DumpImport({ db }: { db?: DBDetailType }) {
  const { t } = useTranslation();
  const [files, setFiles] = useState<File[]>([]);
  const { message: toast } = useMessage();
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
              title: t('lost_file'),
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
              setFileProgressText(t('file.Uploading', { percent }));
            } else {
              setFileProgressText(t('file.Upload Success'));
            }
          });

          if (!result[0]) {
            closeMigrate();
            return toast({
              title: t('file_upload_failed'),
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
          if (!obj) return t('submit_error');
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
    <FormProvider {...formHook}>
      <Box h={'100%'} position={'relative'}>
        <Flex align={'center'}>
          <Text fontSize={'base'} fontWeight={'bold'} minW={'120px'} color={'grayModern.900'}>
            {t('db_name')}
          </Text>
          <DatabaseNameSelect templateList={[]} />
        </Flex>

        <Flex h="100%" justifyContent={'center'}>
          <Box flex={1} pt="32px" px="40px" overflowY={'auto'} maxW={'720px'}>
            <Text fontSize={'base'} fontWeight={'bold'} color={'grayModern.900'}>
              {t('upload_dump_file')}
            </Text>
            <FileSelect fileExtension="*" multiple={false} files={files} setFiles={setFiles} />

            <Flex alignItems={'center'} mt="22px">
              <Text fontSize={'base'} fontWeight={'bold'} minW={'120px'} color={'grayModern.900'}>
                {t('db_name')}
              </Text>
              <DatabaseNameSelect templateList={[]} />
              {/* <Input
                width={'380px'}
                maxW={'400px'}
                isInvalid={!!formHook.formState?.errors?.databaseName}
                {...formHook.register('databaseName', {
                  required: t('database_name_empty')
                })}
              /> */}
            </Flex>
            {db?.dbType === 'mongodb' && (
              <Flex alignItems={'center'} mt="22px">
                <Text fontSize={'base'} fontWeight={'bold'} minW={'120px'} color={'grayModern.900'}>
                  {t('collection_name')}
                </Text>
                <Input width={'380px'} maxW={'400px'} {...formHook.register('collectionName')} />
              </Flex>
            )}
            <Flex justifyContent={'end'}>
              <Button mt="40px" w={'100px'} h={'32px'} variant={'solid'} onClick={onOpen}>
                {t('migrate_now')}
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
              <ModalHeader>{t('prompt')}</ModalHeader>
              <ModalBody>
                <ModalCloseButton top={'10px'} right={'10px'} />
                <Flex mb={'44px'}>
                  <Text> {t('are_you_sure_to_perform_database_migration')} </Text>
                </Flex>

                <Flex justifyContent={'flex-end'}>
                  <Button variant={'outline'} onClick={closeMigrate}>
                    {t('Cancel')}
                  </Button>
                  <Button ml={3} variant={'solid'} onClick={handleConfirm}>
                    {t('confirm')}
                  </Button>
                </Flex>
              </ModalBody>
            </ModalContent>
          )}

          {migrateStatus === MigrateStatusEnum.Progress && (
            <ModalContent>
              <ModalCloseButton />
              <ModalBody>
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
                    {t('migration_prompt_information')}
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
                      {t('migration_successful')}
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
                      {t('migration_failed')}
                    </Text>
                    <Divider mt="44px" mb="24px" />
                    <Text
                      mt="20px"
                      fontSize={'14px'}
                      fontWeight={400}
                      color={'#7B838B'}
                      dangerouslySetInnerHTML={{ __html: log ? log : 'have_error' }}
                    ></Text>
                  </Flex>
                )}
              </ModalBody>
            </ModalContent>
          )}
        </Modal>
      </Box>
    </FormProvider>
  );
}

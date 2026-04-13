import { getDatabases, getTables } from '@/api/db';
import {
  applyDumpCR,
  deleteMigrateJobByName,
  getLogByNameAndContainerName,
  getMigrateJobList,
  getMigratePodList,
  getPodStatusByName
} from '@/api/migrate';
import { uploadFile } from '@/api/platform';
import FileSelect from '@/components/FileSelect';
import MyIcon from '@/components/Icon';
import { DBDetailType } from '@/types/db';
import { DumpForm } from '@/types/migrate';
import { useQuotaGuarded } from '@sealos/shared';
import { assembleTranslate } from '@/utils/i18n-client';

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
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  useDisclosure
} from '@chakra-ui/react';
import { AutoComplete, useMessage } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useMemo } from 'react';
import useEnvStore from '@/store/env';

enum MigrateStatusEnum {
  Prepare = 'Prepare',
  Progress = 'Progress',
  Success = 'Success',
  Fail = 'Fail',
  Running = 'Running'
}

export default function DumpImport({ db }: { db?: DBDetailType }) {
  const {
    t,
    i18n: { language }
  } = useTranslation();
  const [files, setFiles] = useState<File[]>([]);
  const { message: toast } = useMessage();
  const [migrateStatus, setMigrateStatus] = useState<MigrateStatusEnum>(MigrateStatusEnum.Prepare);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const formHook = useForm<DumpForm>();
  const [migrateName, setMigrateName] = useState('');
  const [podName, setPodName] = useState('');
  const [fileProgressText, setFileProgressText] = useState('');

  const { SystemEnv } = useEnvStore();

  const { getValues, setValue, watch } = formHook;
  const tableName = watch('tableName');

  const checkQuotaAndProceed = useQuotaGuarded(
    {
      requirements: {
        cpu: SystemEnv.MIGRATION_JOB_CPU_REQUIREMENT,
        memory: SystemEnv.MIGRATION_JOB_MEMORY_REQUIREMENT,
        traffic: true
      },
      immediate: false,
      allowContinue: false
    },
    () => {
      // If quota is sufficient, show confirmation dialog
      onOpen();
    }
  );

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
            if (!file.name.includes('.')) throw new Error('file name error');
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
          const res = await applyDumpCR({
            ...data,
            dbName: db?.dbName!,
            dbType: db?.dbType as 'postgresql' | 'mongodb' | 'apecloud-mysql' | 'mysql',
            databaseExist: databases!.includes(getValues('databaseName')),
            fileName: result[0]
          });
          setMigrateName(res.name);
        } catch (error: any) {
          toast({
            title: t('file_upload_failed'),
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
          const values = Object.values(obj);
          if (values.length > 0) {
            return deepSearch(values[0]);
          }
          return t('submit_error');
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
      console.error(error, 'close migrate error');
    }
  };

  useQuery(['getFileMigratePodList'], () => getMigrateJobList(migrateName), {
    enabled: !!migrateName,
    refetchInterval: 5000,
    onSuccess(data) {
      const podStatus = data?.conditions?.[0].type;
      if (data?.ready !== undefined && podStatus) {
        if (podStatus === 'Complete') {
          setMigrateStatus(MigrateStatusEnum.Success);
        } else if (podStatus === 'Failed') {
          setMigrateStatus(MigrateStatusEnum.Fail);
        }
      }
    }
  });

  const { data: podList = [] } = useQuery(
    ['getMigratePodList', migrateName],
    () => getMigratePodList(migrateName, 'file'),
    {
      enabled: !!migrateName && migrateStatus === MigrateStatusEnum.Fail,
      refetchInterval: 5000,
      onSuccess(data) {
        if (data && data.length > 0 && !podName) {
          const podNameToSet = (data[0] as any).name || '';
          setPodName(podNameToSet);
        }
      }
    }
  );

  const { data: fullPodInfo } = useQuery(
    ['getFullPodInfo', podName],
    () => getPodStatusByName(podName),
    {
      enabled: !!podName && migrateStatus === MigrateStatusEnum.Fail,
      onSuccess(data) {},
      onError(error) {
        console.error('Failed to get pod info:', error);
      }
    }
  );

  const containerName = useMemo(() => {
    if (!fullPodInfo?.spec?.containers || fullPodInfo.spec.containers.length === 0) {
      return 'migrate';
    }

    const firstContainer = fullPodInfo.spec.containers[0];
    return firstContainer.name;
  }, [fullPodInfo]);

  const { data: log = '' } = useQuery(
    ['getLogByNameAndContainerName', podName, containerName],
    () =>
      getLogByNameAndContainerName({
        podName: podName,
        containerName: containerName,
        stream: false
      }),
    {
      refetchInterval: 5000,
      enabled: !!podName && !!containerName && migrateStatus === MigrateStatusEnum.Fail,
      onSuccess(data) {},
      onError(error) {
        console.error('Failed to get logs:', error);
      }
    }
  );

  const { data: databases } = useQuery(
    ['getDBService', db?.dbName, db?.dbType],
    () => (db ? getDatabases({ dbName: db.dbName, dbType: db.dbType }) : null),
    {
      retry: 3,
      select: (data) => data?.filter((dbName) => dbName !== 'Database') || []
    }
  );

  const { data: tables } = useQuery(
    ['getDBService', db?.dbName, db?.dbType, getValues('databaseName')],
    () =>
      getValues('databaseName') !== '' && databases?.includes(getValues('databaseName')) && db
        ? getTables({
            dbName: db.dbName,
            dbType: db.dbType,
            databaseName: getValues('databaseName')
          })
        : null,
    {
      retry: 3
    }
  );

  return (
    <FormProvider {...formHook}>
      <Box h={'100%'} position={'relative'}>
        <Flex h="100%" justifyContent={'center'}>
          <Box flex={1} pt="32px" px="40px" overflowY={'auto'} maxW={'720px'}>
            <Text fontSize={'base'} fontWeight={'bold'} color={'grayModern.900'}>
              {t('upload_dump_file')}
            </Text>
            <FileSelect fileExtension="*" multiple={false} files={files} setFiles={setFiles} />

            <Flex alignItems={'center'} mt={11}>
              <Text fontSize={'base'} fontWeight={'bold'} minW={'120px'} color={'grayModern.900'}>
                {t('db_name')}
              </Text>
              <AutoComplete
                selectList={databases ?? []}
                value={getValues('databaseName')}
                setValue={(v) => setValue('databaseName', v)}
                inputPlaceholder={assembleTranslate(['search_or_create', 'database'], language)}
                inputSureToCreate={assembleTranslate(['create', 'database'], language)}
              />
            </Flex>
            {db?.dbType === 'mongodb' ? (
              <Flex alignItems={'center'} mt="22px">
                <Text fontSize={'base'} fontWeight={'bold'} minW={'120px'} color={'grayModern.900'}>
                  {t('collection_name')}
                </Text>
                <AutoComplete
                  selectList={tables ?? []}
                  value={getValues('tableName')}
                  setValue={(v) => setValue('tableName', v)}
                  inputPlaceholder={assembleTranslate(['search', 'collection'], language)}
                  inputSureToCreate={assembleTranslate(['create', 'collection'], language)}
                  supportNewValue={false}
                  inputNotSupportToCreate={assembleTranslate(
                    ['pls_create', 'collection'],
                    language
                  )}
                />
              </Flex>
            ) : (
              // [TODO] Temporary solution, only show table name field for CSV files.
              files[0]?.name.endsWith('.csv') && (
                <>
                  <Flex alignItems={'center'} mt="22px">
                    <Text
                      fontSize={'base'}
                      fontWeight={'bold'}
                      minW={'120px'}
                      color={'grayModern.900'}
                    >
                      {t('table_name')}
                    </Text>
                    <Input
                      value={tableName}
                      onChange={(e) => setValue('tableName', e.target.value)}
                    />
                  </Flex>

                  <Text mt={'8px'}>{t('need_manual_table_creation')}</Text>
                </>
              )
            )}

            <Flex justifyContent={'end'}>
              <Button
                mt="40px"
                w={'100px'}
                h={'32px'}
                variant={'solid'}
                onClick={checkQuotaAndProceed}
              >
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
                      dangerouslySetInnerHTML={{
                        __html: log ? log : 'have_error'
                      }}
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

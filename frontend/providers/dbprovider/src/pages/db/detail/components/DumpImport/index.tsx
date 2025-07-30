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
import { assembleTranslate } from '@/utils/i18n-client';

import {
  Box,
  Button,
  Divider,
  Flex,
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
  const [forceUpdate, setForceUpdate] = useState(false);

  const { getValues, setValue: setValue_ } = formHook;

  const setValue: typeof setValue_ = function (
    key: Parameters<typeof setValue>[0],
    value: Parameters<typeof setValue>[1]
  ) {
    setValue_(key, value);
    if (key === 'databaseName') {
      setValue_('tableName', '');
    }
    setForceUpdate(!forceUpdate);
  };

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
          console.log('form', form);
          const result = await uploadFile(form, (e) => {
            if (!e.progress) return;
            const percent = Math.round(e.progress * 100);
            if (percent < 100) {
              setFileProgressText(t('file.Uploading', { percent }));
            } else {
              setFileProgressText(t('file.Upload Success'));
            }
          });
          console.log('result', result);
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
            dbType: db?.dbType as 'postgresql' | 'mongodb' | 'apecloud-mysql',
            databaseExist: databases!.includes(getValues('databaseName')),
            fileName: result[0]
          });
          setMigrateName(res.name);
        } catch (error: any) {
          // 更好的错误处理，避免 [object Object] 显示
          console.log('Upload error:', error);
          let errorMessage = t('file_upload_failed');

          // 检查是否是服务器返回的错误
          if (error?.response?.data?.data) {
            errorMessage = error.response.data.data;
          } else if (error?.response?.data?.error) {
            errorMessage = error.response.data.error;
          } else if (error?.data?.data) {
            errorMessage = error.data.data;
          } else if (error?.data?.error) {
            errorMessage = error.data.error;
          } else if (error?.message) {
            errorMessage = error.message;
          } else if (error?.errMessage) {
            errorMessage = error.errMessage;
          } else if (typeof error === 'string') {
            errorMessage = error;
          } else if (error?.response?.data?.message) {
            errorMessage = error.response.data.message;
          }

          console.log('Final error message:', errorMessage);
          toast({
            title: errorMessage,
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

  // 获取相关的 Pod 信息
  const { data: podList = [] } = useQuery(
    ['getMigratePodList', migrateName],
    () => getMigratePodList(migrateName, 'file'),
    {
      enabled: !!migrateName && migrateStatus === MigrateStatusEnum.Fail,
      refetchInterval: 5000,
      onSuccess(data) {
        console.log('Pod list data:', data);
        // 设置第一个 pod 的名称用于获取日志
        if (data && data.length > 0 && !podName) {
          // API 实际返回的是 metadata 数组，所以需要访问 metadata.name
          const podNameToSet = (data[0] as any).name || '';
          console.log('Setting pod name:', podNameToSet);
          setPodName(podNameToSet);
        }
      }
    }
  );

  // 获取完整的 Pod 信息，包括容器信息
  const { data: fullPodInfo } = useQuery(
    ['getFullPodInfo', podName],
    () => getPodStatusByName(podName),
    {
      enabled: !!podName && migrateStatus === MigrateStatusEnum.Fail,
      onSuccess(data) {
        console.log('Full pod info:', data);
      },
      onError(error) {
        console.error('Failed to get pod info:', error);
      }
    }
  );

  // 从 Pod 信息中提取容器名称
  const containerName = useMemo(() => {
    if (!fullPodInfo?.spec?.containers || fullPodInfo.spec.containers.length === 0) {
      console.log('No containers found in pod, using default container name');
      return 'migrate'; // 默认容器名称
    }

    // 获取第一个容器的名称
    const firstContainer = fullPodInfo.spec.containers[0];
    console.log('Using container name:', firstContainer.name);
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
      onSuccess(data) {
        console.log('Log data received:', data);
      },
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
            {db?.dbType === 'mongodb' && (
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
                      dangerouslySetInnerHTML={{
                        __html: log
                          ? log
                          : `迁移失败，但无法获取详细错误日志。请检查：
                             <br/>1. Pod 名称: ${podName || '未获取到'}
                             <br/>2. 容器名称: ${containerName || '未获取到'}
                             <br/>3. 迁移任务名称: ${migrateName || '未获取到'}
                             <br/>4. 请稍后重试或联系管理员查看集群日志。`
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

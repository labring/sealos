import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  Button,
  useTheme,
  Flex,
  Input,
  Switch,
  Checkbox
} from '@chakra-ui/react';
import { useConfirm } from '@/hooks/useConfirm';
import { createBackup, updateBackupPolicy } from '@/api/backup';
import { useMutation } from '@tanstack/react-query';
import { getErrText, convertCronTime } from '@/utils/tools';
import { useToast } from '@/hooks/useToast';
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 6);
import Tip from '@/components/Tip';
import { InfoOutlineIcon, TimeIcon } from '@chakra-ui/icons';
import { useTranslation } from 'next-i18next';
import { useForm } from 'react-hook-form';
import type { AutoBackupFormType, AutoBackupType } from '@/types/backup';
import Tabs from '@/components/Tabs';
import MySelect from '@/components/Select';
import { DBTypeEnum } from '@/constants/db';

enum NavEnum {
  manual = 'manual',
  auto = 'auto'
}

const BackupModal = ({
  defaultVal,
  dbName,
  dbType,
  onClose,
  refetchPolicy
}: {
  defaultVal: AutoBackupFormType;
  dbName: string;
  dbType: `${DBTypeEnum}`;
  onClose: () => void;
  refetchPolicy: () => void;
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { toast } = useToast();

  const { openConfirm, ConfirmChild } = useConfirm({
    title: t('Confirm') || 'Confirm',
    content: t('Manual Backup Tip'),
    confirmText: 'Start Backup'
  });
  const [refresh, setRefresh] = useState(false);
  const [currentNav, setCurrentNav] = useState<`${NavEnum}`>(NavEnum.manual);
  const {
    register: manualRegister,
    handleSubmit: handleSubmitManual,
    getValues: getManualValues
  } = useForm({
    defaultValues: {
      backupName: `${dbName}-${nanoid()}`,
      remark: ''
    }
  });
  const {
    register: autoRegister,
    handleSubmit: handleSubmitAuto,
    getValues: getAutoValues,
    setValue: setAutoValue
  } = useForm<AutoBackupFormType>({
    defaultValues: defaultVal
  });

  const selectTimeList = useRef<
    {
      id: string;
      label: string;
    }[]
  >(
    (() =>
      new Array(60).fill(0).map((item, i) => {
        const val = i < 10 ? `0${i}` : `${i}`;
        return {
          id: val,
          label: val
        };
      }))()
  );

  const weekSelectList = useRef([
    { label: 'Monday', id: '1' },
    { label: 'Tuesday', id: '2' },
    { label: 'Wednesday', id: '3' },
    { label: 'Thursday', id: '4' },
    { label: 'Friday', id: '5' },
    { label: 'Saturday', id: '6' },
    { label: 'Sunday', id: '0' }
  ]);

  const navStyle = useCallback(
    (nav: `${NavEnum}`) => ({
      px: 4,
      py: 3,
      borderRadius: 'md',
      cursor: 'pointer',
      ...(nav === currentNav
        ? {
            bg: '#F4F6F8',
            color: 'myGray.1000'
          }
        : {
            color: 'myGray.500',
            onClick: () => setCurrentNav(nav)
          })
    }),
    [currentNav]
  );

  const { mutate: onclickBackup, isLoading } = useMutation({
    mutationFn: () => {
      return createBackup({
        backupName: getManualValues('backupName'),
        remark: getManualValues('remark'),
        dbName,
        dbType
      });
    },
    onSuccess() {
      toast({
        status: 'success',
        title: t('The backup task has been created successfully !')
      });
      onClose();
    },
    onError(err) {
      toast({
        status: 'error',
        title: t(getErrText(err, 'The backup task has been created failed !'))
      });
    }
  });
  const { mutate: onclickSetAutoBackup, isLoading: isLoadingSetAutoBackup } = useMutation({
    mutationFn: async (data: AutoBackupFormType) => {
      // parse Cron
      const cron = await (() => {
        if (data.type === 'week') {
          if (data.week.length === 0) {
            return Promise.reject('Week is empty');
          }
          return `${data.minute} ${data.hour} * * ${data.week.join(',')}`;
        }
        if (data.type === 'day') {
          return `${data.minute} ${data.hour} * * *`;
        }
        return `${data.minute} * * * *`;
      })();

      const patch = [
        { op: 'replace', path: '/spec/retention/ttl', value: `${data.saveTime}${data.saveType}` },
        { op: 'replace', path: '/spec/schedule/datafile/enable', value: data.start },
        {
          op: 'replace',
          path: '/spec/schedule/datafile/cronExpression',
          value: convertCronTime(cron, -8)
        }
      ];

      return updateBackupPolicy({
        dbName,
        dbType,
        patch
      });
    },
    onSuccess() {
      toast({
        status: 'success',
        title: t('Set auto backup successful')
      });
      refetchPolicy();
      onClose();
    },
    onError(err) {
      toast({
        status: 'error',
        title: t(getErrText(err, 'The backup task has been created failed !'))
      });
    }
  });

  return (
    <>
      <Modal isOpen onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent maxW={'min(960px, 90vw)'} h={'480px'}>
          <ModalHeader>{t('Backup Database')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody display={'flex'} pb={8}>
            <Box flex={'0 0 220px'} pr={4} borderRight={theme.borders.sm} borderRightWidth={'2px'}>
              <Box {...navStyle(NavEnum.manual)}>{t('Manual Backup')}</Box>
              <Flex {...navStyle(NavEnum.auto)} alignItems={'center'}>
                <Box flex={1}>{t('Auto Backup')}</Box>
                <Switch
                  variant={'deepLight'}
                  isChecked={getAutoValues('start')}
                  onChange={(e) => {
                    setAutoValue('start', e.target.checked);
                    setRefresh((state) => !state);
                  }}
                ></Switch>
              </Flex>
            </Box>
            <Flex flexDirection={'column'} px={'50px'} position={'relative'}>
              <Tip
                icon={<InfoOutlineIcon fontSize={'16px'} />}
                size="sm"
                text={t('Manual Backup Tip')}
              />
              {currentNav === NavEnum.manual && (
                <>
                  <Box flex={1} mt={8}>
                    <Flex alignItems={'center'}>
                      <Box flex={'0 0 80px'}>{t('Backup Name')}</Box>
                      <Input
                        maxW={'300px'}
                        bg={'myWhite.300'}
                        {...manualRegister('backupName', {
                          required: t('Backup Name cannot empty') || 'Backup Name cannot empty'
                        })}
                      />
                    </Flex>
                    <Flex mt={7} alignItems={'center'}>
                      <Box flex={'0 0 80px'}>{t('Remark')}</Box>
                      <Input maxW={'300px'} bg={'myWhite.300'} {...manualRegister('remark')} />
                    </Flex>
                  </Box>
                  <Box textAlign={'end'}>
                    <Button
                      isLoading={isLoading}
                      variant={'primary'}
                      onClick={() => handleSubmitManual(openConfirm(onclickBackup))()}
                    >
                      {t('Start Backup')}
                    </Button>
                  </Box>
                </>
              )}
              {currentNav === NavEnum.auto && (
                <>
                  <Box flex={1} mt={8} userSelect={'none'}>
                    <Flex alignItems={'center'}>
                      <Box flex={'0 0 110px'}>{t('CronExpression')}</Box>
                      <Tabs
                        w={'220px'}
                        list={[
                          { id: 'hour', label: 'Hour' },
                          { id: 'day', label: 'Day' },
                          { id: 'week', label: 'Week' }
                        ]}
                        activeId={getAutoValues('type')}
                        size={'sm'}
                        borderColor={'myGray.200'}
                        onChange={(e) => {
                          setAutoValue('type', e as AutoBackupType);
                          setRefresh((state) => !state);
                        }}
                      />
                    </Flex>
                    {getAutoValues('type') === 'week' && (
                      <Flex mt={4}>
                        {weekSelectList.current.map((item) => (
                          <Box key={item.id} _notLast={{ mr: 4 }}>
                            <Checkbox
                              defaultChecked={getAutoValues('week').includes(item.id)}
                              onChange={(e) => {
                                const val = e.target.checked;
                                const checkedList = [...getAutoValues('week')];
                                const index = checkedList.findIndex((week) => week === item.id);
                                if (val && index === -1) {
                                  setAutoValue('week', checkedList.concat(item.id));
                                } else if (!val && index > -1) {
                                  checkedList.splice(index, 1);
                                  setAutoValue('week', checkedList);
                                }
                                setRefresh((state) => !state);
                              }}
                            >
                              {t(item.label)}
                            </Checkbox>
                          </Box>
                        ))}
                      </Flex>
                    )}
                    {getAutoValues('type') !== 'hour' && (
                      <Flex mt={7} alignItems={'center'}>
                        <Box flex={'0 0 110px'}>{t('Start Hour')}</Box>
                        <MySelect
                          width={'120px'}
                          value={getAutoValues('hour')}
                          list={selectTimeList.current.slice(0, 24)}
                          icon={<TimeIcon color={'myGray.400'} />}
                          onchange={(val: any) => {
                            setAutoValue('hour', val);
                            setRefresh((state) => !state);
                          }}
                        />
                      </Flex>
                    )}
                    <Flex mt={7} alignItems={'center'}>
                      <Box flex={'0 0 110px'}>{t('Start Minute')}</Box>
                      <MySelect
                        width={'120px'}
                        value={getAutoValues('minute')}
                        list={selectTimeList.current}
                        icon={<TimeIcon color={'myGray.400'} />}
                        onchange={(val: any) => {
                          setAutoValue('minute', val);
                          setRefresh((state) => !state);
                        }}
                      />
                    </Flex>
                    <Flex mt={7} alignItems={'center'}>
                      <Box flex={'0 0 110px'}>{t('SaveTime')}</Box>
                      <Input
                        maxW={'100px'}
                        bg={'myWhite.300'}
                        borderTopRightRadius={0}
                        borderBottomRightRadius={0}
                        _focus={{
                          boxShadow: 'none',
                          borderColor: 'myGray.200',
                          bg: 'white'
                        }}
                        {...autoRegister('saveTime', {
                          min: 1,
                          valueAsNumber: true
                        })}
                      />
                      <MySelect
                        width={'80px'}
                        value={getAutoValues('saveType')}
                        borderLeft={0}
                        boxShadow={'none !important'}
                        borderColor={'myGray.200'}
                        list={[
                          { id: 'd', label: 'Day' },
                          { id: 'h', label: 'Hour' }
                        ]}
                        h={'35px'}
                        borderTopLeftRadius={0}
                        borderBottomLeftRadius={0}
                        onchange={(val: any) => {
                          setAutoValue('saveType', val);
                          setRefresh((state) => !state);
                        }}
                      />
                    </Flex>
                  </Box>
                  <Box textAlign={'end'}>
                    <Button
                      isLoading={isLoadingSetAutoBackup}
                      variant={'primary'}
                      // @ts-ignore
                      onClick={() => handleSubmitAuto(onclickSetAutoBackup)()}
                    >
                      {t('Save')}
                    </Button>
                  </Box>
                  {!getAutoValues('start') && (
                    <Box
                      zIndex={1}
                      position={'absolute'}
                      top={0}
                      right={0}
                      bottom={0}
                      left={0}
                      bg={'rgba(255,255,255,0.6)'}
                    />
                  )}
                </>
              )}
            </Flex>
          </ModalBody>
        </ModalContent>
      </Modal>
      <ConfirmChild />
    </>
  );
};

export default BackupModal;

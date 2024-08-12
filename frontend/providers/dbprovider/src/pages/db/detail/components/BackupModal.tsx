import { createBackup, updateBackupPolicy } from '@/api/backup';
import Tip from '@/components/Tip';
import { DBBackupMethodNameMap, DBTypeEnum } from '@/constants/db';
import { useConfirm } from '@/hooks/useConfirm';
import type { AutoBackupFormType, AutoBackupType } from '@/types/backup';
import { I18nCommonKey } from '@/types/i18next';
import { convertCronTime, getErrText } from '@/utils/tools';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Checkbox,
  Flex,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Switch,
  useTheme
} from '@chakra-ui/react';
import { MySelect, Tabs, useMessage } from '@sealos/ui';
import { useMutation } from '@tanstack/react-query';
import { customAlphabet } from 'nanoid';
import { useTranslation } from 'next-i18next';
import { MutableRefObject, useCallback, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz1234567890', 6);

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
  const { message: toast } = useMessage();

  const { openConfirm, ConfirmChild } = useConfirm({
    title: 'confirm',
    content: 'manual_backup_tip',
    confirmText: 'start_backup'
  });

  const { openConfirm: CloseAutoBackup, ConfirmChild: AutoBackupConfirmChild } = useConfirm({
    title: 'prompt',
    content: 'are_you_sure_you_want_to_turn_off_automatic_backup',
    confirmText: 'confirm'
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
  const weekSelectList: MutableRefObject<{ label: I18nCommonKey; id: string }[]> = useRef([
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
      p: '8px',
      borderRadius: 'md',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold',
      ...(nav === currentNav
        ? {
            bg: 'rgba(33, 155, 244, 0.05)',
            color: 'brightBlue.600'
          }
        : {
            color: 'grayModern.600',
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
        title: t('backup_success_tip')
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

      const autoBackup = {
        enabled: data.start,
        cronExpression: convertCronTime(cron, -8),
        method: DBBackupMethodNameMap[dbType],
        retentionPeriod: `${data.saveTime}${data.saveType}`,
        repoName: ''
      };

      return updateBackupPolicy({
        dbName,
        dbType,
        autoBackup
      });
    },
    onSuccess() {
      toast({
        status: 'success',
        title: t('set_auto_backup_successful')
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

  const { mutate: onclickCloseAutoBackup } = useMutation({
    mutationFn: async () => {
      return updateBackupPolicy({
        dbName,
        dbType,
        autoBackup: undefined
      });
    },
    onSuccess() {
      toast({
        status: 'success',
        title: t('automatic_backup_is_turned_off')
      });
      refetchPolicy();
      onClose();
    },
    onError(err) {
      toast({
        status: 'error',
        title: t('failed_to_turn_off_automatic_backup')
      });
    }
  });

  return (
    <>
      <Modal isOpen onClose={onClose} isCentered lockFocusAcrossFrames={false}>
        <ModalOverlay />
        <ModalContent maxW={'min(960px, 90vw)'} h={'480px'}>
          <ModalCloseButton zIndex={2} top={'10px'} right={'10px'} />
          <ModalBody display={'flex'} p={'0px'} borderRadius={'lg'}>
            <Box
              bg={'grayModern.50'}
              flex={'0 0 220px'}
              borderRight={'1px solid #E8EBF0'}
              py={'16px'}
              px={'20px'}
              borderRadius={'lg'}
            >
              <Box mb={'16px'} fontSize={'16px'} fontWeight={'500'} color={'grayModern.900'}>
                {t('backup_database')}
              </Box>
              <Box {...navStyle(NavEnum.manual)}>{t('manual_backup')}</Box>
              <Flex {...navStyle(NavEnum.auto)} alignItems={'center'}>
                <Box flex={1}>{t('auto_backup')}</Box>
                <Switch
                  variant={'deepLight'}
                  isChecked={getAutoValues('start')}
                  onChange={(e) => {
                    if (defaultVal.start) {
                      CloseAutoBackup(onclickCloseAutoBackup)();
                      return;
                    }
                    setAutoValue('start', e.target.checked);
                    setRefresh((state) => !state);
                  }}
                ></Switch>
              </Flex>
            </Box>
            <Flex flexDirection={'column'}>
              <Box
                fontSize={'16px'}
                fontWeight={500}
                color={'grayModern.900'}
                px={'20px'}
                mt={'16px'}
                mb={'28px'}
              >
                {t(currentNav === 'auto' ? 'auto_backup' : 'manual_backup')}
              </Box>
              <Flex flex={1} flexDirection={'column'} px={'36px'} pb={'32px'} position={'relative'}>
                <Tip
                  icon={<InfoOutlineIcon fontSize={'16px'} />}
                  size="sm"
                  text={t('manual_backup_tip')}
                />
                {currentNav === NavEnum.manual && (
                  <>
                    <Box flex={1} mt={8}>
                      <Flex alignItems={'center'}>
                        <Box flex={'0 0 80px'}>{t('backup_name')}</Box>
                        <Input
                          width={'328px'}
                          maxW={'328px'}
                          {...manualRegister('backupName', {
                            required: t('backup_name_cannot_empty')
                          })}
                        />
                      </Flex>
                      <Flex mt={7} alignItems={'center'}>
                        <Box flex={'0 0 80px'}>{t('remark')}</Box>
                        <Input width={'328px'} maxW={'328px'} {...manualRegister('remark')} />
                        <Tip
                          ml={'12px'}
                          icon={<InfoOutlineIcon fontSize={'16px'} />}
                          size="sm"
                          text={t('remark_tip')}
                        />
                      </Flex>
                    </Box>
                    <Box textAlign={'end'}>
                      <Button
                        isLoading={isLoading}
                        variant={'solid'}
                        onClick={() => handleSubmitManual(openConfirm(onclickBackup))()}
                      >
                        {t('start_backup')}
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
                            { id: 'hour', label: t('Hour') },
                            { id: 'day', label: t('Day') },
                            { id: 'week', label: t('Week') }
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
                          <Box flex={'0 0 110px'}>{t('start_hour')}</Box>
                          <MySelect
                            width={'120px'}
                            value={getAutoValues('hour')}
                            list={selectTimeList.current
                              .slice(0, 24)
                              .map((i) => ({ value: i.id, label: i.label }))}
                            // icon={<TimeIcon color={'myGray.400'} />}
                            onchange={(val: any) => {
                              setAutoValue('hour', val);
                              setRefresh((state) => !state);
                            }}
                          />
                        </Flex>
                      )}
                      <Flex mt={7} alignItems={'center'}>
                        <Box flex={'0 0 110px'}>{t('start_minute')}</Box>
                        <MySelect
                          width={'120px'}
                          value={getAutoValues('minute')}
                          list={selectTimeList.current.map((i) => ({
                            value: i.id,
                            label: i.label
                          }))}
                          // icon={<TimeIcon color={'myGray.400'} />}
                          onchange={(val: any) => {
                            setAutoValue('minute', val);
                            setRefresh((state) => !state);
                          }}
                        />
                      </Flex>
                      <Flex mt={7} alignItems={'center'}>
                        <Box flex={'0 0 110px'}>{t('SaveTime')}</Box>
                        <Input
                          height={'35px'}
                          maxW={'100px'}
                          bg={'#F7F8FA'}
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
                            { value: 'd', label: 'Day' },
                            { value: 'h', label: 'Hour' }
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
                        variant={'solid'}
                        isLoading={isLoadingSetAutoBackup}
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
                        borderRadius={'lg'}
                      />
                    )}
                  </>
                )}
              </Flex>
            </Flex>
          </ModalBody>
        </ModalContent>
      </Modal>
      <ConfirmChild />
      <AutoBackupConfirmChild />
    </>
  );
};

export default BackupModal;

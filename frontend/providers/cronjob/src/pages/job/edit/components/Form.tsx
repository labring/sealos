import { obj2Query } from '@/api/tools';
import MyIcon from '@/components/Icon';
import MySelect from '@/components/Select';
import Tabs from '@/components/Tabs';
import { SelectTimeList, WeekSelectList } from '@/constants/job';
import type { QueryType } from '@/types';
import { CreateScheduleType, CronJobEditType } from '@/types/job';
import { TimeIcon } from '@chakra-ui/icons';
import { Box, Checkbox, Flex, FormControl, Input, useTheme } from '@chakra-ui/react';
import { throttle } from 'lodash';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';

const labelWidth = 80;

const Form = ({ formHook }: { formHook: UseFormReturn<CronJobEditType, any> }) => {
  if (!formHook) return null;
  const { t } = useTranslation();
  const router = useRouter();
  const { name } = router.query as QueryType;
  const isEdit = useMemo(() => !!name, [name]);

  const {
    register,
    setValue,
    getValues,
    formState: { errors }
  } = formHook;

  const navList = [
    {
      id: 'baseInfo',
      label: 'Basic',
      icon: 'formInfo'
    }
  ];

  const [activeNav, setActiveNav] = useState(navList[0].id);

  // listen scroll and set activeNav
  useEffect(() => {
    const scrollFn = throttle((e: Event) => {
      if (!e.target) return;
      const doms = navList.map((item) => ({
        dom: document.getElementById(item.id),
        id: item.id
      }));

      const dom = e.target as HTMLDivElement;
      const scrollTop = dom.scrollTop;

      for (let i = doms.length - 1; i >= 0; i--) {
        const offsetTop = doms[i].dom?.offsetTop || 0;
        if (scrollTop + 200 >= offsetTop) {
          setActiveNav(doms[i].id);
          break;
        }
      }
    }, 200);
    document.getElementById('form-container')?.addEventListener('scroll', scrollFn);
    return () => {
      document.getElementById('form-container')?.removeEventListener('scroll', scrollFn);
    };
    // eslint-disable-next-line
  }, []);

  const Label = ({
    children,
    w = 'auto',
    ...props
  }: {
    children: string;
    w?: number | 'auto';
    [key: string]: any;
  }) => (
    <Box
      flex={`0 0 ${w === 'auto' ? 'auto' : `${w}px`}`}
      {...props}
      color={'#333'}
      userSelect={'none'}
    >
      {children}
    </Box>
  );

  return (
    <Flex w="100%" h="100%" justifyContent={'center'} minW={'1024px'} px="32px">
      <Box w="220px">
        <Tabs
          list={[
            { id: 'form', label: 'Config Form' },
            { id: 'yaml', label: 'YAML File' }
          ]}
          activeId={'form'}
          onChange={() =>
            router.replace(
              `/job/edit?${obj2Query({
                name,
                type: 'yaml'
              })}`
            )
          }
        />
        <Box mt={3} borderRadius={'sm'} overflow={'hidden'} backgroundColor={'white'}>
          {navList.map((item) => (
            <Box key={item.id} onClick={() => router.replace(`#${item.id}`)}>
              <Flex
                px={5}
                py={3}
                cursor={'pointer'}
                borderLeft={'2px solid'}
                alignItems={'center'}
                h={'48px'}
                _hover={{
                  backgroundColor: 'myWhite.400'
                }}
                {...{
                  fontWeight: 'bold',
                  borderColor: 'myGray.900'
                }}
              >
                <MyIcon
                  name={item.icon as any}
                  w={'20px'}
                  h={'20px'}
                  color={activeNav === item.id ? 'myGray.500' : 'myGray.400'}
                />
                <Box ml={4}>{t(item.label)}</Box>
              </Flex>
            </Box>
          ))}
        </Box>
      </Box>
      <Box
        w={'782px'}
        ml="16px"
        id={'form-container'}
        height={'100%'}
        position={'relative'}
        overflowY={'scroll'}
      >
        <Box id={'baseInfo'} border="1px solid #DEE0E2" borderRadius="sm" mb="4" bg="white">
          <Box
            py="4"
            pl="46px"
            fontSize="2xl"
            color="myGray.900"
            fontWeight="bold"
            display="flex"
            alignItems="center"
            backgroundColor="myWhite.600"
          >
            <MyIcon name={'formInfo'} mr={5} w={'20px'} color={'myGray.500'} />
            {t('Basic')}
          </Box>
          {/* form */}
          <Box px={'42px'} py={'24px'}>
            {/* app name */}
            <FormControl mb={7} isInvalid={!!errors.jobName} w={'500px'}>
              <Flex alignItems={'center'}>
                <Label w={80}>{t('job.Name')}</Label>
                <Input
                  disabled={isEdit}
                  title={isEdit ? t('Not allowed to change app name') || '' : ''}
                  autoFocus={true}
                  placeholder={
                    t(
                      'Starts with a letter and can contain only lowercase letters, digits, and hyphens (-)'
                    ) || ''
                  }
                  {...register('jobName', {
                    required: t('Not allowed to change app name') || '',
                    pattern: {
                      value: /^[a-z][a-z0-9]+([-.][a-z0-9]+)*$/g,
                      message: t(
                        'The application name can contain only lowercase letters, digits, and hyphens (-) and must start with a letter'
                      )
                    }
                  })}
                />
              </Flex>
            </FormControl>
            {/* <Flex alignItems={'center'} mb={7}>
              <Label w={80}>{t('Type')}</Label>
              <MySelect
                isDisabled={isEdit}
                width={'130px'}
                placeholder={`${t('Type')}`}
                value={'test'}
                list={JobTypeList}
                onchange={(val: any) => {
                  setValue('jobType', val);
                }}
              />
            </Flex> */}
            {/* image */}
            <Box mb={7}>
              <Flex alignItems={'center'}>
                <Label w={80}>{t('Form.Image')}</Label>
                <Tabs
                  w={'126px'}
                  size={'sm'}
                  list={[
                    {
                      label: 'public',
                      id: `public`
                    },
                    {
                      label: 'private',
                      id: `private`
                    }
                  ]}
                  activeId={getValues('secret.use') ? 'private' : 'public'}
                  onChange={(val) => {
                    if (val === 'public') {
                      setValue('secret.use', false);
                    } else {
                      setValue('secret.use', true);
                    }
                  }}
                />
              </Flex>
              <Box mt={4} pl={`${labelWidth}px`}>
                <FormControl isInvalid={!!errors.imageName} w={'420px'}>
                  <Box mb={1} fontSize={'sm'}>
                    {t('Form.Image Name')}
                  </Box>
                  <Input
                    value={getValues('imageName')}
                    backgroundColor={getValues('imageName') ? 'myWhite.500' : 'myWhite.400'}
                    placeholder={`${t('Image Name')}`}
                    {...register('imageName', {
                      required: 'Image name cannot be empty.',
                      setValueAs(e) {
                        return e.replace(/\s*/g, '');
                      }
                    })}
                  />
                </FormControl>
                {getValues('secret.use') ? (
                  <>
                    <FormControl mt={4} isInvalid={!!errors.secret?.username} w={'420px'}>
                      <Box mb={1} fontSize={'sm'}>
                        {t('Form.Username')}
                      </Box>
                      <Input
                        autoComplete="off"
                        backgroundColor={getValues('imageName') ? 'myWhite.500' : 'myWhite.400'}
                        placeholder={`${t('Username for the image registry')}`}
                        {...register('secret.username', {
                          required: t('The user name cannot be empty') || ''
                        })}
                      />
                    </FormControl>
                    <FormControl mt={4} isInvalid={!!errors.secret?.password} w={'420px'}>
                      <Box mb={1} fontSize={'sm'}>
                        {t('Form.Password')}
                      </Box>
                      <Input
                        autoComplete="off"
                        type={'password'}
                        placeholder={`${t('Password for the image registry')}`}
                        backgroundColor={getValues('imageName') ? 'myWhite.500' : 'myWhite.400'}
                        {...register('secret.password', {
                          required: t('The password cannot be empty') || ''
                        })}
                      />
                    </FormControl>
                    <FormControl mt={4} isInvalid={!!errors.secret?.serverAddress} w={'420px'}>
                      <Box mb={1} fontSize={'sm'}>
                        {t('Form.Image Address')}
                      </Box>
                      <Input
                        backgroundColor={getValues('imageName') ? 'myWhite.500' : 'myWhite.400'}
                        placeholder={`${t('Image Address')}`}
                        {...register('secret.serverAddress', {
                          required: t('The image cannot be empty') || ''
                        })}
                      />
                    </FormControl>
                  </>
                ) : null}
              </Box>
            </Box>
            {/* command && param */}
            <FormControl mb={7}>
              <Flex alignItems={'center'}>
                <Label w={80}>{t('Form.Command')}</Label>
                <Input
                  w={'350px'}
                  bg={getValues('runCMD') ? 'myWhite.500' : 'myWhite.400'}
                  placeholder={`${t('Such as')} /bin/bash -c`}
                  {...register('runCMD')}
                />
              </Flex>
            </FormControl>
            <FormControl mb={7}>
              <Flex alignItems={'center'}>
                <Label w={80}>{t('Form.Parameters')}</Label>
                <Input
                  w={'350px'}
                  bg={getValues('cmdParam') ? 'myWhite.500' : 'myWhite.400'}
                  placeholder={`${t('Such as')} sleep 10 && /entrypoint.sh db createdb`}
                  {...register('cmdParam')}
                />
              </Flex>
            </FormControl>
            {/* cron */}
            <Flex alignItems={'center'} mb={7}>
              <Label w={80}>{t('Form.Time')}</Label>
              <Tabs
                w={'220px'}
                list={[
                  { id: 'hour', label: 'Hour' },
                  { id: 'day', label: 'Day' },
                  { id: 'week', label: 'Week' }
                ]}
                activeId={getValues('scheduleType')}
                size={'sm'}
                borderColor={'myGray.200'}
                onChange={(e) => {
                  setValue('scheduleType', e as CreateScheduleType);
                }}
              />
            </Flex>
            {getValues('scheduleType') === 'week' && (
              <Flex alignItems={'center'} mb={7}>
                {WeekSelectList.map((item) => (
                  <Box key={item.id} _notLast={{ mr: 4 }}>
                    <Checkbox
                      defaultChecked={getValues('week').includes(item.id)}
                      onChange={(e) => {
                        const val = e.target.checked;
                        const checkedList = [...getValues('week')];
                        const index = checkedList.findIndex((week) => week === item.id);
                        if (val && index === -1) {
                          setValue('week', checkedList.concat(item.id));
                        } else if (!val && index > -1) {
                          checkedList.splice(index, 1);
                          setValue('week', checkedList);
                        }
                      }}
                    >
                      {t(item.label)}
                    </Checkbox>
                  </Box>
                ))}
              </Flex>
            )}
            {getValues('scheduleType') !== 'hour' && (
              <Flex alignItems={'center'} mb={7}>
                <Label w={80}>{t('Start Hour')}</Label>
                <MySelect
                  width={'120px'}
                  value={getValues('hour')}
                  list={SelectTimeList.slice(0, 24)}
                  icon={<TimeIcon color={'myGray.400'} />}
                  onchange={(val: any) => {
                    setValue('hour', val);
                  }}
                />
              </Flex>
            )}
            <Flex alignItems={'center'}>
              <Label w={80}>{t('Start Minute')}</Label>
              <MySelect
                width={'120px'}
                value={getValues('minute')}
                list={SelectTimeList}
                icon={<TimeIcon color={'myGray.400'} />}
                onchange={(val: any) => {
                  setValue('minute', val);
                }}
              />
            </Flex>
          </Box>
        </Box>
      </Box>
    </Flex>
  );
};

export default Form;

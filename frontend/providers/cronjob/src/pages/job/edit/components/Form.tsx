import { getMyApps } from '@/api/app';
import MyIcon from '@/components/Icon';
import MySelect from '@/components/Select';
import MySlider from '@/components/Slider';
import Tabs from '@/components/Tabs';
import { CronJobTypeList } from '@/constants/job';
import type { QueryType } from '@/types';
import { CronJobEditType } from '@/types/job';
import { sliderNumber2MarkList } from '@/utils/adapt';
import { obj2Query } from '@/utils/tools';
import {
  Box,
  Flex,
  FormControl,
  Icon,
  Input,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Text,
  Button,
  useDisclosure
} from '@chakra-ui/react';
import { MyTooltip } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import { throttle } from 'lodash';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { Controller, UseFormReturn, useFieldArray } from 'react-hook-form';
import styles from './index.module.scss';
import Cron from './Cron';
import Label from './Label';
import EditEnvs from './EditEnvs';

const Form = ({ formHook }: { formHook: UseFormReturn<CronJobEditType, any> }) => {
  if (!formHook) return null;
  const { t } = useTranslation();
  const router = useRouter();
  const { name } = router.query as QueryType;
  const isEdit = useMemo(() => !!name, [name]);
  const { data: launchpadApps, refetch } = useQuery(['getLaunchpadApps'], getMyApps);
  const { isOpen: isEditEnvs, onOpen: onOpenEditEnvs, onClose: onCloseEditEnvs } = useDisclosure();

  const {
    register,
    control,
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

  const { fields: envs, replace: replaceEnvs } = useFieldArray({
    control,
    name: 'envs'
  });

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

  const SliderList = useMemo(() => {
    return {
      cpu: sliderNumber2MarkList({
        val: [100, 200, 500, 1000, 2000, 3000, 4000, 8000],
        type: 'cpu',
        gpuAmount: 1
      }),
      memory: sliderNumber2MarkList({
        val: [64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384],
        type: 'memory',
        gpuAmount: 1
      })
    };
  }, []);

  return (
    <Flex w="100%" h="100%" justifyContent={'center'} px="32px">
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
            <FormControl mb={'32px'} isInvalid={!!errors.jobName} w={'500px'}>
              <Flex alignItems={'center'}>
                <Label w={80}>{t('job.Name')}</Label>
                <Input
                  width={'300px'}
                  disabled={isEdit}
                  title={isEdit ? t('Not allowed to change app name') || '' : ''}
                  autoFocus={true}
                  placeholder={t('Form.JobNamePlaceholder') || ''}
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
            {/* cron */}
            <Cron formHook={formHook} />
            {/* cron type */}
            <Flex alignItems={'center'} mb={7}>
              <Label w={80}>{t('Type')}</Label>
              <MySelect
                isDisabled={isEdit}
                width={'300px'}
                placeholder={`${t('Type')}`}
                value={getValues('jobType')}
                list={CronJobTypeList}
                onchange={(val: any) => {
                  setValue('jobType', val);
                  if (getValues('jobType') === 'image') {
                    setValue('imageName', '');
                    setValue('cmdParam', '');
                    setValue('runCMD', '');
                  }
                }}
              />
            </Flex>
            {/* cronjob type url */}
            {getValues('jobType') === 'url' && (
              <FormControl pl="80px" mb="24px" w={'420px'}>
                <Box mb={1} fontSize={'sm'}>
                  {t('Form.URL')}
                </Box>
                <Input
                  width={'300px'}
                  autoComplete="off"
                  backgroundColor={getValues('url') ? 'myWhite.500' : 'myWhite.400'}
                  {...register('url', {
                    required: true
                  })}
                />
              </FormControl>
            )}
            {/* cronjob type image */}
            {getValues('jobType') === 'image' && (
              <>
                <Box mb={7}>
                  <Box pl="80px">
                    <Label w={80} mb="4px">
                      {t('Form.Image')}
                    </Label>
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
                  </Box>
                  <Box mt={4} pl={'80px'}>
                    <FormControl isInvalid={!!errors.imageName} w={'420px'}>
                      <Box mb={1} fontSize={'sm'}>
                        {t('Form.Image Name')}
                      </Box>
                      <Input
                        width={'300px'}
                        value={getValues('imageName')}
                        backgroundColor={getValues('imageName') ? 'myWhite.500' : 'myWhite.400'}
                        placeholder={`${t('Form.Image Name')}`}
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
                            width={'300px'}
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
                            width={'300px'}
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
                            width={'300px'}
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
                <FormControl mb="16px" pl="80px">
                  <Box mb={'4px'}>
                    <Label w={80}>{t('Form.Command')}</Label>
                    <Input
                      width={'300px'}
                      bg={getValues('runCMD') ? 'myWhite.500' : 'myWhite.400'}
                      placeholder={`${t('Such as')} /bin/bash -c`}
                      {...register('runCMD')}
                    />
                  </Box>
                </FormControl>
                <FormControl mb="16px" pl="80px">
                  <Box mb={'4px'}>
                    <Label w={80}>{t('Form.Parameters')}</Label>
                    <Input
                      width={'300px'}
                      bg={getValues('cmdParam') ? 'myWhite.500' : 'myWhite.400'}
                      placeholder={`${t('Such as')} sleep 10 && /entrypoint.sh db createdb`}
                      {...register('cmdParam')}
                    />
                  </Box>
                </FormControl>
                <Box pl="80px" mb={'18px'}>
                  <Label w={80}>{t('Form.Environment Variables')}</Label>
                  <Button
                    w={'300px'}
                    variant={'outline'}
                    fontSize={'base'}
                    leftIcon={<MyIcon name="edit" width={'16px'} fill={'#485264'} />}
                    onClick={onOpenEditEnvs}
                  >
                    {t('Edit Environment Variables')}
                  </Button>
                  <Box mt={3} w={'300px'}>
                    <table className={'table-cross'}>
                      <tbody>
                        {envs.map((env) => {
                          const valText = env.value
                            ? env.value
                            : env.valueFrom
                            ? 'value from | ***'
                            : '';
                          return (
                            <tr key={env.id}>
                              <th>{env.key}</th>
                              <th>
                                <MyTooltip label={valText}>
                                  <Box
                                    className={styles.textEllipsis}
                                    style={{
                                      userSelect: 'auto'
                                    }}
                                  >
                                    {valText}
                                  </Box>
                                </MyTooltip>
                              </th>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Box>
                </Box>
              </>
            )}
            {isEditEnvs && (
              <EditEnvs
                defaultEnv={envs}
                onClose={onCloseEditEnvs}
                successCb={(e) => replaceEnvs(e)}
              />
            )}
            {/* cronjob type Launchpad */}
            {getValues('jobType') === 'launchpad' && (
              <>
                <Box pl="80px" mb={'18px'}>
                  <Label w={80}>{t('Form.App Name')}</Label>
                  <Flex alignItems={'center'}>
                    <Controller
                      control={control}
                      name="launchpadId"
                      rules={{
                        required: true
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <MySelect
                          isDisabled={isEdit}
                          width={'300px'}
                          value={getValues('launchpadId')}
                          list={launchpadApps!}
                          onchange={(val: any) => {
                            const launchpad = launchpadApps?.find((item) => item.id === val);
                            if (!launchpad) return;
                            setValue('launchpadId', val);
                            setValue('launchpadName', launchpad.name);
                            setValue('replicas', launchpad.replicas);
                            setValue('cpu', launchpad.cpu);
                            setValue('memory', launchpad.memory);
                          }}
                        />
                      )}
                    />

                    {!isEdit && (
                      <Flex
                        ml="12px"
                        justifyContent={'center'}
                        alignItems={'center'}
                        cursor={'pointer'}
                        w="24px"
                        h="24px"
                        backgroundColor={'#F4F6F8'}
                        borderRadius={'4px'}
                        onClick={() => refetch()}
                      >
                        <Icon viewBox="0 0 16 16">
                          <path
                            d="M14.0333 9.92798C13.8654 9.87563 13.6835 9.8918 13.5274 9.97297C13.3713 10.0541 13.2536 10.1937 13.2 10.3613C12.885 11.3243 12.271 12.1617 11.4473 12.7516C10.6236 13.3415 9.63311 13.6532 8.62 13.6413C7.3669 13.6556 6.15929 13.1723 5.26198 12.2975C4.36467 11.4227 3.8509 10.2277 3.83333 8.97465C3.8509 7.72159 4.36467 6.52664 5.26198 5.65182C6.15929 4.77701 7.3669 4.29374 8.62 4.30798C9.75172 4.30525 10.8486 4.69919 11.72 5.42131L10.2733 5.18131C10.1866 5.16705 10.098 5.17006 10.0124 5.19018C9.9269 5.2103 9.84619 5.24714 9.77494 5.29856C9.70369 5.34998 9.64331 5.41498 9.59727 5.48982C9.55123 5.56466 9.52044 5.64787 9.50667 5.73465C9.4924 5.82135 9.49542 5.91002 9.51554 5.99555C9.53566 6.08108 9.57249 6.16179 9.62391 6.23304C9.67533 6.30429 9.74033 6.36467 9.81518 6.41071C9.89002 6.45675 9.97322 6.48754 10.06 6.50131L12.8867 6.96798H13C13.0773 6.96789 13.154 6.95436 13.2267 6.92798C13.2511 6.91871 13.2737 6.90517 13.2933 6.88798C13.3411 6.87021 13.3861 6.8455 13.4267 6.81465L13.4867 6.74131C13.4867 6.70798 13.5467 6.68131 13.5733 6.64131C13.6 6.60131 13.5733 6.57465 13.6067 6.54798C13.6251 6.50916 13.6407 6.46905 13.6533 6.42798L14.1533 3.76131C14.17 3.67377 14.1692 3.5838 14.1511 3.49655C14.1329 3.4093 14.0978 3.32648 14.0476 3.25281C13.9975 3.17914 13.9333 3.11607 13.8588 3.0672C13.7843 3.01833 13.7009 2.98462 13.6133 2.96798C13.5258 2.95135 13.4358 2.95212 13.3486 2.97026C13.2613 2.98839 13.1785 3.02353 13.1048 3.07368C12.9561 3.17495 12.8536 3.33117 12.82 3.50798L12.64 4.47465C11.524 3.50748 10.0968 2.97494 8.62 2.97465C7.01329 2.96043 5.46656 3.58418 4.3192 4.70903C3.17185 5.83389 2.51759 7.36797 2.5 8.97465C2.51759 10.5813 3.17185 12.1154 4.3192 13.2403C5.46656 14.3651 7.01329 14.9889 8.62 14.9746C9.92209 14.9947 11.1962 14.5961 12.2548 13.8376C13.3133 13.0791 14.1003 12.0007 14.5 10.7613C14.5253 10.676 14.5332 10.5864 14.5233 10.4979C14.5135 10.4095 14.486 10.3239 14.4425 10.2462C14.399 10.1685 14.3404 10.1004 14.2701 10.0457C14.1998 9.99105 14.1193 9.95102 14.0333 9.92798Z"
                            fill="#219BF4"
                          />
                        </Icon>
                      </Flex>
                    )}
                  </Flex>
                </Box>

                {/* 副本数 */}
                <Flex mb={'12px'} pl="80px" alignItems={'center'}>
                  <Text w="60px" fontSize={'12px'} fontWeight={400}>
                    {t('Form.Replicas')}
                  </Text>
                  {/* <Switch
                    ml="8px"
                    size={'md'}
                    colorScheme={'blackAlpha'}
                    isChecked={getValues('enableNumberCopies')}
                    {...register('enableNumberCopies', {
                      onChange: (e) => setValue('enableNumberCopies', e.target.checked)
                    })}
                  /> */}
                </Flex>
                <Flex mb={'16px'} alignItems={'center'} pl="80px">
                  <NumberInput
                    w="138px"
                    min={0}
                    max={20}
                    value={getValues('replicas')}
                    onChange={(e) => setValue('replicas', parseInt(e))}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </Flex>

                {/* cpu && memory */}
                <Flex mb={'16px'} pl="80px">
                  <Text w="60px" fontSize={'12px'} fontWeight={400}>
                    {t('Resources')}
                  </Text>
                  {/* <Switch
                    ml="8px"
                    size={'md'}
                    colorScheme={'blackAlpha'}
                    isChecked={getValues('enableResources')}
                    {...register('enableResources', {
                      onChange: (e) => setValue('enableResources', e.target.checked)
                    })}
                  /> */}
                </Flex>

                <Box pl="80px">
                  <Label mr={'7px'} mb="12px">
                    {t('CPU')}
                  </Label>
                  <Flex ml="8px" mb={10} pr={3} alignItems={'flex-start'}>
                    <MySlider
                      markList={SliderList.cpu}
                      activeVal={getValues('cpu')}
                      setVal={(e) => {
                        setValue('cpu', SliderList.cpu[e].value);
                      }}
                      max={SliderList.cpu.length - 1}
                      min={0}
                      step={1}
                    />
                    <Box ml={5} transform={'translateY(10px)'} color={'myGray.500'}>
                      (Core)
                    </Box>
                  </Flex>
                  <Label mr={'7px'} mb="12px">
                    {t('Memory')}
                  </Label>
                  <Flex pl="8px" mb={8} alignItems={'center'}>
                    <MySlider
                      markList={SliderList.memory}
                      activeVal={getValues('memory')}
                      setVal={(e) => {
                        setValue('memory', SliderList.memory[e].value);
                      }}
                      max={SliderList.memory.length - 1}
                      min={0}
                      step={1}
                    />
                  </Flex>
                </Box>
              </>
            )}
          </Box>
        </Box>
      </Box>
    </Flex>
  );
};

export default Form;

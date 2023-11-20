import { obj2Query } from '@/api/tools';
import MyIcon from '@/components/Icon';
import Tabs from '@/components/Tabs';
import TagTextarea from '@/components/Textarea/TagTextarea';
import { DBTypeEnum, RedisHAConfig } from '@/constants/db';
import { INSTALL_ACCOUNT } from '@/store/static';
import { MigrateForm } from '@/types/migrate';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Flex,
  FormControl,
  Grid,
  Input,
  Switch,
  Text
} from '@chakra-ui/react';
import 'github-markdown-css/github-markdown-light.css';
import { throttle } from 'lodash';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import PriceBox from './PriceBox';
import QuotaBox from './QuotaBox';
import PrepareBox from './Prepare';
import { SupportMigrationDBType } from '@/types/db';

const Form = ({
  formHook,
  pxVal
}: {
  formHook: UseFormReturn<MigrateForm, any>;
  pxVal: number;
}) => {
  if (!formHook) return null;
  const { t } = useTranslation();
  const router = useRouter();
  const { name, dbType = 'apecloud-mysql' } = router.query as {
    name: string;
    dbType: SupportMigrationDBType;
  };

  const {
    register,
    setValue,
    getValues,
    formState: { errors }
  } = formHook;

  const navList = [
    {
      id: 'preparation',
      label: 'Migration Preparation',
      icon: 'formInfo'
    },
    {
      id: 'baseInfo',
      label: 'Basic',
      icon: 'formInfo'
    },
    {
      id: 'settings',
      label: 'Advanced Configuration',
      icon: 'settings'
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

  const boxStyles = {
    border: '1px solid #DEE0E2',
    borderRadius: 'sm',
    mb: 4,
    bg: 'white'
  };

  const headerStyles = {
    py: 4,
    pl: '46px',
    fontSize: '2xl',
    color: 'myGray.900',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'myWhite.600'
  };

  return (
    <>
      <Grid
        height={'100%'}
        templateColumns={'220px 1fr'}
        gridGap={5}
        alignItems={'start'}
        pl={`${pxVal}px`}
      >
        <Box>
          <Tabs
            list={[
              { id: 'form', label: 'Config Form' },
              { id: 'yaml', label: 'YAML File' }
            ]}
            activeId={'form'}
            onChange={() => {
              router.push({
                query: {
                  ...router.query,
                  type: 'yaml'
                }
              });
            }}
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
                  {...(activeNav === item.id
                    ? {
                        fontWeight: 'bold',
                        borderColor: 'myGray.900',
                        backgroundColor: 'myWhite.600 !important'
                      }
                    : {
                        color: 'myGray.500',
                        borderColor: 'myGray.200',
                        backgroundColor: 'transparent'
                      })}
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
          <Box mt={3} borderRadius={'sm'} overflow={'hidden'} backgroundColor={'white'}>
            <QuotaBox />
          </Box>
          {INSTALL_ACCOUNT && (
            <Box mt={3} borderRadius={'sm'} overflow={'hidden'} backgroundColor={'white'} p={3}>
              <PriceBox
                components={[
                  {
                    cpu: getValues('cpu'),
                    memory: getValues('memory'),
                    storage: getValues('storage'),
                    replicas: [getValues('replicas') || 1, getValues('replicas') || 1]
                  },
                  ...(getValues('dbType') === DBTypeEnum.redis
                    ? (() => {
                        const config = RedisHAConfig(getValues('replicas') > 1);
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
            </Box>
          )}
        </Box>
        <Box
          id={'form-container'}
          pr={`${pxVal}px`}
          height={'100%'}
          position={'relative'}
          overflowY={'scroll'}
        >
          {/* Migration Preparation */}
          <Box id="preparation" {...boxStyles}>
            <Box {...headerStyles}>
              <MyIcon name={'formInfo'} mr={5} w={'20px'} color={'myGray.500'} />
              {t('Migration Preparation')}
            </Box>
            <Box px={'42px'} py={'24px'} userSelect={'none'}>
              <PrepareBox migrationType={dbType} formHook={formHook} />
            </Box>
          </Box>
          {/* base info */}
          <Box id={'baseInfo'} {...boxStyles}>
            <Box {...headerStyles}>
              <MyIcon name={'formInfo'} mr={5} w={'20px'} color={'myGray.500'} />
              {t('Basic')}
            </Box>
            <Box px={'42px'} py={'24px'}>
              <Text color={'#24282C'} fontSize={'16px'} fontWeight={500}>
                {t('Source Database')}
              </Text>
              <FormControl mt={'16px'} isInvalid={!!errors.sourceHost} w={'500px'}>
                <Flex alignItems={'center'}>
                  <Label w={80}>{t('Database Host')}</Label>
                  <Input
                    {...register('sourceHost', {
                      required: t('Database Host Empty') || ''
                    })}
                  />
                </Flex>
              </FormControl>
              <FormControl mt={'16px'} isInvalid={!!errors.sourcePort} w={'500px'}>
                <Flex alignItems={'center'}>
                  <Label w={80}>{t('Port')}</Label>
                  <Input
                    {...register('sourcePort', {
                      required: t('Database Port Empty') || ''
                    })}
                  />
                </Flex>
              </FormControl>
              <FormControl mt={'16px'} isInvalid={!!errors.sourceUsername} w={'500px'}>
                <Flex alignItems={'center'}>
                  <Label w={80}>{t('Username')}</Label>
                  <Input
                    {...register('sourceUsername', {
                      required: t('Database UserName Empty') || ''
                    })}
                  />
                </Flex>
              </FormControl>
              <FormControl mt={'16px'} isInvalid={!!errors.sourcePassword} w={'500px'}>
                <Flex alignItems={'center'}>
                  <Label w={80}>{t('Password')}</Label>
                  <Input
                    {...register('sourcePassword', {
                      required: t('Database Password Empty') || ''
                    })}
                  />
                </Flex>
              </FormControl>
              <FormControl mt={'16px'} isInvalid={!!errors.sourceDatabase} w={'500px'}>
                <Flex alignItems={'center'}>
                  <Label w={80}>{t('DB Name')}</Label>
                  <Input
                    {...register('sourceDatabase', {
                      required: t('Database Name Empty') || ''
                    })}
                  />
                </Flex>
              </FormControl>
              <FormControl mt={'16px'} isInvalid={!!errors.sourceDatabaseTable} w={'500px'}>
                <Flex alignItems={'start'}>
                  <Label w={80}>{t('DB Table')}</Label>
                  <TagTextarea
                    defaultValues={getValues('sourceDatabaseTable') || []}
                    onUpdate={(e) => {
                      setValue('sourceDatabaseTable', e);
                    }}
                  />
                </Flex>
              </FormControl>
              <FormControl mt={'16px'} w={'500px'}>
                <Flex alignItems={'center'}>
                  <Label w={80}>{t('Remark')}</Label>
                  <Input {...register('remark')} />
                </Flex>
              </FormControl>
            </Box>
          </Box>

          {/* settings */}
          <Accordion id={'settings'} allowToggle>
            <AccordionItem {...boxStyles}>
              <AccordionButton
                {...headerStyles}
                justifyContent={'space-between'}
                _hover={{ bg: '' }}
              >
                <Flex alignItems={'center'}>
                  <MyIcon name={'settings'} mr={5} w={'20px'} color={'myGray.500'} />
                  <Box>{t('Advanced Configuration')}</Box>
                  <Box
                    bg={'myGray.100'}
                    w={'46px'}
                    py={'2px'}
                    ml={3}
                    fontSize={'sm'}
                    borderRadius={'20px'}
                    color={'myGray.600'}
                    border={'1px solid'}
                    borderColor={'myGray.200'}
                  >
                    {t('Option')}
                  </Box>
                </Flex>
                <AccordionIcon w={'1.3em'} h={'1.3em'} color={'myGray.700'} />
              </AccordionButton>

              <AccordionPanel px={'42px'} py={'24px'}>
                <Flex alignItems={'center'} h={'35px'}>
                  <Text fontSize={'14px'} color={'#333333'} fontWeight={400} mr="40px">
                    {t('Continuous Migration')}
                  </Text>
                  <Switch size={'md'} colorScheme={'blackAlpha'} {...register('continued')} />
                </Flex>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        </Box>
      </Grid>
    </>
  );
};

export default Form;

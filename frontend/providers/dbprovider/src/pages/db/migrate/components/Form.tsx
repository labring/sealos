import MyIcon from '@/components/Icon';
import QuotaBox from '@/components/QuotaBox';
import TagTextarea from '@/components/Textarea/TagTextarea';
import { SupportMigrationDBType } from '@/types/db';
import { MigrateForm } from '@/types/migrate';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Center,
  Flex,
  FormControl,
  Grid,
  Input,
  Portal,
  Switch,
  Text,
  Textarea,
  useDisclosure,
  useTheme
} from '@chakra-ui/react';
import { Tabs, useMessage } from '@sealos/ui';
import 'github-markdown-css/github-markdown-light.css';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import PrepareBox from './Prepare';
import { I18nCommonKey } from '@/types/i18next';
import { parseDatabaseUrl, useClipboard, useCopyData } from '@/utils/tools';

import { Popover, PopoverTrigger, PopoverContent, PopoverBody } from '@chakra-ui/react';

const Form = ({
  formHook,
  pxVal
}: {
  formHook: UseFormReturn<MigrateForm, any>;
  pxVal: number;
}) => {
  if (!formHook) return null;
  const { message: toast } = useMessage();
  const { t } = useTranslation();
  const theme = useTheme();
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

  const navList: { id: string; label: I18nCommonKey; icon: string }[] = useMemo(
    () => [
      {
        id: 'preparation',
        label: t('migration_preparation'),
        icon: 'book'
      },
      {
        id: 'baseInfo',
        label: t('basic'),
        icon: 'formInfo'
      },
      {
        id: 'settings',
        label: t('advanced_configuration'),
        icon: 'settings'
      }
    ], // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [activeNav, setActiveNav] = useState(navList[0].id);

  const baseInfoRef = useRef<HTMLDivElement | null>(null);
  const settingRef = useRef<HTMLDivElement | null>(null);
  const [accordionOpened, setAccordionOpened] = useState(false);

  // listen scroll and set activeNav
  useEffect(() => {
    const baseInfo = baseInfoRef.current;
    const setting = settingRef.current;

    const observerCallback = (
      entries: IntersectionObserverEntry[],
      observer: IntersectionObserver
    ) => {
      entries.forEach((entry) => {
        if (entry.target === baseInfo) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.85) {
            setActiveNav(navList[1].id);
          } else {
            setActiveNav(navList[0].id);
          }
        } else if (entry.target === setting && accordionOpened == true) {
          if (entry.isIntersecting && entry.intersectionRatio >= 1) {
            setActiveNav(navList[2].id);
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      threshold: [0.85, 1] // 设置两个阈值，分别用于 baseInfo 和 setting
    });

    if (baseInfo) {
      observer.observe(baseInfo);
    }
    if (setting) {
      observer.observe(setting);
    }

    return () => {
      if (baseInfo) {
        observer.unobserve(baseInfo);
      }
      if (setting) {
        observer.unobserve(setting);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseInfoRef.current, settingRef.current, accordionOpened]);

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
    border: theme.borders.base,
    borderRadius: 'lg',
    mb: 4,
    bg: 'white'
  };

  const headerStyles = {
    py: 4,
    pl: '42px',
    borderTopRadius: 'lg',
    fontSize: 'xl',
    color: 'grayModern.900',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'grayModern.50'
  };

  function processURL(url: string) {
    try {
      const data = parseDatabaseUrl(url);
      setValue('sourceHost', data.hostname);
      setValue('sourcePort', data.port);
      setValue('sourceUsername', data.username);
      setValue('sourcePassword', data.password);
      setValue('sourceDatabase', data.pathname);
      onClose();
    } catch (error) {
      toast({
        title: t('parse_url_failed'),
        status: 'error'
      });
    }
  }

  const { onOpen, onClose, isOpen } = useDisclosure();

  const connectionRef = useRef<HTMLTextAreaElement | null>(null);

  function identifyClipboard() {
    if (connectionRef.current !== null) {
      const text = connectionRef.current.value;
      processURL(text);
    }
  }

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
              { id: 'form', label: t('config_form') },
              { id: 'yaml', label: t('yaml_file') }
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

          <Box
            mt={3}
            borderRadius={'md'}
            overflow={'hidden'}
            backgroundColor={'white'}
            border={theme.borders.base}
            p={'4px'}
          >
            {navList.map((item) => (
              <Box key={item.id} onClick={() => router.replace(`#${item.id}`)}>
                <Flex
                  borderRadius={'base'}
                  cursor={'pointer'}
                  gap={'8px'}
                  alignItems={'center'}
                  h={'40px'}
                  _hover={{
                    backgroundColor: 'grayModern.100'
                  }}
                  color="grayModern.900"
                  backgroundColor={activeNav === item.id ? 'grayModern.100' : 'transparent'}
                >
                  <Box
                    w={'2px'}
                    h={'24px'}
                    justifySelf={'start'}
                    bg={'grayModern.900'}
                    borderRadius={'12px'}
                    opacity={activeNav === item.id ? 1 : 0}
                  />
                  <MyIcon
                    name={item.icon as any}
                    w={'20px'}
                    h={'20px'}
                    color={activeNav === item.id ? 'grayModern.900' : 'grayModern.500'}
                  />
                  <Box>{t(item.label)}</Box>
                </Flex>
              </Box>
            ))}
          </Box>
          <Box mt={3} overflow={'hidden'}>
            <QuotaBox />
          </Box>
        </Box>
        <Box
          id={'form-container'}
          pr={`${pxVal}px`}
          height={'100%'}
          position={'relative'}
          overflowY={'scroll'}
        >
          {/* migration_preparation */}
          <Box id="preparation" {...boxStyles}>
            <Box {...headerStyles}>
              <MyIcon name={'book'} mr={5} w={'20px'} color={'grayModern.600'} />
              {t('migration_preparation')}
            </Box>
            <Box px={'42px'} py={'24px'} userSelect={'none'}>
              <PrepareBox migrationType={dbType} formHook={formHook} />
            </Box>
          </Box>
          {/* base info */}
          <Box ref={baseInfoRef} id="baseInfo" {...boxStyles}>
            <Box {...headerStyles}>
              <MyIcon name={'formInfo'} mr={5} w={'20px'} color={'grayModern.600'} />
              {t('basic')}
            </Box>
            <Box px={'42px'} py={'24px'}>
              <Flex alignItems={'center'} w={400}>
                <Text color={'#24282C'} fontSize={'16px'} fontWeight={500} w={94}>
                  {t('source_database')}
                </Text>
                <Popover placement="bottom-start" onOpen={onOpen} onClose={onClose} isOpen={isOpen}>
                  <PopoverTrigger>
                    <Button variant="outline" gap={'6px'}>
                      <MyIcon name="textRecognition" w={'16px'} h={'16px'} />
                      {t('paste_database_connection')}
                    </Button>
                  </PopoverTrigger>
                  <Portal>
                    <PopoverContent width={'426px'}>
                      <PopoverBody>
                        <Text color="#667085" fontSize={14}>
                          {t('paste_database_connection_desc')}
                        </Text>
                        <Textarea my={2} ref={connectionRef} />
                        <Box display={'flex'} justifyContent={'flex-end'} mt={2} gap={2}>
                          <Button variant="outline" onClick={onClose}>
                            {t('Cancel')}
                          </Button>
                          <Button onClick={identifyClipboard}>{t('identify')}</Button>
                        </Box>
                      </PopoverBody>
                    </PopoverContent>
                  </Portal>
                </Popover>
              </Flex>
              <FormControl mt={'16px'} isInvalid={!!errors.sourceHost} w={'500px'}>
                <Flex alignItems={'center'}>
                  <Label w={94}>{t('database_host')}</Label>
                  <Input
                    placeholder={t('database_host')}
                    {...register('sourceHost', {
                      required: t('database_host_empty')
                    })}
                  />
                </Flex>
              </FormControl>
              <FormControl mt={'16px'} isInvalid={!!errors.sourcePort} w={'500px'}>
                <Flex alignItems={'center'}>
                  <Label w={94}>{t('Port')}</Label>
                  <Input
                    placeholder={t('Port')}
                    {...register('sourcePort', {
                      required: t('database_port_empty')
                    })}
                  />
                </Flex>
              </FormControl>
              <FormControl mt={'16px'} isInvalid={!!errors.sourceUsername} w={'500px'}>
                <Flex alignItems={'center'}>
                  <Label w={94}>{t('Username')}</Label>
                  <Input
                    placeholder={t('Username')}
                    {...register('sourceUsername', {
                      required: t('database_username_empty')
                    })}
                  />
                </Flex>
              </FormControl>
              <FormControl mt={'16px'} isInvalid={!!errors.sourcePassword} w={'500px'}>
                <Flex alignItems={'center'}>
                  <Label w={94}>{t('Password')}</Label>
                  <Input
                    placeholder={t('Password')}
                    {...register('sourcePassword', {
                      required: t('database_password_empty')
                    })}
                  />
                </Flex>
              </FormControl>
              <FormControl mt={'16px'} isInvalid={!!errors.sourceDatabase} w={'500px'}>
                <Flex alignItems={'center'}>
                  <Label w={94}>{t('db_name')}</Label>
                  <Input
                    placeholder={t('db_name')}
                    {...register('sourceDatabase', {
                      required: t('database_name_empty')
                    })}
                  />
                </Flex>
              </FormControl>
              <FormControl mt={'16px'} isInvalid={!!errors.sourceDatabaseTable} w={'500px'}>
                <Flex alignItems={'start'}>
                  <Label w={94} style={{ lineHeight: '32px' }}>
                    {t('db_table')}
                  </Label>
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
                  <Label w={94}>{t('remark')}</Label>
                  <Input placeholder={t('remark')} flex={1} {...register('remark')} />
                </Flex>
              </FormControl>
            </Box>
          </Box>

          {/* settings */}
          <Accordion
            ref={settingRef}
            id="settings"
            allowToggle
            onChange={() => setAccordionOpened(!accordionOpened)}
          >
            <AccordionItem {...boxStyles}>
              <AccordionButton
                {...headerStyles}
                justifyContent={'space-between'}
                _hover={{ bg: '' }}
                borderRadius={'lg'}
              >
                <Flex alignItems={'center'}>
                  <MyIcon name={'settings'} mr={5} w={'20px'} />
                  <Box>{t('advanced_configuration')}</Box>
                  <Center
                    bg={'#E8EBF0'}
                    w={'48px'}
                    height={'28px'}
                    py={'2px'}
                    ml={3}
                    fontSize={'base'}
                    borderRadius={'33px'}
                    color={'grayModern.600'}
                  >
                    {t('Option')}
                  </Center>
                </Flex>
                <AccordionIcon w={'1.3em'} h={'1.3em'} color={'myGray.700'} />
              </AccordionButton>

              <AccordionPanel px={'42px'} py={'24px'}>
                <Text fontSize={'14px'} color={'#333333'} fontWeight={400}>
                  {t('migrate.Incremental migration prompt information')}
                </Text>
                <Flex alignItems={'center'} h={'35px'}>
                  <Text fontSize={'14px'} color={'#333333'} fontWeight={400} mr="40px">
                    {t('continuous_migration')}
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

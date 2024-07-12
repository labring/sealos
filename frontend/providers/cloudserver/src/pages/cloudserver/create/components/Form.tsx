import { getCloudServerImage, getCloudServerRegion, getCloudServerType } from '@/api/cloudserver';
import MyIcon from '@/components/Icon';
import { MyTable, TableColumnsType } from '@/components/MyTable';
import MyTooltip from '@/components/MyTooltip';
import { CloudServerStatus, CloudServerType, EditForm, StorageType } from '@/types/cloudserver';
import {
  CVMArchType,
  CVMChargeType,
  CVMRegionType,
  CVMZoneType,
  VirtualMachineType
} from '@/types/region';
import {
  Box,
  Button,
  Center,
  Divider,
  Flex,
  FormControl,
  IconButton,
  Image,
  Input,
  ListItem,
  Radio,
  Skeleton,
  Stack,
  Switch,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  TabPanelsProps,
  TabProps,
  Tabs,
  Text,
  UnorderedList,
  useDisclosure,
  useTheme
} from '@chakra-ui/react';
import { MySelect, RangeInput, Tabs as SealosTabs } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import { customAlphabet } from 'nanoid';
import { useTranslation } from 'next-i18next';
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { generateRandomPassword } from '@/utils/tools';

const tabPanelStyles: TabPanelsProps = {
  padding: '0px',
  my: '24px'
};

const tabStyles: TabProps = {
  bg: 'grayModern.50',
  _hover: {
    opacity: 0.9,
    color: 'brightBlue.700',
    borderColor: '#85ccff'
  },
  border: '1px solid',
  borderRadius: '2px',
  cursor: 'pointer',
  fontWeight: '400',
  color: 'grayModern.900',
  borderColor: 'grayModern.200',
  minW: '160px',
  css: {
    svg: {
      opacity: 0
    }
  },
  _selected: {
    bg: '#F9FDFE',
    borderColor: 'brightBlue.400',
    svg: {
      opacity: 1,
      color: 'brightBlue.600'
    }
  },
  mr: '8px'
};

const Label = ({
  children,
  w = 120,
  ...props
}: {
  children: JSX.Element;
  w?: number | 'auto';
  [key: string]: any;
}) => (
  <Box
    flex={`0 0 ${w === 'auto' ? 'auto' : `${w}px`}`}
    color={'grayModern.900'}
    userSelect={'none'}
    fontWeight={'bold'}
    {...props}
  >
    {children}
  </Box>
);

function VirtualMachinePackageTabs({
  virtualMachinePackageFamily
}: {
  virtualMachinePackageFamily: string[];
}) {
  const formHook = useFormContext<EditForm>();
  const index = virtualMachinePackageFamily?.findIndex(
    (item) => item === formHook?.getValues('virtualMachinePackageFamily')
  );
  const { t } = useTranslation();

  return (
    <Tabs
      index={index !== -1 ? index : 0}
      variant="unstyled"
      onChange={(e) => {
        const item = virtualMachinePackageFamily[e];
        formHook?.setValue('virtualMachinePackageFamily', item);
      }}
    >
      <TabList alignItems={'center'}>
        <Label>
          <Text>{t('Type')}</Text>
        </Label>
        {virtualMachinePackageFamily?.map((item) => (
          <Tab {...tabStyles} key={item}>
            {t(item)}
            <MyIcon key={item} ml={'auto'} name="check" width={'16px'} />
          </Tab>
        ))}
      </TabList>
    </Tabs>
  );
}

function VirtualMachineTabs({ virtualMachine }: { virtualMachine: VirtualMachineType[] }) {
  const formHook = useFormContext<EditForm>();
  const index = virtualMachine?.findIndex(
    (item) => item.virtualMachineType === formHook?.getValues('virtualMachineType')
  );
  const { t } = useTranslation();

  return (
    <Tabs
      index={index !== -1 ? index : 0}
      variant="unstyled"
      onChange={(e) => {
        const item = virtualMachine[e];
        formHook?.setValue('virtualMachineType', item.virtualMachineType);
        formHook?.setValue('virtualMachinePackageFamily', item.virtualMachinePackageFamily[0]);
      }}
    >
      <TabList alignItems={'center'}>
        <Label>
          <Text>{t('Instance Family')}</Text>
        </Label>
        {virtualMachine?.map((item) => (
          <Tab {...tabStyles} key={item.virtualMachineType}>
            {t(item.virtualMachineType)}
            <MyIcon key={item.virtualMachineType} ml={'auto'} name="check" width={'16px'} />
          </Tab>
        ))}
      </TabList>
      <TabPanels>
        {virtualMachine?.map((item) => (
          <TabPanel {...tabPanelStyles} key={item.virtualMachineType}>
            <VirtualMachinePackageTabs
              virtualMachinePackageFamily={item.virtualMachinePackageFamily}
            />
          </TabPanel>
        ))}
      </TabPanels>
    </Tabs>
  );
}

function ArchTabs({ arch }: { arch: CVMArchType[] }) {
  const formHook = useFormContext<EditForm>();
  const index = arch?.findIndex((item) => item.arch === formHook?.getValues('virtualMachineArch'));
  const { t } = useTranslation();
  return (
    <Tabs
      index={index !== -1 ? index : 0}
      variant="unstyled"
      onChange={(e) => {
        const item = arch[e];
        formHook?.setValue('virtualMachineArch', item.arch);
        formHook?.setValue('virtualMachineType', item.virtualMachineType[0].virtualMachineType);
        formHook?.setValue(
          'virtualMachinePackageFamily',
          item.virtualMachineType[0].virtualMachinePackageFamily[0]
        );
      }}
    >
      <TabList alignItems={'center'}>
        <Label>
          <Text>{t('Architecture')}</Text>
        </Label>
        {arch?.map((item) => (
          <Tab key={item.arch} {...tabStyles}>
            {t(item.arch)}
            <MyIcon ml={'auto'} name="check" width={'16px'} />
          </Tab>
        ))}
      </TabList>
      <TabPanels>
        {arch?.map((item) => (
          <TabPanel {...tabPanelStyles} key={item.arch}>
            <VirtualMachineTabs virtualMachine={item.virtualMachineType} />
          </TabPanel>
        ))}
      </TabPanels>
    </Tabs>
  );
}

function ZoneTabs({ zone }: { zone: CVMZoneType[] }) {
  const formHook = useFormContext<EditForm>();
  const { t } = useTranslation();
  const index = zone?.findIndex((item) => item.zone === formHook?.getValues('zone'));

  return (
    <Tabs index={index !== -1 ? index : 0} variant="unstyled">
      <TabList alignItems={'center'}>
        <Label>
          <Text>{t('Availability Zone')}</Text>
        </Label>
        {zone?.map((item) => (
          <Tab
            key={item.zone}
            {...tabStyles}
            onClick={() => {
              formHook?.setValue('zone', item.zone);
            }}
          >
            {item.zone}
            <MyIcon ml={'auto'} name="check" width={'16px'} />
          </Tab>
        ))}
      </TabList>
      <TabPanels>
        {zone?.map((item) => (
          <TabPanel {...tabPanelStyles} key={item.zone}>
            <ArchTabs arch={item.arch} />
          </TabPanel>
        ))}
      </TabPanels>
    </Tabs>
  );
}

function OuterTabs({ systemRegion }: { systemRegion: CVMRegionType[] }) {
  const formHook = useFormContext<EditForm>();
  const { t } = useTranslation();
  const index = systemRegion?.findIndex(
    (item) => item.chargeType === formHook?.getValues('chargeType')
  );

  return (
    <Tabs
      variant="unstyled"
      index={index}
      onChange={(e) => {
        const item = systemRegion[e];
        formHook?.setValue('chargeType', item.chargeType);
        formHook?.setValue('virtualMachineArch', item.zone[0].arch[0].arch);
        formHook.setValue(
          'virtualMachineType',
          item.zone[0].arch[0].virtualMachineType[0].virtualMachineType
        );
        formHook.setValue(
          'virtualMachinePackageFamily',
          item.zone[0].arch[0].virtualMachineType[0].virtualMachinePackageFamily[0]
        );
      }}
    >
      <TabList alignItems={'center'}>
        <Label>
          <Text>{t('Billing model')}</Text>
        </Label>
        {systemRegion?.map((item) => (
          <Tab key={item.chargeType} {...tabStyles}>
            {t(item.chargeType)}
            <MyIcon ml={'auto'} name="check" width={'16px'} />
          </Tab>
        ))}
      </TabList>
      <TabPanels>
        {systemRegion?.map((item) => (
          <TabPanel {...tabPanelStyles} key={item.chargeType}>
            <ZoneTabs zone={item.zone} />
          </TabPanel>
        ))}
      </TabPanels>
    </Tabs>
  );
}

export default function Form({
  refresh,
  setInstanceType
}: {
  refresh: boolean;
  setInstanceType: Dispatch<SetStateAction<CloudServerType | undefined>>;
}) {
  const formHook = useFormContext<EditForm>();
  if (!formHook) return <></>;
  const [clientRender, setClientRender] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const theme = useTheme();
  const { t } = useTranslation();

  const specialTips = useMemo(() => {
    return {
      specialChars: "()`~!@#$%^&*-+=_|{}[]:;'<>,.?/",
      regex:
        /^(?!.*\s)(?!\/)(?=[^\/]{8,30}$)(?:(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])|(?=.*[a-z])(?=.*[A-Z])(?=.*[\(\)`~!@#$%^&*\-+=_|{}\[\]:;'<>,.?/])|(?=.*[a-z])(?=.*[0-9])(?=.*[\(\)`~!@#$%^&*\-+=_|{}\[\]:;'<>,.?/])|(?=.*[A-Z])(?=.*[0-9])(?=.*[\(\)`~!@#$%^&*\-+=_|{}\[\]:;'<>,.?/])).*$/
    };
  }, []);

  useEffect(() => {
    setClientRender(true);
  }, []);

  const { data: systemRegion } = useQuery(['getCloudServerRegion'], getCloudServerRegion, {
    staleTime: 5 * 60 * 1000,
    onSuccess(data) {
      // set default form
      if (data?.[0]?.chargeType) {
        formHook.setValue('chargeType', data[0].chargeType);
        formHook.setValue('zone', data[0].zone[0].zone);
        formHook.setValue('virtualMachineArch', data[0].zone[0].arch[0].arch);
        formHook.setValue(
          'virtualMachineType',
          data[0].zone[0].arch[0].virtualMachineType[0].virtualMachineType
        );
        formHook.setValue(
          'virtualMachinePackageFamily',
          data[0].zone[0].arch[0].virtualMachineType[0].virtualMachinePackageFamily[0]
        );
      }
    }
  });

  const { data: systemImage } = useQuery(['getCloudServerImage'], getCloudServerImage, {
    staleTime: 5 * 60 * 1000,
    onSuccess(data) {
      if (data['ubuntu']) {
        formHook.setValue('systemImageId', data['ubuntu'].images[0].id);
        formHook.setValue('system', 'ubuntu');
      }
    }
  });

  const { data: serverTypeData } = useQuery(
    [
      'getCloudServerType',
      formHook.getValues('zone'),
      formHook.getValues('virtualMachinePackageFamily'),
      formHook.getValues('chargeType'),
      formHook.getValues('virtualMachineType'),
      formHook.getValues('virtualMachineArch')
    ],
    () =>
      getCloudServerType({
        zone: formHook.getValues('zone'),
        virtualMachinePackageFamily: formHook.getValues('virtualMachinePackageFamily'),
        chargeType: formHook.getValues('chargeType'),
        virtualMachineType: formHook.getValues('virtualMachineType'),
        virtualMachineArch: formHook.getValues('virtualMachineArch')
      }),
    {
      staleTime: 5 * 60 * 1000,
      enabled: !!formHook.getValues('virtualMachinePackageFamily'),
      onSuccess(data) {
        if (data?.[0]) {
          formHook.setValue('virtualMachinePackageName', data[0].virtualMachinePackageName);
          setInstanceType(data?.[0]);
        }
      }
    }
  );

  const {
    register,
    control,
    setValue,
    getValues,
    formState: { errors }
  } = formHook;

  const {
    fields: storages,
    append: appendStorages,
    remove: removeStorages,
    update: updateStorages
  } = useFieldArray({
    control,
    name: 'storages'
  });

  const columns = useMemo<TableColumnsType[]>(
    () => [
      {
        title: t('Type'),
        key: 'Type',
        render: (item: CloudServerType, rowNumber, activeId) => {
          return (
            <Flex alignItems={'center'} pl={4} gap={'12px'}>
              <Radio colorScheme={'grayModern'} isChecked={rowNumber === activeId}></Radio>
              <Flex flexDirection={'column'}>
                <Text>{item.virtualMachinePackageName}</Text>
                {item.status === CloudServerStatus.Unavailable && (
                  <Text color={'brightBlue.700'}>{t('sold out')}</Text>
                )}
              </Flex>
            </Flex>
          );
        }
      },
      {
        title: t('CPU'),
        render: (item: CloudServerType) => {
          return <Text>{item.cpu}C</Text>;
        },
        key: 'cpu'
      },
      {
        title: t('Memory'),
        render: (item: CloudServerType) => {
          return <Text>{item.memory}GB</Text>;
        },
        key: 'memory'
      },
      {
        title: t('GPU'),
        dataIndex: 'gpu',
        key: 'GPU'
      },
      {
        title: t('Reference fee'),
        key: 'instancePrice',
        render: (item: CloudServerType) => {
          return (
            <Text
              color={
                item.status === CloudServerStatus.Unavailable ? 'grayModern.500' : 'brightBlue.700'
              }
            >
              {t('Reference fee tip', { price: item.instancePrice })}/
              {formHook.getValues('chargeType') === CVMChargeType.postPaidByHour
                ? t('hour')
                : t('month')}
            </Text>
          );
        }
      }
    ],
    [t]
  );

  const storageColumns = useMemo<TableColumnsType[]>(
    () => [
      {
        title: t('The purpose of the disk'),
        key: 'disk-purpose',
        render: (item: StorageType) => {
          return <Box pl={4}>{t(item.use)}</Box>;
        }
      },
      {
        title: t('capacity'),
        key: 'capacity',
        render: (item: StorageType, rowNumber) => {
          return (
            <Flex alignItems={'center'} gap={'8px'}>
              <RangeInput
                inputStyle={{ fontSize: 'base' }}
                w={142}
                value={getValues(`storages.${rowNumber}.size`)}
                min={20}
                max={500}
                hoverText={t('Quantity tips', { amount1: 20, amount2: 500 }) || ''}
                setVal={(val) => {
                  register(`storages.${rowNumber}.size`, {
                    required:
                      t('The number of instances cannot be empty') ||
                      'The number of instances cannot be empty',
                    min: {
                      value: 20,
                      message: t('The minimum number of instances is 20')
                    },
                    max: {
                      value: 500,
                      message: t('The maximum number of instances is 500')
                    }
                  });
                  setValue(`storages.${rowNumber}.size`, isNaN(val) ? 20 : val);
                }}
              />
              <Text fontSize={'base'}>GiB</Text>
            </Flex>
          );
        }
      },
      {
        title: t('Amount'),
        key: 'amount',
        render: (item: StorageType, rowNumber) => {
          return (
            <Flex alignItems={'center'} gap={'8px'}>
              {rowNumber === 0 ? (
                <Box
                  width={'142px'}
                  p={'6px'}
                  pl={'12px'}
                  borderRadius={'base'}
                  bg={'grayModern.100'}
                >
                  1
                </Box>
              ) : (
                <RangeInput
                  inputStyle={{ fontSize: 'base' }}
                  w={142}
                  value={getValues(`storages.${rowNumber}.amount`)}
                  min={1}
                  max={20}
                  hoverText={t('Quantity tips', { amount1: 1, amount2: 20 }) || ''}
                  setVal={(val) => {
                    register(`storages.${rowNumber}.amount`, {
                      required:
                        t('The number of instances cannot be empty') ||
                        'The number of instances cannot be empty',
                      min: {
                        value: 1,
                        message: t('The minimum number of instances is 20')
                      },
                      max: {
                        value: 20,
                        message: t('The maximum number of instances is 20')
                      }
                    });
                    setValue(`storages.${rowNumber}.amount`, isNaN(val) ? 1 : val);
                  }}
                />
              )}
            </Flex>
          );
        }
      },
      {
        title: t('Operate'),
        key: 'operate',
        render: (item, rowNumber) => {
          return (
            <Box>
              {rowNumber === 0 ? (
                <Box></Box>
              ) : (
                <IconButton
                  width={'32px'}
                  variant={'outline'}
                  icon={<MyIcon name={'delete'} w={'16px'} fill={'#485264'} />}
                  aria-label={'button'}
                  bg={'#FFF'}
                  onClick={() => removeStorages(rowNumber)}
                />
              )}
            </Box>
          );
        }
      }
    ],
    [getValues, register, removeStorages, setValue, t]
  );

  const monthsArray = useMemo(() => {
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 24, 36];
    return months.map((month) => {
      let label;
      if (month < 12) {
        label = `${month} ${t('indivual')} ${t('month')}`;
      } else if (month === 12) {
        label = `1${t('year')}`;
      } else {
        const years = Math.floor(month / 12);
        const remainingMonths = month % 12;
        label =
          remainingMonths === 0
            ? `${years} ${t('year')}`
            : `${years} ${t('year')}${remainingMonths} ${t('indivual')} ${t('month')}`;
      }
      return {
        value: month.toString(),
        label: label
      };
    });
  }, [t]);

  return (
    <Flex
      height={'100%'}
      bg="white"
      w={'80%'}
      borderRadius={'lg'}
      border={theme.borders.base}
      flexDirection={'column'}
    >
      <Flex alignItems={'center'} py="16px" px="42px" bg={'grayModern.50'} borderTopRadius={'lg'}>
        <MyIcon name="formInfo" w={'24px'}></MyIcon>
        <Text ml="12px" fontSize={'18px'} fontWeight={500} color={'grayModern.900'}>
          {t('Basic Config')}
        </Text>
      </Flex>
      <Box pt="24px" px="42px" pb="64px" flex={1} h="0" overflow={'auto'}>
        <OuterTabs systemRegion={systemRegion || []} />
        <Flex alignItems={'center'} mb={'24px'}>
          <Label alignSelf={'self-start'}>
            <Text></Text>
          </Label>
          <Box flex={1}>
            {serverTypeData ? (
              <MyTable
                itemClass="appItem"
                columns={columns}
                data={serverTypeData.map((item) => ({
                  ...item,
                  isOptional: item.status === CloudServerStatus.Available ? true : false
                }))}
                openSelected
                onRowClick={(item: CloudServerType) => {
                  setValue('virtualMachinePackageName', item.virtualMachinePackageName);
                  setValue('virtualMachinePackageFamily', item.virtualMachinePackageFamily);
                  setInstanceType(item);
                }}
              />
            ) : (
              <Stack>
                <Skeleton height="200px" startColor={'grayModern.100'} endColor="grayModern.250" />
              </Stack>
            )}
          </Box>
        </Flex>
        {/* systemImage */}
        <Flex alignItems={'center'} mb={'24px'} flex={1}>
          <Label alignSelf={'self-start'}>
            <Text>{t('Image')}</Text>
          </Label>
          <Box>
            <Flex flexWrap={'wrap'} gap={'12px'}>
              {systemImage &&
                Object.keys(systemImage)?.map((key) => {
                  return (
                    <Center
                      key={key}
                      flexDirection={'column'}
                      w={'140px'}
                      height={'88px'}
                      border={'1px solid'}
                      borderRadius={'2px'}
                      cursor={'pointer'}
                      fontWeight={'bold'}
                      color={'grayModern.900'}
                      {...(getValues('system') === key
                        ? {
                            filter: 'grayscale(0%)',
                            // background: '#FFF',
                            bg: 'rgba(33, 155, 244, 0.05)',
                            borderColor: 'brightBlue.500'
                            // boxShadow: '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)'
                          }
                        : {
                            bg: '#F7F8FA',
                            borderColor: 'grayModern.200',
                            filter: 'grayscale(100%)',
                            _hover: {
                              borderColor: '#85ccff',
                              filter: 'grayscale(0%)'
                            }
                          })}
                      onClick={() => {
                        setValue('system', key);
                        setValue('systemImageId', systemImage[key].images[0].id);
                      }}
                    >
                      <Image
                        width={'32px'}
                        height={'32px'}
                        alt={key}
                        src={systemImage[key].url || ''}
                      />
                      <Text mt={'4px'} textAlign={'center'}>
                        {key}
                      </Text>
                    </Center>
                  );
                })}
            </Flex>
            <Divider my={'24px'} />
            <MySelect
              isInvalid={!!errors.systemImageId}
              placeholder={t('Please select a mirror') || 'Please select a mirror'}
              width={'400px'}
              value={getValues('systemImageId')}
              list={
                systemImage && getValues('system')
                  ? systemImage[getValues('system')].images.map((item) => {
                      return {
                        value: item.id,
                        label: `${item.os} | ${item.version} | ${item.architect}`
                      };
                    })
                  : []
              }
              onchange={(id: string) => {
                setValue('systemImageId', id);
                formHook.clearErrors();
              }}
              {...formHook.register('systemImageId', {
                required: { value: true, message: '必须选择系统镜像' }
              })}
            />
            <Text fontSize={'base'} color={'grayModern.500'} mt={'10px'}>
              {t('Supports changing the operating system')}
            </Text>
          </Box>
        </Flex>

        {/* systemStorage */}
        <Flex alignItems={'center'} mb={'24px'} position={'relative'}>
          <Label alignSelf={'self-start'}>
            <Text>{t('Storage')}</Text>
          </Label>
          {clientRender && (
            <Box width={'100%'}>
              <MyTable
                columns={storageColumns}
                data={storages}
                borderBottomRadius={'0px'}
                borderBottom={'none'}
              />
              <Button
                variant={'outline'}
                w={'100%'}
                borderRadius={'md'}
                borderTopRadius={'0px'}
                onClick={() => {
                  appendStorages({
                    use: 'DataDisk',
                    size: 20,
                    amount: 1
                  });
                }}
              >
                {t('Add Data Disk')}
              </Button>
            </Box>
          )}
        </Flex>

        <Flex alignItems={'center'} mb={'24px'}>
          <Label alignSelf={'self-start'}>
            <Text>{t('Public IP')}</Text>
          </Label>
          <Flex flexDirection={'column'}>
            <Flex alignItems={'center'}>
              <Text mr={'12px'}>{t('Assign Public IP')}</Text>
              <Switch
                colorScheme={'blackAlpha'}
                isChecked={!!getValues('publicIpAssigned')}
                onChange={(e) => {
                  setValue('publicIpAssigned', e.target.checked);
                }}
              />
            </Flex>
            <Box fontSize={'base'} color={'grayModern.500'}>
              {t('publicIpAssigned tips')}
            </Box>
          </Flex>
        </Flex>
        {getValues('publicIpAssigned') && (
          <Flex alignItems={'center'} mb={'24px'}>
            <Flex fontSize={'md'} width={'120px'} alignItems={'center'} fontWeight={'bold'}>
              <Text>{t('BandWidth')}</Text>
              <Text fontSize={'base'} color={'grayModern.600'}>
                {t('Bandwidth by hour')}
              </Text>
            </Flex>
            <RangeInput
              value={getValues('internetMaxBandWidthOut')}
              min={1}
              max={100}
              // hoverText={t('Quantity tips', { amount1: 1, amount2: 100 }) || ''}
              setVal={(val) => {
                register('internetMaxBandWidthOut', {
                  required:
                    t('The number of instances cannot be empty') ||
                    'The number of instances cannot be empty',
                  min: {
                    value: 1,
                    message: t('The minimum number of instances is 1')
                  },
                  max: {
                    value: 100,
                    message: t('The maximum number of instances is 100')
                  }
                });
                setValue('internetMaxBandWidthOut', isNaN(val) ? 1 : val);
              }}
            />
            <Text>Mbps</Text>
          </Flex>
        )}
        <Box mb={'24px'}>
          <Flex alignItems={'center'}>
            <Label>
              <Text>{t('Login Method')}</Text>
            </Label>
            <SealosTabs
              size={'sm'}
              list={[
                {
                  label: t('Set Password'),
                  id: `self`
                },
                {
                  label: t('Auto Generate Password'),
                  id: `auto`
                }
              ]}
              activeId={getValues('autoPassword') ? 'auto' : 'self'}
              onChange={(val) => {
                if (val === 'self') {
                  setValue('autoPassword', false);
                  setValue('password', '');
                } else {
                  setValue('autoPassword', true);
                  setValue('password', generateRandomPassword());
                }
              }}
            />
          </Flex>
          {getValues('autoPassword') ? (
            <></>
          ) : (
            <Box mt={'12px'} pl={'120px'}>
              <MyTooltip
                placement="right"
                offset={[0, 15]}
                isOpen={isOpen}
                label={
                  <Flex>
                    <UnorderedList>
                      <ListItem>{t('Within 8 to 30 characters')}</ListItem>
                      <ListItem>{t('cannot contain spaces')}</ListItem>
                      <ListItem>{t('Cannot start with')}</ListItem>
                      <ListItem>{t('Contains at least three of these')}</ListItem>
                      <UnorderedList>
                        <ListItem>{t('Lowercase letters az')}</ListItem>
                        <ListItem>{t('Capital letters az')}</ListItem>
                        <ListItem>{t('Numbers 09')}</ListItem>
                        <ListItem>{specialTips.specialChars}</ListItem>
                      </UnorderedList>
                    </UnorderedList>
                  </Flex>
                }
              >
                <FormControl width={'300px'} isInvalid={!!errors.password}>
                  <Input
                    onFocus={onOpen}
                    maxLength={60}
                    placeholder={t('Please enter your password') || 'Please enter your password'}
                    {...register('password', {
                      required: {
                        value: true,
                        message: '不能为空'
                      },
                      pattern: {
                        value: specialTips.regex,
                        message: t('Password does not meet requirements')
                      },
                      onBlur(event) {
                        onClose();
                      }
                    })}
                  />
                </FormControl>
              </MyTooltip>
            </Box>
          )}
        </Box>

        {formHook.getValues('chargeType') === CVMChargeType.prePaid && (
          <Flex alignItems={'center'} mb={'24px'} flex={1}>
            <Label>
              <Text>{t('duration')}</Text>
            </Label>
            <Box>
              <MySelect
                isInvalid={!!errors.period}
                width={'200px'}
                value={getValues('period')}
                list={monthsArray}
                onchange={(id: string) => {
                  setValue('period', id);
                  formHook.clearErrors();
                }}
              />
            </Box>
          </Flex>
        )}

        <Flex alignItems={'center'} mb={'24px'} flex={1}>
          <Label>
            <Text>{t('Counts')}</Text>
          </Label>
          <Box>
            <RangeInput
              inputStyle={{ fontSize: 'base' }}
              w={142}
              value={getValues('counts')}
              min={1}
              max={12}
              hoverText={t('Quantity tips', { amount1: 1, amount2: 12 }) || ''}
              setVal={(val) => {
                register('counts', {
                  required:
                    t('The number of instances cannot be empty') ||
                    'The number of instances cannot be empty',
                  min: {
                    value: 1,
                    message: t('The minimum number of instances is 1')
                  },
                  max: {
                    value: 12,
                    message: t('The maximum number of instances is 12')
                  }
                });
                setValue('counts', isNaN(val) ? 1 : val);
              }}
            />
          </Box>
        </Flex>
      </Box>
    </Flex>
  );
}

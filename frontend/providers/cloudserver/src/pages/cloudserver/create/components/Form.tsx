import { getCloudServerImage, getCloudServerRegion, getCloudServerType } from '@/api/cloudserver';
import MyIcon from '@/components/Icon';
import { MyTable, TableColumnsType } from '@/components/MyTable';
import { CloudServerType, EditForm, StorageType } from '@/types/cloudserver';
import {
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  IconButton,
  Image,
  Input,
  Radio,
  Skeleton,
  Stack,
  Switch,
  Text,
  useTheme
} from '@chakra-ui/react';
import { MySelect, RangeInput, Tabs } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import { customAlphabet } from 'nanoid';
import { useTranslation } from 'next-i18next';
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { UseFormReturn, useFieldArray } from 'react-hook-form';
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz', 4);
const nanoidUpper = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 4);
const nanoidNumber = customAlphabet('0123456789', 4);

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

export default function Form({
  formHook,
  refresh,

  setInstanceType
}: {
  formHook: UseFormReturn<EditForm, any>;
  refresh: boolean;

  setInstanceType: Dispatch<SetStateAction<CloudServerType | undefined>>;
}) {
  if (!formHook) return <></>;
  const [clientRender, setClientRender] = useState(false);

  useEffect(() => {
    setClientRender(true);
  }, []);

  const { data: SystemRegion } = useQuery(['getCloudServerRegion'], getCloudServerRegion, {
    staleTime: 5 * 60 * 1000
  });

  console.log(SystemRegion);

  const { data: SystemImage } = useQuery(['getCloudServerImage'], getCloudServerImage, {
    staleTime: 5 * 60 * 1000
  });

  const { data: ServersData } = useQuery(['getCloudServerType'], getCloudServerType, {
    staleTime: 5 * 60 * 1000,
    onSuccess(data) {
      if (data?.[0]) {
        formHook.setValue('virtualMachinePackageName', data[0].virtualMachinePackageName);
        setInstanceType(data?.[0]);
      }
    }
  });

  const theme = useTheme();
  const { t } = useTranslation();

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
              <Text>{item.virtualMachinePackageName}</Text>
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
            <Text color={'brightBlue.700'}>
              {t('Reference fee tip', { price: item.instancePrice })}{' '}
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
                // hoverText={t('Number of instances: 1 to 20') || 'Number of instances: 1 to 20'}
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
                  // hoverText={t('Number of instances: 1 to 20') || 'Number of instances: 1 to 20'}
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
        <Flex alignItems={'center'} mb={'24px'}>
          <Label alignSelf={'self-start'}>
            <Text>{t('Type')}</Text>
          </Label>
          <Box flex={1}>
            {ServersData ? (
              <MyTable
                itemClass="appItem"
                columns={columns}
                data={ServersData}
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
        <Flex alignItems={'center'} mb={'24px'} flex={1}>
          <Label alignSelf={'self-start'}>
            <Text>{t('Image')}</Text>
          </Label>
          <Box>
            <Flex flexWrap={'wrap'} gap={'12px'}>
              {SystemImage &&
                Object.keys(SystemImage)?.map((key) => {
                  return (
                    <Button
                      variant={'outline'}
                      flexDirection={'column'}
                      key={key}
                      w={'140px'}
                      height={'88px'}
                      _hover={{
                        filter: 'grayscale(0%)',
                        background: 'rgba(33, 155, 244, 0.05)',
                        opacity: 0.9,
                        color: 'brightBlue.700',
                        borderColor: 'brightBlue.300'
                      }}
                      {...(getValues('system') === key
                        ? {
                            filter: 'grayscale(0%)',
                            background: 'rgba(33, 155, 244, 0.05)',
                            opacity: 0.9,
                            color: 'brightBlue.700',
                            borderColor: 'brightBlue.300'
                          }
                        : {
                            filter: 'grayscale(100%)'
                          })}
                      onClick={() => {
                        setValue('system', key);
                      }}
                    >
                      <Image
                        width={'32px'}
                        height={'32px'}
                        alt={key}
                        src={SystemImage[key].url || ''}
                      />
                      <Text mt={'4px'} textAlign={'center'}>
                        {key}
                      </Text>
                    </Button>
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
                SystemImage && getValues('system')
                  ? SystemImage[getValues('system')].images.map((item) => {
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
              ></MyTable>
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
              hoverText={t('Quantity is 1 to 100') || 'Quantity is 1 to 100'}
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
            <Tabs
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
                } else {
                  const randomStr = nanoid() + nanoidUpper() + nanoidNumber();
                  setValue('autoPassword', true);
                  setValue('password', randomStr);
                }
              }}
            />
          </Flex>
          {getValues('autoPassword') ? (
            <></>
          ) : (
            <Box mt={'12px'} pl={'120px'}>
              <FormControl isInvalid={!!errors.password}>
                <Input
                  autoFocus={true}
                  maxLength={60}
                  placeholder={t('Please enter your password') || 'Please enter your password'}
                  {...register('password', {
                    required: {
                      value: true,
                      message: '不能为空'
                    },
                    maxLength: 60,
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,30}$/,
                      message: `在 8 ～ 30 位字符数以内（推荐12位以上）
                    不能包含空格
                    不能以" / "开头\n
                    至少包含
                    小写字母 a ~ z;
                    大写字母 A ～ Z;
                    数字 0 ～ 9`
                    }
                  })}
                />
              </FormControl>
            </Box>
          )}
        </Box>
      </Box>
    </Flex>
  );
}

import { ChevronDownIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  MenuOptionGroup,
  MenuItemOption,
  Text,
  useMediaQuery,
  Checkbox
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { SealosMenu } from '@sealos/ui';
import MyIcon from '@/components/Icon';
import { DBDetailType, SupportReconfigureDBType } from '@/types/db';
import { LogTypeEnum } from '@/constants/log';
import { TFile } from '@/utils/kubeFileSystem';
import { I18nCommonKey } from '@/types/i18next';
import dynamic from 'next/dynamic';
import React, { useEffect, useState, useMemo } from 'react';
import { Search, ChevronDown } from 'lucide-react';

const DatePicker = dynamic(() => import('@/components/DataPicker'), { ssr: false });

interface LogFilterProps {
  db: DBDetailType;
  logType: LogTypeEnum;
  podName: string[] | '' | null;
  logFile?: TFile | null;
  logFiles: TFile[];
  dbPods: { podName: string; alias: string }[];
  filteredSubNavList: {
    label: string;
    value: LogTypeEnum;
  }[];
  globalFilter: string;
  refreshInterval: number;
  logCount: number;
  onPodChange: (podNames: string[] | '' | null) => void;
  onLogFileChange: (logFile: TFile | null) => void;
  onLogTypeChange: (logType: LogTypeEnum) => void;
  onFilterChange: (filter: string) => void;
  onRefresh: () => void;
  onRefreshIntervalChange: (interval: number) => void;
  onLogCountChange: (count: number) => void;
}

export const LogFilter = ({
  db,
  logType,
  podName,
  logFile,
  logFiles,
  dbPods,
  filteredSubNavList,
  globalFilter,
  refreshInterval,
  logCount,
  onPodChange,
  onLogFileChange,
  onLogTypeChange,
  onFilterChange,
  onRefresh,
  onRefreshIntervalChange,
  onLogCountChange
}: LogFilterProps) => {
  const { t } = useTranslation('common');
  const [isLargerThan1440] = useMediaQuery('(min-width: 1440px)');

  // Local multi-select states (UI only for now)
  const [podList, setPodList] = useState<Array<{ value: string; label: string; checked: boolean }>>(
    []
  );
  const [containerList, setContainerList] = useState<
    Array<{ value: string; label: string; checked: boolean }>
  >([]);
  const [logCountInput, setLogCountInput] = useState<string>('');

  // initialize from single-select props
  useEffect(() => {
    const filteredDbPods = dbPods.filter((p) => !/sentinel/i.test(p.podName));
    setPodList((prev) => {
      const prevChecked = new Map(prev.map((i) => [i.value, i.checked]));
      return filteredDbPods.map((p) => {
        const fallback =
          podName === null
            ? false
            : podName === ''
              ? true
              : (podName as string[]).includes(p.podName);
        return {
          value: p.podName,
          label: p.podName,
          checked: prevChecked.has(p.podName) ? !!prevChecked.get(p.podName) : fallback
        };
      });
    });
  }, [podName, dbPods]);

  useEffect(() => {
    const containerOptions = (() => {
      if (!db?.dbType) return [];
      const typeMap: Record<string, string> = {
        mongodb: 'mongodb',
        postgresql: 'postgresql',
        'apecloud-mysql': 'mysql',
        mysql: 'mysql',
        redis: 'redis',
        kafka: 'kafka',
        qdrant: 'qdrant',
        nebula: 'nebula',
        weaviate: 'weaviate',
        milvus: 'milvus',
        pulsar: 'pulsar',
        clickhouse: 'clickhouse'
      };
      return [typeMap[db.dbType] || db.dbType];
    })();

    const initialContainers = containerOptions.map((container) => ({
      value: container,
      label: container,
      checked: logFile !== null
    }));
    setContainerList(initialContainers);
  }, [logFile === null, db?.dbType]);

  useEffect(() => {
    setLogCountInput(typeof logCount === 'number' ? String(logCount) : '');
  }, [logCount]);

  const refreshIntervalOptions = [
    { value: 0, label: t('close') },
    { value: 5, label: '5s' },
    { value: 10, label: '10s' },
    { value: 30, label: '30s' },
    { value: 60, label: '1m' },
    { value: 300, label: '5m' },
    { value: 600, label: '10m' }
  ];

  const logCountOptions = [
    { value: 50, label: '50' },
    { value: 100, label: '100' },
    { value: 200, label: '200' },
    { value: 500, label: '500' },
    { value: 1000, label: '1000' }
  ];

  const containerOptions = useMemo(() => {
    if (!db?.dbType) return [];

    const typeMap: Record<string, string> = {
      mongodb: 'mongodb',
      postgresql: 'postgresql',
      'apecloud-mysql': 'mysql',
      mysql: 'mysql',
      redis: 'redis',
      kafka: 'kafka',
      qdrant: 'qdrant',
      nebula: 'nebula',
      weaviate: 'weaviate',
      milvus: 'milvus',
      pulsar: 'pulsar',
      clickhouse: 'clickhouse'
    };

    return [typeMap[db.dbType] || db.dbType];
  }, [db?.dbType]);

  return (
    <Flex flexDirection={'column'} gap={'12px'} py={'12px'} px={'20px'} w={'100%'}>
      {/* First Row: Log Type Tabs and Search */}
      <Flex justifyContent={'space-between'} alignItems={'center'}>
        {/* Log Type Tabs */}
        <Flex gap={'32px'}>
          {filteredSubNavList?.map((item) => {
            const getLabel = (logType: LogTypeEnum) => {
              switch (logType) {
                case LogTypeEnum.ErrorLog:
                  return t('error_log.error_log');
                case LogTypeEnum.RuntimeLog:
                  return t('error_log.runtime_log');
                case LogTypeEnum.SlowQuery:
                  return t('error_log.slow_query');
                default:
                  return t('Logs');
              }
            };

            return (
              <Box
                h={'36px'}
                key={item.value}
                pb={'6px'}
                pt={'4px'}
                borderBottom={'2px solid'}
                cursor={'pointer'}
                fontSize={'16px'}
                color={item.value === logType ? 'grayModern.900' : 'grayModern.600'}
                borderBottomColor={item.value === logType ? 'grayModern.900' : 'transparent'}
                onClick={() => item.value !== logType && onLogTypeChange(item.value)}
                fontWeight={'500'}
              >
                {getLabel(item.value)}
              </Box>
            );
          })}
        </Flex>

        {/* Search Input */}
        <Flex alignItems={'center'} gap={'12px'}>
          <InputGroup
            display={'flex'}
            width={'500px'}
            height={'40px'}
            padding={'10px 0 10px 12px'}
            alignItems={'center'}
            gap={'8px'}
            flexShrink={0}
            borderRadius={'8px'}
            background={'#F5F5F5'}
          >
            <Input
              placeholder={t('Keywords')}
              value={globalFilter}
              onChange={(e) => onFilterChange(e.target.value)}
              h={'100%'}
              w={'100%'}
              border={'none'}
              background={'transparent'}
              color={'#4D4D4D'}
              fontFamily={'Geist'}
              fontSize={'14px'}
              fontWeight={'400'}
              lineHeight={'normal'}
              fontStyle={'normal'}
              overflow={'hidden'}
              textOverflow={'ellipsis'}
              whiteSpace={'nowrap'}
              _placeholder={{
                color: '#4D4D4D',
                fontFamily: 'Geist',
                fontSize: '14px',
                fontWeight: '400',
                lineHeight: 'normal',
                fontStyle: 'normal'
              }}
              _focus={{
                boxShadow: 'none',
                border: 'none'
              }}
              _selection={{
                backgroundColor: '#4D4D4D'
              }}
              sx={{
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            />
          </InputGroup>
          <Button
            display={'inline-flex'}
            height={'40px'}
            padding={'8px 16px'}
            justifyContent={'center'}
            alignItems={'center'}
            gap={'8px'}
            flexShrink={0}
            borderRadius={'8px'}
            background={'#18181B'}
            color={'#FFF'}
            fontFamily={'"PingFang SC"'}
            fontSize={'14px'}
            fontWeight={'500'}
            lineHeight={'20px'}
            letterSpacing={'0.1px'}
            leftIcon={<Search size={16} color="#FFF" />}
            _hover={{
              background: '#18181B',
              opacity: 0.9
            }}
            onClick={() => onFilterChange(globalFilter)}
          >
            {t('search')}
          </Button>
        </Flex>
      </Flex>

      {/* Second Row: Date Picker, Pod/Container Selectors, and Refresh Controls */}
      <Flex justifyContent={'flex-start'} alignItems={'center'} flexWrap={'wrap'}>
        <Flex
          alignItems={'center'}
          flex={'1 1 auto'}
          minW={'0'}
          columnGap={{ base: '8px', md: '12px', lg: '16px' }}
          rowGap={{ base: '8px', md: '8px' }}
        >
          {/* Date Picker */}
          <DatePicker />

          {/* Pod Selector - multi select */}
          <Menu closeOnSelect={false}>
            <MenuButton
              as={Button}
              variant={'unstyled'}
              display={'flex'}
              width={'222px'}
              height={'42px'}
              padding={'8px 16px'}
              justifyContent={'space-between'}
              alignItems={'center'}
              alignSelf={'stretch'}
              borderRadius={'8px'}
              border={'1px solid #E4E4E7'}
              background={'#FFF'}
              color={'#18181B'}
              fontFamily={'Geist'}
              fontSize={'14px'}
              fontWeight={'400'}
              lineHeight={'20px'}
              fontStyle={'normal'}
              cursor={'pointer'}
              _hover={{}}
              _active={{}}
              _focus={{}}
            >
              <Flex alignItems={'center'} width={'100%'}>
                <Text
                  color={'#71717A'}
                  fontFamily={'Geist'}
                  fontSize={'14px'}
                  fontStyle={'normal'}
                  fontWeight={'400'}
                  lineHeight={'20px'}
                  flexShrink={'0'}
                >
                  Pod
                </Text>
                <Box
                  width={'1px'}
                  height={'12px'}
                  background={'#D4D4D8'}
                  margin={'0 8px'}
                  flexShrink={'0'}
                />
                {(() => {
                  const selectedCount = podList.filter((p) => p.checked).length;
                  const isPlaceholder = selectedCount === 0;
                  const displayText = isPlaceholder
                    ? t('Please select')
                    : selectedCount === podList.length
                      ? t('All')
                      : (() => {
                          const firstSelected = podList.find((p) => p.checked);
                          return `${firstSelected?.label}${
                            selectedCount > 1 ? ` (+${selectedCount - 1})` : ''
                          }`;
                        })();

                  return (
                    <Text
                      color={isPlaceholder ? '#A3A3A3' : '#18181B'}
                      fontFamily={'Geist'}
                      fontSize={isPlaceholder ? '12px' : '14px'}
                      fontStyle={'normal'}
                      fontWeight={'400'}
                      lineHeight={'20px'}
                      sx={{
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      flexShrink={'1'}
                      minWidth={'0'}
                    >
                      {displayText}
                    </Text>
                  );
                })()}
                <Box flex={'1'} />
                <ChevronDown
                  size={16}
                  color="#A3A3A3"
                  style={{ strokeWidth: '2', flexShrink: '0', marginLeft: '4px' }}
                />
              </Flex>
            </MenuButton>
            <MenuList p={'6px'}>
              {/* All Checkbox - 独立于其他选项 */}
              <MenuItem
                borderRadius={'4px'}
                _hover={{
                  bg: 'rgba(17, 24, 36, 0.05)',
                  color: 'brightBlue.600'
                }}
                p={'6px'}
                w={'100%'}
              >
                <Checkbox
                  w={'100%'}
                  isChecked={podList.every((item) => item.checked)}
                  onChange={() => {
                    const allChecked = podList.every((item) => item.checked);
                    const newList = podList.map((item) => ({
                      ...item,
                      checked: !allChecked
                    }));
                    setPodList(newList);
                    const selectedPods = newList.filter((p) => p.checked);
                    if (selectedPods.length === newList.length) {
                      onPodChange('');
                    } else if (selectedPods.length === 0) {
                      onPodChange(null);
                    } else {
                      onPodChange(selectedPods.map((p) => p.value));
                    }
                  }}
                  sx={{
                    'span.chakra-checkbox__control[data-checked]': {
                      background: '#f0f4ff',
                      border: '1px solid #219bf4',
                      boxShadow: '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)',
                      color: '#219bf4',
                      borderRadius: '4px'
                    },
                    'span.chakra-checkbox__control': {
                      background: 'white',
                      border: '1px solid #E8EBF0',
                      borderRadius: '4px'
                    }
                  }}
                >
                  {t('All')}
                </Checkbox>
              </MenuItem>

              {/* Individual Pod Options */}
              {podList.map((pod) => (
                <MenuItem
                  key={pod.value}
                  borderRadius={'4px'}
                  _hover={{
                    bg: 'rgba(17, 24, 36, 0.05)',
                    color: 'brightBlue.600'
                  }}
                  p={'6px'}
                >
                  <Checkbox
                    isChecked={pod.checked}
                    onChange={() => {
                      const newList = podList.map((item) =>
                        item.value === pod.value ? { ...item, checked: !item.checked } : item
                      );
                      setPodList(newList);
                      const selectedPods = newList.filter((p) => p.checked);
                      if (selectedPods.length === newList.length) {
                        onPodChange('');
                      } else if (selectedPods.length === 0) {
                        onPodChange(null);
                      } else {
                        onPodChange(selectedPods.map((p) => p.value));
                      }
                    }}
                    sx={{
                      'span.chakra-checkbox__control[data-checked]': {
                        background: '#f0f4ff',
                        border: '1px solid #219bf4',
                        boxShadow: '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)',
                        color: '#219bf4',
                        borderRadius: '4px'
                      },
                      'span.chakra-checkbox__control': {
                        background: 'white',
                        border: '1px solid #E8EBF0',
                        borderRadius: '4px'
                      }
                    }}
                  >
                    {pod.label}
                  </Checkbox>
                </MenuItem>
              ))}
            </MenuList>
          </Menu>

          {/* Container Selector */}
          <Menu closeOnSelect={false}>
            <MenuButton
              as={Button}
              variant={'unstyled'}
              display={'flex'}
              width={'222px'}
              height={'42px'}
              padding={'8px 16px'}
              justifyContent={'space-between'}
              alignItems={'center'}
              alignSelf={'stretch'}
              borderRadius={'8px'}
              border={'1px solid #E4E4E7'}
              background={'#FFF'}
              color={'#18181B'}
              fontFamily={'Geist'}
              fontSize={'14px'}
              fontWeight={'400'}
              lineHeight={'20px'}
              fontStyle={'normal'}
              cursor={'pointer'}
              _hover={{}}
              _active={{}}
              _focus={{}}
            >
              <Flex alignItems={'center'} width={'100%'}>
                <Text
                  color={'#71717A'}
                  fontFamily={'Geist'}
                  fontSize={'14px'}
                  fontStyle={'normal'}
                  fontWeight={'400'}
                  lineHeight={'20px'}
                  flexShrink={'0'}
                >
                  Container
                </Text>
                <Box
                  width={'1px'}
                  height={'12px'}
                  background={'#D4D4D8'}
                  margin={'0 8px'}
                  flexShrink={'0'}
                />
                {(() => {
                  const selectedCount = containerList.filter((c) => c.checked).length;
                  const isPlaceholder = selectedCount === 0;
                  const displayText = isPlaceholder
                    ? t('Please select')
                    : selectedCount === containerList.length
                      ? t('All')
                      : (() => {
                          const firstSelected = containerList.find((c) => c.checked);
                          return `${firstSelected?.label}${
                            selectedCount > 1 ? ` (+${selectedCount - 1})` : ''
                          }`;
                        })();

                  return (
                    <Text
                      color={isPlaceholder ? '#A3A3A3' : '#18181B'}
                      fontFamily={'Geist'}
                      fontSize={isPlaceholder ? '12px' : '14px'}
                      fontStyle={'normal'}
                      fontWeight={'400'}
                      lineHeight={'20px'}
                      sx={{
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      flexShrink={'1'}
                      minWidth={'0'}
                    >
                      {displayText}
                    </Text>
                  );
                })()}
                <Box flex={'1'} />
                <ChevronDown
                  size={16}
                  color="#A3A3A3"
                  style={{ strokeWidth: '2', flexShrink: '0', marginLeft: '4px' }}
                />
              </Flex>
            </MenuButton>
            <MenuList p={'6px'}>
              {/* All Checkbox - 独立于其他选项 */}
              <MenuItem
                borderRadius={'4px'}
                _hover={{
                  bg: 'rgba(17, 24, 36, 0.05)',
                  color: 'brightBlue.600'
                }}
                p={'6px'}
                w={'100%'}
              >
                <Checkbox
                  w={'100%'}
                  isChecked={containerList.every((item) => item.checked)}
                  onChange={() => {
                    const allChecked = containerList.every((item) => item.checked);
                    const newList = containerList.map((item) => ({
                      ...item,
                      checked: !allChecked
                    }));
                    setContainerList(newList);
                    const selectedContainers = newList.filter((c) => c.checked);
                    onLogFileChange(
                      selectedContainers.length === 0
                        ? (null as any)
                        : selectedContainers.length === newList.length
                          ? (undefined as any)
                          : ({ name: selectedContainers[0]?.value } as TFile)
                    );
                    setTimeout(() => onRefresh(), 0);
                  }}
                  sx={{
                    'span.chakra-checkbox__control[data-checked]': {
                      background: '#f0f4ff',
                      border: '1px solid #219bf4',
                      boxShadow: '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)',
                      color: '#219bf4',
                      borderRadius: '4px'
                    },
                    'span.chakra-checkbox__control': {
                      background: 'white',
                      border: '1px solid #E8EBF0',
                      borderRadius: '4px'
                    }
                  }}
                >
                  {t('All')}
                </Checkbox>
              </MenuItem>

              {/* Individual Container Options */}
              {containerList.map((container) => (
                <MenuItem
                  key={container.value}
                  borderRadius={'4px'}
                  _hover={{
                    bg: 'rgba(17, 24, 36, 0.05)',
                    color: 'brightBlue.600'
                  }}
                  p={'6px'}
                >
                  <Checkbox
                    isChecked={container.checked}
                    onChange={() => {
                      const newList = containerList.map((item) =>
                        item.value === container.value ? { ...item, checked: !item.checked } : item
                      );
                      setContainerList(newList);
                      const selectedContainers = newList.filter((c) => c.checked);
                      onLogFileChange(
                        selectedContainers.length === 0
                          ? (null as any)
                          : selectedContainers.length === newList.length
                            ? (undefined as any)
                            : ({ name: selectedContainers[0]?.value } as TFile)
                      );
                      setTimeout(() => onRefresh(), 0);
                    }}
                    sx={{
                      'span.chakra-checkbox__control[data-checked]': {
                        background: '#f0f4ff',
                        border: '1px solid #219bf4',
                        boxShadow: '0px 0px 0px 2.4px rgba(33, 155, 244, 0.15)',
                        color: '#219bf4',
                        borderRadius: '4px'
                      },
                      'span.chakra-checkbox__control': {
                        background: 'white',
                        border: '1px solid #E8EBF0',
                        borderRadius: '4px'
                      }
                    }}
                  >
                    {container.label}
                  </Checkbox>
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        </Flex>

        {/* Log Count and Refresh Controls */}
        <Flex alignItems={'center'} gap={'12px'} ml={'auto'} flexShrink={0}>
          {/* Refresh Input - styled like Pod selector */}
          <Flex
            alignItems={'center'}
            minW={'130px'}
            width={'fit-content'}
            height={'42px'}
            padding={'8px 16px'}
            borderRadius={'8px'}
            border={'1px solid #E4E4E7'}
            background={'#FFF'}
            gap={'8px'}
            whiteSpace={'nowrap'}
          >
            <Text
              color={'#71717A'}
              fontFamily={'Geist'}
              fontSize={'14px'}
              fontWeight={'400'}
              lineHeight={'20px'}
              flexShrink={'0'}
            >
              {t('log_number')}
            </Text>
            <Box width={'1px'} height={'12px'} background={'#D4D4D8'} flexShrink={'0'} />
            <Input
              flex={'0 0 auto'}
              w={`${Math.max(1, (logCountInput || '').length || 3)}ch`}
              border={'none'}
              background={'transparent'}
              px={'0'}
              fontSize={'14px'}
              fontWeight={'400'}
              lineHeight={'20px'}
              color={'#18181B'}
              fontFamily={'Geist'}
              value={logCountInput}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                if (raw === '') {
                  setLogCountInput('');
                  return;
                }
                const clamped = Math.max(0, Math.min(1000, parseInt(raw, 10)));
                setLogCountInput(String(clamped));
                onLogCountChange(clamped);
              }}
              placeholder={'100'}
              _placeholder={{ color: '#71717A' }}
              _focus={{ boxShadow: 'none' }}
              sx={{
                '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                  '-webkit-appearance': 'none',
                  margin: 0
                },
                '&[type=number]': {
                  '-moz-appearance': 'textfield'
                }
              }}
            />
          </Flex>

          <Flex
            alignItems={'center'}
            height={'42px'}
            bg={'#FFF'}
            border={'1px solid #E4E4E7'}
            borderRadius={'8px'}
            padding={'8px 16px'}
            width={'fit-content'}
            flexShrink={0}
          >
            <Box
              as="button"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                e.preventDefault();
                onRefresh();
              }}
              display={'flex'}
              alignItems={'center'}
              justifyContent={'center'}
              cursor={'pointer'}
            >
              <MyIcon name="restart" w={'16px'} h={'16px'} color={'#A3A3A3'} />
            </Box>

            <Box width={'1px'} height={'12px'} background={'#D4D4D8'} mx={'8px'} flexShrink={'0'} />

            <Menu autoSelect={false} isLazy>
              <MenuButton
                as={Button}
                variant={'unstyled'}
                _hover={{}}
                _active={{}}
                _focus={{}}
                cursor={'pointer'}
                flex={'0 0 auto'}
                width={'auto'}
                minW={'unset'}
              >
                <Flex alignItems={'center'} gap={'4px'}>
                  {refreshInterval === 0 ? null : (
                    <Text
                      color={'#18181B'}
                      fontFamily={'Geist'}
                      fontSize={'14px'}
                      fontWeight={'400'}
                      lineHeight={'20px'}
                    >
                      {refreshIntervalOptions.find((opt) => opt.value === refreshInterval)?.label}
                    </Text>
                  )}
                  <ChevronDownIcon w={'16px'} h={'16px'} color={'#A3A3A3'} />
                </Flex>
              </MenuButton>
              <MenuList
                p={'6px'}
                borderRadius={'base'}
                border={'1px solid #E8EBF0'}
                boxShadow={
                  '0px 4px 10px 0px rgba(19, 51, 107, 0.10), 0px 0px 1px 0px rgba(19, 51, 107, 0.10)'
                }
                zIndex={99}
                overflow={'overlay'}
                maxH={'300px'}
              >
                {refreshIntervalOptions.map((option) => (
                  <MenuItem
                    key={option.value}
                    value={option.value}
                    onClick={() => onRefreshIntervalChange(option.value)}
                    {...(refreshInterval === option.value
                      ? {
                          color: 'brightBlue.600'
                        }
                      : {})}
                    borderRadius={'4px'}
                    _hover={{
                      bg: 'rgba(17, 24, 36, 0.05)',
                      color: 'brightBlue.600'
                    }}
                    p={'6px'}
                  >
                    {option.label}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};

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
  Text,
  useMediaQuery
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { SealosMenu } from '@sealos/ui';
import MyIcon from '@/components/Icon';
import { DBDetailType, SupportReconfigureDBType } from '@/types/db';
import { LogTypeEnum } from '@/constants/log';
import { TFile } from '@/utils/kubeFileSystem';
import { I18nCommonKey } from '@/types/i18next';
import dynamic from 'next/dynamic';

const DatePicker = dynamic(() => import('@/components/DataPicker'), { ssr: false });

interface LogFilterProps {
  db: DBDetailType;
  logType: LogTypeEnum;
  podName: string;
  logFile?: TFile;
  logFiles: TFile[];
  dbPods: { podName: string; alias: string }[];
  filteredSubNavList: {
    label: string;
    value: LogTypeEnum;
  }[];
  globalFilter: string;
  refreshInterval: number;
  logCount: number;
  onPodChange: (podName: string) => void;
  onLogFileChange: (logFile: TFile) => void;
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
  const { t } = useTranslation();
  const [isLargerThan1440] = useMediaQuery('(min-width: 1440px)');

  const refreshIntervalOptions = [
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

  return (
    <Flex flexDirection={'column'} gap={'12px'} py={'12px'} px={'20px'} w={'100%'}>
      {/* First Row: Log Type Tabs and Search */}
      <Flex justifyContent={'space-between'} alignItems={'center'}>
        {/* Log Type Tabs */}
        <Flex gap={'32px'}>
          {filteredSubNavList?.map((item) => (
            <Box
              h={'36px'}
              key={item.label}
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
              {t(item.label as I18nCommonKey)}
            </Box>
          ))}
        </Flex>

        {/* Search Input */}
        <Flex alignItems={'center'} gap={'12px'}>
          <InputGroup w={'500px'} h={'32px'}>
            <Input
              placeholder="Keywords"
              value={globalFilter}
              onChange={(e) => onFilterChange(e.target.value)}
              h={'32px'}
              w={'100%'}
            />
          </InputGroup>
          <Button
            h={'32px'}
            px={'16px'}
            bg={'grayModern.900'}
            color={'white'}
            leftIcon={<MyIcon name="search" color={'white'} />}
            _hover={{ bg: 'grayModern.800' }}
            onClick={() => onFilterChange(globalFilter)}
          >
            {t('search')}
          </Button>
        </Flex>
      </Flex>

      {/* Second Row: Date Picker, Pod/Container Selectors, and Refresh Controls */}
      <Flex justifyContent={'space-between'} alignItems={'center'}>
        <Flex gap={'16px'} alignItems={'center'}>
          {/* Date Picker */}
          <DatePicker />

          {/* Pod Selector */}
          <Flex alignItems={'center'} gap={'8px'}>
            <Text fontSize={'12px'} fontWeight={'400'} color={'grayModern.900'}>
              Pod:
            </Text>
            <SealosMenu
              width={120}
              Button={
                <MenuButton
                  as={Button}
                  variant={'outline'}
                  w={'120px'}
                  h={'32px'}
                  textAlign={'start'}
                  bg={'white'}
                  borderRadius={'md'}
                  border={'1px solid #E8EBF0'}
                  fontSize={'12px'}
                >
                  <Flex alignItems={'center'} justifyContent={'space-between'}>
                    <Text isTruncated>{podName || 'All'}</Text>
                    <ChevronDownIcon ml={2} w={'12px'} h={'12px'} />
                  </Flex>
                </MenuButton>
              }
              menuList={[
                { isActive: !podName, child: <Box>All</Box>, onClick: () => onPodChange('') },
                ...dbPods.map((item) => ({
                  isActive: item.podName === podName,
                  child: <Box>{item.podName}</Box>,
                  onClick: () => onPodChange(item.podName)
                }))
              ]}
            />
          </Flex>

          {/* Container Selector (only for non-mongodb) */}
          {db?.dbType !== 'mongodb' && (
            <Flex alignItems={'center'} gap={'8px'}>
              <Text fontSize={'12px'} fontWeight={'400'} color={'grayModern.900'}>
                Container:
              </Text>
              <SealosMenu
                width={120}
                Button={
                  <MenuButton
                    as={Button}
                    variant={'outline'}
                    w={'120px'}
                    h={'32px'}
                    textAlign={'start'}
                    bg={'white'}
                    borderRadius={'md'}
                    border={'1px solid #E8EBF0'}
                    fontSize={'12px'}
                  >
                    <Flex alignItems={'center'} justifyContent={'space-between'}>
                      <Text isTruncated>{logFile?.name || 'All'}</Text>
                      <ChevronDownIcon ml={2} w={'12px'} h={'12px'} />
                    </Flex>
                  </MenuButton>
                }
                menuList={[
                  {
                    isActive: !logFile,
                    child: <Box>All</Box>,
                    onClick: () => onLogFileChange(undefined as any)
                  },
                  ...logFiles.map((item) => ({
                    isActive: item.name === logFile?.name,
                    child: <Box>{item.name}</Box>,
                    onClick: () => onLogFileChange(item)
                  }))
                ]}
              />
            </Flex>
          )}
        </Flex>

        {/* Log Count and Refresh Controls */}
        <Flex alignItems={'center'} gap={'12px'}>
          {/* Log Count Selector */}
          <Flex alignItems={'center'} gap={'8px'}>
            <Text fontSize={'12px'} fontWeight={'400'} color={'grayModern.900'}>
              {t('log_count')}:
            </Text>
            <SealosMenu
              width={80}
              Button={
                <MenuButton
                  as={Button}
                  variant={'outline'}
                  w={'80px'}
                  h={'32px'}
                  textAlign={'start'}
                  bg={'white'}
                  borderRadius={'md'}
                  border={'1px solid #E8EBF0'}
                  fontSize={'12px'}
                >
                  <Flex alignItems={'center'} justifyContent={'space-between'}>
                    <Text isTruncated>{logCount}</Text>
                    <ChevronDownIcon ml={2} w={'12px'} h={'12px'} />
                  </Flex>
                </MenuButton>
              }
              menuList={logCountOptions.map((option) => ({
                isActive: option.value === logCount,
                child: <Box>{option.label}</Box>,
                onClick: () => onLogCountChange(option.value)
              }))}
            />
          </Flex>

          <Text fontSize={'12px'} fontWeight={'400'} color={'grayModern.900'}>
            {t('refresh')}:
          </Text>
          <SealosMenu
            width={80}
            Button={
              <MenuButton
                as={Button}
                variant={'outline'}
                w={'80px'}
                h={'32px'}
                textAlign={'start'}
                bg={'white'}
                borderRadius={'md'}
                border={'1px solid #E8EBF0'}
                fontSize={'12px'}
                rightIcon={<ChevronDownIcon w={'12px'} h={'12px'} />}
              >
                {refreshIntervalOptions.find((opt) => opt.value === refreshInterval)?.label ||
                  '300'}
              </MenuButton>
            }
            menuList={refreshIntervalOptions.map((option) => ({
              isActive: option.value === refreshInterval,
              child: <Box>{option.label}</Box>,
              onClick: () => onRefreshIntervalChange(option.value)
            }))}
          />
          <Button
            h={'32px'}
            w={'32px'}
            p={0}
            variant={'outline'}
            bg={'white'}
            borderRadius={'md'}
            border={'1px solid #E8EBF0'}
            onClick={onRefresh}
          >
            <MyIcon name="restart" w={'16px'} h={'16px'} />
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );
};

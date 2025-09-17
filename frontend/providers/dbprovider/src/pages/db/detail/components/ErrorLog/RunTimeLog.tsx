import { getLogContent, getLogFiles, getLogCounts } from '@/api/db';
import { useDBStore } from '@/store/db';
import { DBDetailType, SupportReconfigureDBType } from '@/types/db';
import { LogTypeEnum } from '@/constants/log';
import { TFile } from '@/utils/kubeFileSystem';
import { Box, Divider, Flex, useTheme } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import React, { useMemo, useState } from 'react';
import { I18nCommonKey } from '@/types/i18next';
import { LogFilter } from '@/components/ErrorLog/LogFilter';
import { LogCounts } from '@/components/ErrorLog/LogCounts';
import { LogTable } from '@/components/ErrorLog/LogTable';
import { downLoadBold } from '@/utils/tools';
import useDateTimeStore from '@/store/date';

type LogContent = {
  timestamp: string;
  content: string;
};

const getEmptyLogResult = (page = 0, pageSize = 0) => ({
  logs: [] as LogContent[],
  metadata: {
    total: 0,
    page,
    pageSize,
    processingTime: '',
    hasMore: false
  }
});

export default function RunTimeLog({
  db,
  logType,
  filteredSubNavList,
  updateSubMenu
}: {
  db: DBDetailType;
  logType: LogTypeEnum;
  updateSubMenu: (value: LogTypeEnum) => void;
  filteredSubNavList?: {
    label: string;
    value: LogTypeEnum;
  }[];
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { intervalLoadPods, dbPods } = useDBStore();
  const { startDateTime, endDateTime } = useDateTimeStore();
  const [podName, setPodName] = useState('');
  const [logFile, setLogFile] = useState<TFile>();
  const [data, setData] = useState<LogContent[]>([]);
  const [logCountsData, setLogCountsData] = useState<{ logs_total: string; _time: string }[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [refreshInterval, setRefreshInterval] = useState(300);
  const [logCount, setLogCount] = useState(100);

  const [globalFilter, setGlobalFilter] = useState('');

  useQuery(['intervalLoadPods', db?.dbName], () => db?.dbName && intervalLoadPods(db?.dbName), {
    onSuccess: () => {
      !podName && setPodName(dbPods[0]?.podName);
    }
  });

  const { data: logFiles = [] } = useQuery(
    ['getLogFiles', podName, db?.dbType],
    async () => {
      if (!podName || !db?.dbType) return [];
      return await getLogFiles({
        podName,
        dbType: db.dbType as SupportReconfigureDBType,
        logType
      });
    },
    {
      enabled: !!podName && db?.dbType !== 'mongodb',
      onSuccess: (data) => {
        !logFile && setLogFile(data[0]);
      }
    }
  );

  const { data: logData, isLoading } = useQuery(
    [
      'getLogContent',
      logFile?.path,
      podName,
      db?.dbType,
      page,
      logCount,
      startDateTime,
      endDateTime
    ],
    async () => {
      if (!podName || !db?.dbType) return getEmptyLogResult();

      const params = {
        page,
        pageSize: logCount,
        podName,
        dbType: db.dbType as SupportReconfigureDBType,
        logType,
        logPath: 'default',
        startTime: startDateTime.getTime(),
        endTime: endDateTime.getTime()
      } as const;

      if (db.dbType === 'mongodb') {
        return await getLogContent(params);
      }

      if (!logFile?.path) {
        return getEmptyLogResult();
      }

      return await getLogContent({ ...params, logPath: logFile.path });
    },
    {
      onSuccess(data) {
        setData(data.logs);
      },
      refetchInterval: refreshInterval * 1000
    }
  );

  const handleRefresh = () => {
    // Trigger data refetch
    window.location.reload();
  };

  const handleExportLogs = async () => {
    try {
      if (!data || data.length === 0) return;

      const content = data.map((item) => `${item.timestamp}\t${item.content}`).join('\n');

      const safe = (s: string) => (s || '').replace(/[^a-zA-Z0-9-_]/g, '_');
      const parts = [safe(db?.dbName || 'db'), safe(podName || 'pod'), safe(logType)];
      if (logFile?.name) parts.push(safe(logFile.name));
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${parts.join('_')}_${ts}.log`;

      downLoadBold(content, 'text/plain;charset=utf-8', fileName);
    } catch (e) {
      console.error('Failed to export logs', e);
    }
  };

  // Log counts data
  const { data: logCounts, isLoading: isLogCountsLoading } = useQuery(
    ['getLogCounts', podName, db?.dbType, logType, startDateTime, endDateTime],
    async () => {
      if (!podName || !db?.dbType) return [];

      const params = {
        podName,
        dbType: db.dbType as SupportReconfigureDBType,
        logType,
        logPath: db.dbType === 'mongodb' ? 'default' : logFile?.path,
        startTime: startDateTime.getTime(),
        endTime: endDateTime.getTime(),
        timeRange: '1h'
      };

      return await getLogCounts(params);
    },
    {
      enabled: !!podName && !!db?.dbType,
      onSuccess(data) {
        setLogCountsData(data);
      },
      refetchInterval: refreshInterval * 1000
    }
  );

  return (
    <>
      {/* Filter Section */}
      <Flex
        mb={'6px'}
        bg={'white'}
        flexDir={'column'}
        border={theme.borders.base}
        borderRadius={'lg'}
      >
        <LogFilter
          db={db}
          logType={logType}
          podName={podName}
          logFile={logFile}
          logFiles={logFiles}
          dbPods={dbPods.map((pod) => ({ podName: pod.podName, alias: pod.podName }))}
          filteredSubNavList={filteredSubNavList || []}
          globalFilter={globalFilter}
          refreshInterval={refreshInterval}
          logCount={logCount}
          onPodChange={setPodName}
          onLogFileChange={setLogFile}
          onLogTypeChange={updateSubMenu}
          onFilterChange={setGlobalFilter}
          onRefresh={handleRefresh}
          onRefreshIntervalChange={setRefreshInterval}
          onLogCountChange={setLogCount}
        />
      </Flex>

      {/* Log Counts Section */}
      <Box
        mb={'6px'}
        p={'20px 20px'}
        bg={'white'}
        border={theme.borders.base}
        borderRadius={'lg'}
        flexShrink={0}
      >
        <LogCounts
          logCountsData={logCountsData}
          isLogCountsLoading={isLogCountsLoading}
          totalLogs={logData?.metadata?.total || 0}
        />
      </Box>

      {/* Log Table Section */}
      <Box
        bg={'white'}
        p={'20px'}
        border={theme.borders.base}
        borderRadius={'lg'}
        flex={1}
        height={'0px'}
        minH={data?.length > 0 ? '400px' : '200px'}
      >
        <LogTable
          data={data}
          isLoading={isLoading}
          globalFilter={globalFilter}
          onGlobalFilterChange={setGlobalFilter}
          page={page}
          pageSize={logCount}
          totalLogs={logData?.metadata?.total || 0}
          onPageChange={setPage}
          onExportLogs={handleExportLogs}
        />
      </Box>
    </>
  );
}

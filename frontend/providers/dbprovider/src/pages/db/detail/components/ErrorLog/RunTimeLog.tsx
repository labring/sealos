import {
  getLogFiles,
  getVlogsDatabaseLogs,
  getVlogsDatabasePods,
  getVlogsDatabaseLogCounts
} from '@/api/db';
import { useDBStore } from '@/store/db';
import { DBDetailType, SupportReconfigureDBType } from '@/types/db';
import { LogTypeEnum } from '@/constants/log';
import { TFile } from '@/utils/kubeFileSystem';
import { getUserNamespace } from '@/utils/user';
import { Box, Divider, Flex, useTheme } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import React, { useMemo, useState, useEffect } from 'react';
import { I18nCommonKey } from '@/types/i18next';
import { LogFilter } from '@/components/ErrorLog/LogFilter';
import { LogCounts } from '@/components/ErrorLog/LogCounts';
import { LogTable } from '@/components/ErrorLog/LogTable';
import { downLoadBold } from '@/utils/tools';
import useDateTimeStore from '@/store/date';
import { useRouter } from 'next/router';

const DB_MAIN_CONTAINER_MAP: Record<SupportReconfigureDBType, string> = {
  postgresql: 'postgresql',
  mongodb: 'mongodb',
  'apecloud-mysql': 'mysql',
  mysql: 'mysql',
  redis: 'redis'
};

type LogContent = {
  timestamp: string;
  content: string;
  container?: string;
  pod?: string;
  type?: string;
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
  const router = useRouter();
  const { intervalLoadPods, dbPods } = useDBStore();
  const { startDateTime, endDateTime, timeZone } = useDateTimeStore();

  const routeDbName = router.query.name as string;

  const queryEnabled = !!db?.dbType && !!routeDbName;
  console.log('Query enabled status:', {
    queryEnabled,
    hasDbType: !!db?.dbType,
    hasRouteDbName: !!routeDbName,
    dbType: db?.dbType,
    routeDbName
  });
  const [podName, setPodName] = useState<string[] | '' | null>('');
  const [logFile, setLogFile] = useState<TFile | null>();
  const [data, setData] = useState<LogContent[]>([]);
  const [logCountsData, setLogCountsData] = useState<{ logs_total: string; _time: string }[]>([]);

  const [refreshInterval, setRefreshInterval] = useState(300);
  const [logCount, setLogCount] = useState(100);

  const [globalFilter, setGlobalFilter] = useState('');
  const [pvcMap, setPvcMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (logFile === null) {
      setData([]);
      setLogCountsData([]);
    }
  }, [logFile]);

  useQuery(['intervalLoadPods', db?.dbName], () => db?.dbName && intervalLoadPods(db?.dbName), {
    onSuccess: () => {
      podName === null && setPodName(dbPods[0]?.podName ? [dbPods[0].podName] : null);
    }
  });

  useEffect(() => {
    setPodName('');
    setLogFile(undefined as any);
  }, [routeDbName, db?.dbType]);

  const { data: databasePodsData } = useQuery(
    ['getVlogsDatabasePods', db?.dbName, db?.dbType, startDateTime, endDateTime],
    async () => {
      if (!db?.dbType) return { pods: [], pvcMap: {} };

      const effectiveDbName = db.dbName && db.dbName !== 'db name' ? db.dbName : routeDbName;
      if (!effectiveDbName) {
        console.error('No valid dbName found for getVlogsDatabasePods:', {
          dbDbName: db.dbName,
          routeDbName
        });
        return { pods: [], pvcMap: {} };
      }

      const params = {
        dbName: effectiveDbName,
        dbType: db.dbType as SupportReconfigureDBType,
        startTime: startDateTime.getTime(),
        endTime: endDateTime.getTime(),
        timeRange: '30d',
        timeZone
      };

      return await getVlogsDatabasePods(params);
    },
    {
      enabled: queryEnabled,
      onSuccess(data) {
        console.log('Database pods data received, PVC Map size:', Object.keys(data.pvcMap).length);
        setPvcMap(data.pvcMap);
      }
    }
  );

  const { data: logFiles = [] } = useQuery(
    ['getLogFiles', podName, db?.dbType, dbPods],
    async () => {
      if (!db?.dbType) return [];

      if (podName === null) {
        return [];
      }

      const targetPodName =
        podName === ''
          ? dbPods[0]?.podName
          : Array.isArray(podName) && podName.length > 0
            ? podName[0]
            : undefined;
      if (!targetPodName) return [];

      return await getLogFiles({
        podName: targetPodName,
        dbType: db.dbType as SupportReconfigureDBType,
        logType
      });
    },
    {
      enabled: !!db?.dbType && db?.dbType !== 'mongodb' && !!dbPods.length,
      onSuccess: () => {
        if (logFile === null) setLogFile(undefined as any);
      }
    }
  );

  const {
    data: logData,
    isLoading,
    refetch: refetchLogData
  } = useQuery(
    [
      'getVlogsDatabaseLogs',
      podName,
      db?.dbType,
      logType,
      1,
      logCount,
      startDateTime,
      endDateTime,
      globalFilter,
      databasePodsData?.pods,
      logFile
    ],
    async () => {
      if (!db?.dbType) return getEmptyLogResult();

      if (podName === null) {
        return getEmptyLogResult();
      }

      if (logFile === null) {
        return getEmptyLogResult();
      }

      const effectiveDbName = db.dbName && db.dbName !== 'db name' ? db.dbName : routeDbName;
      if (!effectiveDbName) {
        console.error('No valid dbName found:', { dbDbName: db.dbName, routeDbName });
        return getEmptyLogResult();
      }

      let pvc: string[] = [];

      if (podName === '') {
        pvc = databasePodsData?.pods.flatMap((pod) => pod.pvcUids || []) || [];
      } else if (Array.isArray(podName)) {
        const set = new Set<string>();
        for (const name of podName) {
          const found = databasePodsData?.pods.find((pod) => pod.podName === name);
          (found?.pvcUids || []).forEach((id) => set.add(id));
        }
        pvc = Array.from(set);
      } else {
        pvc = [];
      }

      if (pvc.length === 0) {
        console.warn('No PVC UIDs found');
        return getEmptyLogResult();
      }

      const containerName = db.dbType === 'apecloud-mysql' ? 'mysql' : db.dbType;

      const logTypeStr = (() => {
        if (db.dbType === 'apecloud-mysql') {
          return logType === LogTypeEnum.ErrorLog ? ('error' as const) : ('slow' as const);
        }
        return 'run' as const;
      })();

      const params = {
        namespace: getUserNamespace(),
        pvc: pvc,
        containers: [containerName],
        type: [logTypeStr],
        startTime: startDateTime.getTime(),
        endTime: endDateTime.getTime(),
        pageSize: logCount,
        keyword: globalFilter || '',
        timeZone
      };

      console.log('RunTimeLog - getVlogsDatabaseLogs params:', {
        namespace: params.namespace,
        pvc: params.pvc,
        containers: params.containers,
        type: params.type,
        podName,
        routeDbName,
        dbDbName: db.dbName,
        dbDbType: db.dbType,
        logTypeEnum: logType
      });

      return await getVlogsDatabaseLogs(params);
    },
    {
      enabled: queryEnabled && !!databasePodsData?.pods?.length,
      onSuccess(data) {
        console.log('getVlogsDatabaseLogs success:', data);

        const containerName =
          DB_MAIN_CONTAINER_MAP[db.dbType as SupportReconfigureDBType] || db.dbType;

        const processedLogs = data.logs.map((log: any) => ({
          timestamp: log.timestamp || '',
          content: log.content || '',
          container: containerName,
          pod: log.pod || '',
          type: logType
        }));

        setData(processedLogs);
      },
      onError(error) {
        console.error('getVlogsDatabaseLogs error:', error);
      },
      refetchInterval: refreshInterval * 1000
    }
  );

  const handleRefresh = () => {
    refetchLogData();
    refetchLogCounts();
  };

  const handleExportLogs = async () => {
    try {
      if (!data || data.length === 0) return;

      const content = data.map((item) => `${item.timestamp}\t${item.content}`).join('\n');

      const safe = (s: string) => (s || '').replace(/[^a-zA-Z0-9-_]/g, '_');
      const parts = [
        safe(db?.dbName || 'db'),
        safe(Array.isArray(podName) ? 'multi' : podName || 'pod'),
        safe(logType)
      ];
      if (logFile?.name) parts.push(safe(logFile.name));
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${parts.join('_')}_${ts}.log`;

      downLoadBold(content, 'text/plain;charset=utf-8', fileName);
    } catch (e) {
      console.error('Failed to export logs', e);
    }
  };

  const {
    data: logCounts,
    isLoading: isLogCountsLoading,
    refetch: refetchLogCounts
  } = useQuery(
    [
      'getVlogsDatabaseLogCounts',
      podName,
      db?.dbType,
      logType,
      startDateTime,
      endDateTime,
      databasePodsData?.pods,
      logFile
    ],
    async () => {
      if (!db?.dbType || !databasePodsData?.pods?.length) return [];

      if (podName === null) {
        return [];
      }

      if (logFile === null) {
        return [];
      }

      let pvc: string[] = [];

      if (podName === '') {
        pvc = databasePodsData.pods.flatMap((pod) => pod.pvcUids || []);
      } else if (Array.isArray(podName)) {
        const set = new Set<string>();
        for (const name of podName) {
          const found = databasePodsData.pods.find((pod) => pod.podName === name);
          (found?.pvcUids || []).forEach((id) => set.add(id));
        }
        pvc = Array.from(set);
      } else {
        pvc = [];
      }

      if (pvc.length === 0) {
        console.warn('No PVC UIDs found for pod in counts query');
        return [];
      }

      const containerName = db.dbType === 'apecloud-mysql' ? 'mysql' : db.dbType;

      const logTypeStr = (() => {
        if (db.dbType === 'apecloud-mysql' || db.dbType === 'mysql') {
          return logType === LogTypeEnum.ErrorLog ? ('error' as const) : ('slow' as const);
        }
        return 'run' as const;
      })();

      const params = {
        namespace: getUserNamespace(),
        pvc: pvc,
        containers: [containerName],
        type: [logTypeStr],
        startTime: startDateTime.getTime(),
        endTime: endDateTime.getTime(),
        keyword: globalFilter || '',
        timeZone
      };

      return await getVlogsDatabaseLogCounts(params);
    },
    {
      enabled: !!db?.dbType && !!databasePodsData?.pods?.length,
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
        pt={'7px'}
        pb={'24px'}
        px={'24px'}
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
          onExportLogs={handleExportLogs}
          pvcMap={pvcMap}
        />
      </Box>
    </>
  );
}

import {
  getLogContent,
  getLogFiles,
  getLogCounts,
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

// 数据库主容器名称映射
const DB_MAIN_CONTAINER_MAP: Record<SupportReconfigureDBType, string> = {
  postgresql: 'postgresql',
  mongodb: 'mongodb',
  'apecloud-mysql': 'mysql',
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
  const { startDateTime, endDateTime } = useDateTimeStore();

  // 获取路由参数中的 dbName 作为备用值
  const routeDbName = router.query.name as string;

  // 调试查询启用状态
  const queryEnabled = !!db?.dbType && !!routeDbName;
  console.log('Query enabled status:', {
    queryEnabled,
    hasDbType: !!db?.dbType,
    hasRouteDbName: !!routeDbName,
    dbType: db?.dbType,
    routeDbName
  });
  const [podName, setPodName] = useState<string | null>('');
  const [logFile, setLogFile] = useState<TFile | null>();
  const [data, setData] = useState<LogContent[]>([]);
  const [logCountsData, setLogCountsData] = useState<{ logs_total: string; _time: string }[]>([]);

  // remove pagination; always fetch latest with page 1 and size = logCount
  const [refreshInterval, setRefreshInterval] = useState(300);
  const [logCount, setLogCount] = useState(100);

  const [globalFilter, setGlobalFilter] = useState('');
  const [pvcMap, setPvcMap] = useState<Record<string, string>>({}); // pvcUid -> podName 映射

  // 监听 logFile 变化，立即清空UI
  useEffect(() => {
    if (logFile === null) {
      setData([]);
      setLogCountsData([]);
    }
  }, [logFile]);

  useQuery(['intervalLoadPods', db?.dbName], () => db?.dbName && intervalLoadPods(db?.dbName), {
    onSuccess: () => {
      !podName && setPodName(dbPods[0]?.podName);
    }
  });

  // 获取数据库Pod和PVC信息
  const { data: databasePodsData } = useQuery(
    ['getVlogsDatabasePods', db?.dbName, db?.dbType, startDateTime, endDateTime],
    async () => {
      if (!db?.dbType) return { pods: [], pvcMap: {} };

      // 确保有有效的 dbName
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
        timeRange: '30d'
      };

      return await getVlogsDatabasePods(params);
    },
    {
      enabled: queryEnabled,
      onSuccess(data) {
        // 更新Pod列表，包含PVC信息
        console.log('Database pods data received, PVC Map size:', Object.keys(data.pvcMap).length);
        setPvcMap(data.pvcMap);
        // 这里可以更新dbPods，但需要保持与现有逻辑的兼容性
      }
    }
  );

  const { data: logFiles = [] } = useQuery(
    ['getLogFiles', podName, db?.dbType, dbPods],
    async () => {
      if (!db?.dbType) return [];

      // 如果 podName 为 null，说明用户取消了所有选择，返回空数组
      if (podName === null) {
        return [];
      }

      // 当选择All Pod时，使用第一个可用的Pod来获取日志文件
      const targetPodName = podName || dbPods[0]?.podName;
      if (!targetPodName) return [];

      return await getLogFiles({
        podName: targetPodName,
        dbType: db.dbType as SupportReconfigureDBType,
        logType
      });
    },
    {
      enabled: !!db?.dbType && db?.dbType !== 'mongodb' && !!dbPods.length,
      onSuccess: (data) => {
        !logFile && setLogFile(data[0]);
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

      // 如果 podName 为 null，说明用户取消了所有选择，返回空结果
      if (podName === null) {
        return getEmptyLogResult();
      }

      // 如果 logFile 为 null，说明用户取消了container选择，返回空结果
      if (logFile === null) {
        return getEmptyLogResult();
      }

      // 确保有有效的 dbName
      const effectiveDbName = db.dbName && db.dbName !== 'db name' ? db.dbName : routeDbName;
      if (!effectiveDbName) {
        console.error('No valid dbName found:', { dbDbName: db.dbName, routeDbName });
        return getEmptyLogResult();
      }

      // 收集 PVC UID 列表
      let pvc: string[] = [];

      if (podName === '') {
        // 空字符串表示选择了所有 pod，收集所有 pod 的 PVC UID
        pvc = databasePodsData?.pods.flatMap((pod) => pod.pvcUids || []) || [];
      } else {
        // 有具体 podName，只收集该 pod 的 PVC UID
        const selectedPod = databasePodsData?.pods.find((pod) => pod.podName === podName);
        pvc = selectedPod?.pvcUids || [];
      }

      if (pvc.length === 0) {
        console.warn('No PVC UIDs found');
        return getEmptyLogResult();
      }

      // 确定容器名称（主容器名称等于数据库类型名称）
      const containerName = db.dbType === 'apecloud-mysql' ? 'mysql' : db.dbType;

      // 确定日志类型
      const logTypeStr = (() => {
        if (db.dbType === 'apecloud-mysql') {
          return logType === LogTypeEnum.ErrorLog ? ('error' as const) : ('slow' as const); // MySQL 支持 error/slow
        }
        return 'run' as const; // 其他数据库只支持 run
      })();

      const params = {
        namespace: getUserNamespace(), // 获取用户命名空间
        pvc: pvc,
        containers: [containerName],
        type: [logTypeStr], // 改为数组格式
        startTime: startDateTime.getTime(),
        endTime: endDateTime.getTime(),
        pageSize: logCount,
        keyword: globalFilter || ''
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

      // 使用新的数据库专用API
      return await getVlogsDatabaseLogs(params);
    },
    {
      enabled: queryEnabled && !!databasePodsData?.pods?.length,
      onSuccess(data) {
        console.log('getVlogsDatabaseLogs success:', data);

        // 获取主容器名称
        const containerName =
          DB_MAIN_CONTAINER_MAP[db.dbType as SupportReconfigureDBType] || db.dbType;

        // 处理日志数据，确保包含 Container 和 Pod 信息
        const processedLogs = data.logs.map((log: any) => ({
          timestamp: log.timestamp || '',
          content: log.content || '',
          container: containerName, // 使用主容器名称
          pod: log.pod || '', // 后端返回的 volume_uid，前端通过 pvcMap 映射为 pod name
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
    // 使用React Query的refetch功能，而不是window.location.reload()
    refetchLogData();
    refetchLogCounts();
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

  // Log counts data - 使用vlogs API获取统计信息
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

      // 如果 podName 为 null，说明用户取消了所有选择，返回空数组
      if (podName === null) {
        return [];
      }

      // 如果 logFile 为 null，说明用户取消了container选择，返回空数组
      if (logFile === null) {
        return [];
      }

      // 收集 PVC UID 列表
      let pvc: string[] = [];

      if (podName === '') {
        // 空字符串表示选择了所有 pod，收集所有 pod 的 PVC UID
        pvc = databasePodsData.pods.flatMap((pod) => pod.pvcUids || []);
      } else {
        // 有具体 podName，只收集该 pod 的 PVC UID
        const selectedPod = databasePodsData.pods.find((pod) => pod.podName === podName);
        pvc = selectedPod?.pvcUids || [];
      }

      if (pvc.length === 0) {
        console.warn('No PVC UIDs found for pod in counts query');
        return [];
      }

      // 确定容器名称
      const containerName = db.dbType === 'apecloud-mysql' ? 'mysql' : db.dbType;

      // 确定日志类型
      const logTypeStr = (() => {
        if (db.dbType === 'apecloud-mysql') {
          return logType === LogTypeEnum.ErrorLog ? ('error' as const) : ('slow' as const); // MySQL 支持 error/slow
        }
        return 'run' as const; // 其他数据库只支持 run
      })();

      const params = {
        namespace: getUserNamespace(),
        pvc: pvc,
        containers: [containerName],
        type: [logTypeStr], // 改为数组格式
        startTime: startDateTime.getTime(),
        endTime: endDateTime.getTime(),
        keyword: globalFilter || ''
      };

      // 使用专门的统计API获取时间范围内的统计信息
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

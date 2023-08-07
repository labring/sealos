import Tabs from '@/components/MonitorTabs/index';
import { DBDetailType } from '@/types/db';
import { Box, Flex } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import ChartTemplate from './ChartTemplate';
import RunningTime from './RunningTime';
import { DBTypeEnum } from '@/constants/db';
import dayjs from 'dayjs';
import { useTranslation } from 'next-i18next';

enum MonitorType {
  resources = 'resources',
  status = 'status',
  performance = 'performance'
}

const Monitor = ({ db, dbName, dbType }: { dbName: string; dbType: string; db?: DBDetailType }) => {
  const router = useRouter();
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState(MonitorType.resources);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(dayjs().format('HH:mm:ss'));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <Flex h={'100%'} p={'0px 24px 24px 24px'} flexDirection={'column'}>
      <Flex justifyContent={'space-between'} alignItems={'center'}>
        <Tabs
          w={'280px'}
          list={[
            { id: MonitorType.resources, label: 'Resources' },
            { id: MonitorType.status, label: 'Status' },
            { id: MonitorType.performance, label: 'Performance' }
          ]}
          activeId={activeId}
          onChange={(id) => setActiveId(id as MonitorType)}
        />
        <Box fontSize={'12px'} fontWeight={500} color={'#7B838B'} pr="8px">
          {t('Update Time')} {currentTime}
        </Box>
      </Flex>
      {activeId === MonitorType.resources && (
        <Box mt={'16px'} overflowY={'scroll'} flex={1}>
          <ChartTemplate
            apiUrl="/api/monitor/getMonitorData"
            chartTitle={'CPU'}
            dbName={dbName}
            dbType={dbType}
            db={db}
            unit="%"
            isShowLegend={false}
            queryKey={'cpu'}
          />
          <ChartTemplate
            apiUrl="/api/monitor/getMonitorData"
            chartTitle={'Memory'}
            dbName={dbName}
            dbType={dbType}
            db={db}
            unit="%"
            isShowLegend={false}
            queryKey={'memory'}
          />
          <ChartTemplate
            apiUrl="/api/monitor/getMonitorData"
            chartTitle={'Disk'}
            dbName={dbName}
            dbType={dbType}
            db={db}
            unit="%"
            isShowLegend={false}
            queryKey={'disk'}
          />
          {(dbType === DBTypeEnum.mongodb || dbType === DBTypeEnum.postgresql) && (
            <ChartTemplate
              apiUrl="/api/monitor/getDataBaseSize"
              chartTitle={'Database Usage'}
              dbName={dbName}
              dbType={dbType}
              db={db}
              unit="GiB"
            />
          )}
        </Box>
      )}
      {activeId === MonitorType.status && (
        <Box mt={'16px'} overflowY={'scroll'} flex={1}>
          <RunningTime db={db} dbName={dbName} dbType={dbType} />

          {dbType === DBTypeEnum.postgresql && (
            <>
              <ChartTemplate
                apiUrl="/api/monitor/getCurrentConnections"
                chartTitle={'Current Connections'}
                dbName={dbName}
                dbType={dbType}
                db={db}
              />
              <ChartTemplate
                apiUrl="/api/monitor/getActiveConnections"
                chartTitle={'Active Connections'}
                dbName={dbName}
                dbType={dbType}
                db={db}
              />
            </>
          )}

          {dbType === DBTypeEnum.mysql && (
            <>
              <ChartTemplate
                apiUrl="/api/monitor/getCurrentConnections"
                chartTitle={'Current Connections'}
                dbName={dbName}
                dbType={dbType}
                db={db}
              />
              <ChartTemplate
                apiUrl="/api/monitor/getAbortedConnections"
                chartTitle={'Aborted Connections'}
                dbName={dbName}
                dbType={dbType}
                db={db}
              />
            </>
          )}

          {dbType === DBTypeEnum.mongodb && (
            <ChartTemplate
              apiUrl="/api/monitor/getCurrentConnections"
              chartTitle={'Current Connections'}
              dbName={dbName}
              dbType={dbType}
              db={db}
            />
          )}

          {dbType === DBTypeEnum.redis && (
            <>
              <ChartTemplate
                apiUrl="/api/monitor/getRedisPerDB"
                chartTitle={'Items per DB'}
                dbName={dbName}
                dbType={dbType}
                db={db}
              />
            </>
          )}
        </Box>
      )}
      {activeId === MonitorType.performance && (
        <Box mt={'16px'} overflowY={'scroll'} flex={1}>
          {dbType === DBTypeEnum.postgresql && (
            <>
              <ChartTemplate
                apiUrl="/api/monitor/getTransactions"
                chartTitle={'Commits Per Second'}
                dbName={dbName}
                dbType={dbType}
                db={db}
              />
              <ChartTemplate
                apiUrl="/api/monitor/getRollback"
                chartTitle={'Rollbacks Per Second'}
                dbName={dbName}
                dbType={dbType}
                db={db}
              />
              <ChartTemplate
                apiUrl="/api/monitor/getDurationTransaction"
                chartTitle={'Duration of Transaction'}
                dbName={dbName}
                dbType={dbType}
                db={db}
                unit="ms"
              />
              <ChartTemplate
                apiUrl="/api/monitor/getBlockReadTime"
                chartTitle={'Block Read Time'}
                dbName={dbName}
                dbType={dbType}
                db={db}
                unit="ms"
              />

              <ChartTemplate
                apiUrl="/api/monitor/getBlockWriteTime"
                chartTitle={'Block Write Time'}
                dbName={dbName}
                dbType={dbType}
                db={db}
                unit="ms"
              />
            </>
          )}
          {dbType === DBTypeEnum.mysql && (
            <>
              <ChartTemplate
                apiUrl="/api/monitor/getTransactions"
                chartTitle={'Commits Per Second'}
                dbName={dbName}
                dbType={dbType}
                db={db}
              />
              <ChartTemplate
                apiUrl="/api/monitor/getMysqlTableLocks"
                chartTitle={'Table Locks'}
                dbName={dbName}
                dbType={dbType}
                db={db}
              />
              <ChartTemplate
                apiUrl="/api/monitor/getMysqlSlowQueries"
                chartTitle={'Slow Queries'}
                dbName={dbName}
                dbType={dbType}
                db={db}
              />
            </>
          )}

          {dbType === DBTypeEnum.mongodb && (
            <>
              <ChartTemplate
                apiUrl="/api/monitor/getMongdbPerformance"
                chartTitle={'Document Operations'}
                dbName={dbName}
                dbType={dbType}
                db={db}
                queryKey={'Mongodb_DocumentOperations'}
              />
              <ChartTemplate
                apiUrl="/api/monitor/getMongdbPerformance"
                chartTitle={'Query Operations'}
                dbName={dbName}
                dbType={dbType}
                db={db}
                queryKey={'Mongodb_QueryOperations'}
              />
              <ChartTemplate
                apiUrl="/api/monitor/getMongdbPerformance"
                chartTitle={'Page Faults'}
                dbName={dbName}
                dbType={dbType}
                db={db}
                queryKey={'Mongodb_PageFaults'}
                unit="ops/s"
              />
            </>
          )}
          {dbType === DBTypeEnum.redis && (
            <>
              <ChartTemplate
                apiUrl="/api/monitor/getRedisPerformance"
                chartTitle={'Command Latency'}
                dbName={dbName}
                dbType={dbType}
                db={db}
                queryKey={'Redis_CommandLatency'}
                unit="s"
              />
              <ChartTemplate
                apiUrl="/api/monitor/getRedisPerformance"
                chartTitle={'Key evictions'}
                dbName={dbName}
                dbType={dbType}
                db={db}
                queryKey={'Redis_KeyEvictions'}
              />
              <ChartTemplate
                apiUrl="/api/monitor/getRedisPerformance"
                chartTitle={'Hits Ratio'}
                dbName={dbName}
                dbType={dbType}
                db={db}
                queryKey={'Redis_HitsRatio'}
                unit="%"
              />
            </>
          )}
        </Box>
      )}
    </Flex>
  );
};

export default Monitor;

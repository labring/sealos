import { DBDetailType } from '@/types/db';
import { Box, Flex } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import ChartTemplate from './ChartTemplate';
import RunningTime from './RunningTime';
import { DBTypeEnum } from '@/constants/db';
import dayjs from 'dayjs';
import { useTranslation } from 'next-i18next';
import { Tabs } from '@sealos/ui';

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
      setCurrentTime(dayjs().format('HH:mm'));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <Flex h={'100%'} p={'0px 24px 24px 24px'} flexDirection={'column'}>
      <Flex justifyContent={'space-between'} alignItems={'center'}>
        <Tabs
          size="sm"
          w={'280px'}
          list={[
            { id: MonitorType.resources, label: t('Resources') },
            { id: MonitorType.status, label: t('status') },
            { id: MonitorType.performance, label: t('Performance') }
          ]}
          activeId={activeId}
          onChange={(id) => setActiveId(id as MonitorType)}
        />
        <Box fontSize={'12px'} fontWeight={500} color={'#7B838B'} pr="8px">
          {t('update_time')} {currentTime}
        </Box>
      </Flex>
      {activeId === MonitorType.resources && (
        <Box overflowY={'scroll'} flex={1}>
          <ChartTemplate
            apiUrl="/api/monitor/getMonitorData"
            chartTitle={'cpu'}
            dbName={dbName}
            dbType={dbType}
            db={db}
            unit="%"
            isShowLegend={false}
            queryKey={'cpu'}
          />
          <ChartTemplate
            apiUrl="/api/monitor/getMonitorData"
            chartTitle={'memory'}
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
              chartTitle={'database_usage'}
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
                chartTitle={'current_connections'}
                dbName={dbName}
                dbType={dbType}
                db={db}
              />
              <ChartTemplate
                apiUrl="/api/monitor/getActiveConnections"
                chartTitle={'active_connections'}
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
                chartTitle={'current_connections'}
                dbName={dbName}
                dbType={dbType}
                db={db}
              />
              <ChartTemplate
                apiUrl="/api/monitor/getAbortedConnections"
                chartTitle={'aborted_connections'}
                dbName={dbName}
                dbType={dbType}
                db={db}
              />
            </>
          )}

          {dbType === DBTypeEnum.mongodb && (
            <ChartTemplate
              apiUrl="/api/monitor/getCurrentConnections"
              chartTitle={'current_connections'}
              dbName={dbName}
              dbType={dbType}
              db={db}
            />
          )}

          {dbType === DBTypeEnum.redis && (
            <>
              <ChartTemplate
                apiUrl="/api/monitor/getRedisPerDB"
                chartTitle={'items_per_db'}
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
                chartTitle={'commits_per_second'}
                dbName={dbName}
                dbType={dbType}
                db={db}
              />
              <ChartTemplate
                apiUrl="/api/monitor/getRollback"
                chartTitle={'rollbacks_per_second'}
                dbName={dbName}
                dbType={dbType}
                db={db}
              />
              <ChartTemplate
                apiUrl="/api/monitor/getDurationTransaction"
                chartTitle={'duration_of_transaction'}
                dbName={dbName}
                dbType={dbType}
                db={db}
                unit="ms"
              />
              <ChartTemplate
                apiUrl="/api/monitor/getBlockReadTime"
                chartTitle={'block_read_time'}
                dbName={dbName}
                dbType={dbType}
                db={db}
                unit="ms"
              />

              <ChartTemplate
                apiUrl="/api/monitor/getBlockWriteTime"
                chartTitle={'block_write_time'}
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
                chartTitle={'commits_per_second'}
                dbName={dbName}
                dbType={dbType}
                db={db}
              />
              <ChartTemplate
                apiUrl="/api/monitor/getMysqlTableLocks"
                chartTitle={'table_locks'}
                dbName={dbName}
                dbType={dbType}
                db={db}
              />
              <ChartTemplate
                apiUrl="/api/monitor/getMysqlSlowQueries"
                chartTitle={'slow_queries'}
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
                chartTitle={'document_operations'}
                dbName={dbName}
                dbType={dbType}
                db={db}
                queryKey={'Mongodb_DocumentOperations'}
              />
              <ChartTemplate
                apiUrl="/api/monitor/getMongdbPerformance"
                chartTitle={'query_operations'}
                dbName={dbName}
                dbType={dbType}
                db={db}
                queryKey={'Mongodb_QueryOperations'}
              />
              <ChartTemplate
                apiUrl="/api/monitor/getMongdbPerformance"
                chartTitle={'page_faults'}
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
                chartTitle={'command_latency'}
                dbName={dbName}
                dbType={dbType}
                db={db}
                queryKey={'Redis_CommandLatency'}
                unit="s"
              />
              <ChartTemplate
                apiUrl="/api/monitor/getRedisPerformance"
                chartTitle={'key_evictions'}
                dbName={dbName}
                dbType={dbType}
                db={db}
                queryKey={'Redis_KeyEvictions'}
              />
              <ChartTemplate
                apiUrl="/api/monitor/getRedisPerformance"
                chartTitle={'hits_ratio'}
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

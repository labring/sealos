import { getMigratePodList } from '@/api/migrate';
import { Box } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export default function MigrateStatus({
  migrateStatus,
  migrateName
}: {
  migrateName: string;
  migrateStatus: string;
}) {
  const { data: MigratePods = [] } = useQuery(['getMigratePodList', migrateName], () =>
    getMigratePodList(migrateName)
  );

  const status = useMemo(() => {
    MigratePods.map((i) => {
      console.log(i.status?.phase);
    });
    const isCompleted = MigratePods.every((pod) => pod?.status?.phase === 'Succeeded');
    const isFailed = MigratePods.some((pod) => pod?.status?.phase === 'Failed');
    if (migrateStatus === 'InitPrepared' && isFailed) {
      return 'Failed';
    }
    if (isCompleted) {
      return 'Complete';
    }
    return migrateStatus;
  }, [MigratePods, migrateStatus]);

  return <Box>{status}</Box>;
}

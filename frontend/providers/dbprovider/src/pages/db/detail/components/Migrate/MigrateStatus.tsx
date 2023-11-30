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
  const { data: MigratePods = [] } = useQuery(
    ['getMigratePodStatus', migrateName],
    () => getMigratePodList(migrateName),
    {
      refetchInterval: 5000
    }
  );

  const status = useMemo(() => {
    const isCompleted = MigratePods.every((pod) => pod?.status?.phase === 'Succeeded');
    const isFailed = MigratePods.some((pod) => pod?.status?.phase === 'Failed');
    if (migrateStatus === 'InitPrepared' && isFailed) {
      return 'Failed';
    }
    if (isCompleted) {
      return 'Complete';
    }
    return MigratePods[0]?.status?.phase || migrateStatus;
  }, [MigratePods, migrateStatus]);

  return <Box>{status}</Box>;
}

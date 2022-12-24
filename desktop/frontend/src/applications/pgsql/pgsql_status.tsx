import clsx from 'clsx';
import styles from './pgsql_status.module.scss';
import { TPgsqlDetail, EPgsqlStatus } from './pgsql_common';
import Image from 'next/image';

type PgsqlStatus = {
  pgsqlDetail: TPgsqlDetail;
  openEventDialog: (e: any, item: TPgsqlDetail) => void;
};

function PgsqlStatus(props: PgsqlStatus) {
  const { openEventDialog, pgsqlDetail } = props;
  return (
    <div
      className={clsx(
        styles.pgsqlStatus,
        {
          [styles.running]: pgsqlDetail?.status?.PostgresClusterStatus === EPgsqlStatus.Running,
          [styles.creating]: pgsqlDetail?.status?.PostgresClusterStatus === EPgsqlStatus.Creating,
          [styles.failed]: pgsqlDetail?.status?.PostgresClusterStatus === EPgsqlStatus.Failed
        },
        'cursor-pointer'
      )}
      onClick={(e) => openEventDialog(e, pgsqlDetail)}
    >
      <div className={styles.circle}></div>
      <div className={clsx('px-1')}>{pgsqlDetail?.status?.PostgresClusterStatus}</div>
      <Image src="/images/pgsql/shrink.svg" alt="pgsql" width={20} height={20} />
    </div>
  );
}

export default PgsqlStatus;

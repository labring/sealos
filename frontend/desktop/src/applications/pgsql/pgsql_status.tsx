import clsx from 'clsx';
import styles from './pgsql_status.module.scss';
import { TPgsqlDetail, EPgsqlStatus } from './pgsql_common';
import Iconfont from 'components/iconfont';

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
      <div className={clsx('px-1 w-16')}>
        {pgsqlDetail?.status?.PostgresClusterStatus === EPgsqlStatus.Failed
          ? 'Failed'
          : pgsqlDetail?.status?.PostgresClusterStatus}
      </div>
      <Iconfont width={16} height={16} iconName="icon-shrink" />
    </div>
  );
}

export default PgsqlStatus;

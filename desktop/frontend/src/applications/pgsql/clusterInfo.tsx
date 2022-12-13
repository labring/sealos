import styles from './clusterInfo.module.scss';
import clsx from 'clsx';
import request from 'services/request';
import useSessionStore from 'stores/session';
import { useQuery } from '@tanstack/react-query';
import { PgsqlDetail } from './front_page';
import Image from 'next/image';
import { formatTime } from 'utils/format';

type InfoData = {
  label: string;
  value: string | number;
};

function InfoCard({ infoDatas }: { infoDatas: InfoData[] }) {
  return (
    <div className={clsx(styles.card, 'space-y-2')}>
      {infoDatas &&
        infoDatas.map((item) => (
          <div key={item.label}>
            <span className="w-1/2 inline-block">{item.label}</span>
            <span>{item.value}</span>
          </div>
        ))}
    </div>
  );
}

type ClusterInfo = {
  detailName: string;
  onCancel?: () => void;
  openEventDialog: (e: React.MouseEvent<HTMLDivElement>, item: PgsqlDetail) => void;
  openDeleteDialog: (e: React.MouseEvent<HTMLDivElement>, item: PgsqlDetail) => void;
};

export default function ClusterInfo(props: ClusterInfo) {
  const { detailName, onCancel, openEventDialog, openDeleteDialog } = props;
  const { kubeconfig } = useSessionStore((state) => state.getSession());
  const { data, isSuccess } = useQuery(['getPgsql'], () =>
    request.post('/api/pgsql/getPgsql', { kubeconfig, pgsqlName: detailName })
  );
  const detailPgsql: PgsqlDetail = data?.data;
  console.log(detailPgsql);

  return (
    <div className={styles.pageWrapperScroll}>
      <div className={clsx(styles.header, 'flex items-center')}>
        <div
          className={clsx(
            styles.pgsqlStatus,
            styles[detailPgsql?.status?.PostgresClusterStatus || 'undefined'],
            'cursor-pointer'
          )}
          onClick={(e) => openEventDialog(e, detailPgsql)}
        >
          <div className={styles.circle}></div>
          <div className="px-1">{detailPgsql?.status?.PostgresClusterStatus}</div>
          <Image src="/images/pgsql/shrink.svg" alt="pgsql" width={20} height={20} />
        </div>
        <div
          className={clsx(styles.deleteBtn, 'cursor-pointer ml-4')}
          onClick={(e) => openDeleteDialog(e, detailPgsql)}
        >
          <Image src="/images/pgsql/delete.svg" alt="pgsql" width={16} height={16} />
        </div>
        <div className={clsx(styles.closeBtn, 'cursor-pointer ml-auto')} onClick={onCancel}>
          <Image src="/images/pgsql/close.svg" alt="pgsql" width={16} height={16} />
        </div>
      </div>
      <div className={styles.title}>{detailPgsql?.metadata.name}</div>
      <InfoCard
        infoDatas={[
          {
            label: 'teamId',
            value: detailPgsql?.spec.teamId
          },
          {
            label: 'creationTime',
            value: formatTime(detailPgsql?.metadata.creationTimestamp, 'YYYY/MM/DD HH:mm')
          }
        ]}
      />
      <InfoCard
        infoDatas={[
          {
            label: 'postgreSQL version',
            value: detailPgsql?.spec.postgresql.version
          },
          {
            label: 'number of instance',
            value: detailPgsql?.spec.numberOfInstances
          }
        ]}
      />
      <InfoCard
        infoDatas={[
          {
            label: 'CPU',
            value: detailPgsql?.spec.resources.requests.cpu
          },
          {
            label: 'Memory',
            value: detailPgsql?.spec.resources.requests.memory
          }
        ]}
      />
      <InfoCard
        infoDatas={[
          {
            label: 'volume size',
            value: detailPgsql?.spec.volume.size
          }
        ]}
      />
    </div>
  );
}

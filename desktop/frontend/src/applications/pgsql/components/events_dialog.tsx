import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import Image from 'next/image';
import request from 'services/request';
import useSessionStore from 'stores/session';
import styles from './events_dialog.module.scss';

type PgsqlEventsDialog = {
  name: string;
  onCancel?: () => void;
  status?: string;
};

type PgsqlEvent = {
  metadata: {
    creationTimestamp: string;
  };
  note: string;
  regarding: {
    name: string;
    king: string;
  };
};

export default function PgsqlEventsDialog(props: PgsqlEventsDialog) {
  const { name, onCancel, status } = props;
  const { kubeconfig } = useSessionStore((state) => state.getSession());
  const { data } = useQuery(['getEvents'], () =>
    request.post('/api/pgsql/getEvents', { kubeconfig, pgsqlName: name })
  );
  const items = data?.data?.items;

  return (
    <div className="flex flex-col">
      <div className="flex items-center">
        <div>{status}</div>
        <div className={clsx(styles.packUpBtn, 'ml-auto cursor-pointer ')} onClick={onCancel}>
          <Image src="/images/pgsql/shrink.svg" alt="packup" width={16} height={16} />
        </div>
      </div>
      {items?.length === 0 && <div>暂无数据</div>}
      {items?.map((item: PgsqlEvent) => {
        return (
          <div key={item.note} className={clsx(styles.eventInfo, 'ml-3')}>
            {item.note}
          </div>
        );
      })}
    </div>
  );
}

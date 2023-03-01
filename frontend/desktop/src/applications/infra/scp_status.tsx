import styles from './scp_status.module.scss';

type StatusComponent = {
  infraStatus: string;
  clusterStatus: string;
  desc?: boolean;
};

const StatusComponent = ({ infraStatus, clusterStatus, desc = true }: StatusComponent) => {
  let status = 'Pending';
  const colorStatus: any = {
    Pending: { value: 'Pending', title: '创建中' },
    Running: { value: 'Running', title: '运行中' },
    Start: { value: 'Start', title: '启动中' },
    Deleting: { value: 'Deleting', title: '删除中' }
  };

  if (infraStatus === 'Deleting') {
    status = 'Deleting';
  }

  if (infraStatus === 'Running') {
    status = 'Start';
  }

  if (infraStatus === 'Running' && clusterStatus === 'Running') {
    status = 'Running';
  }

  return (
    <div className={styles.status}>
      <div className={styles[`${colorStatus[status].value}`]}></div>
      {desc && <div className={styles.right}>{colorStatus[status].title}</div>}
    </div>
  );
};

export default StatusComponent;

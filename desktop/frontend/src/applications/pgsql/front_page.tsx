import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import Image from 'next/image';
import { useState } from 'react';
import request from 'services/request';
import useAppStore from 'stores/app';
import useSessionStore from 'stores/session';
import { formatTime } from 'utils/format';
import ClusterInfo from './clusterInfo';
import DeletePgsqlDialog from './components/delete_dialog';
import Drawer from './components/drawer';
import PgsqlEventsDialog from './components/events_dialog';
import styles from './front_page.module.scss';
import { PageType, usePgSqlContext } from './index';

export type PgsqlDetail = {
  metadata: {
    name: string;
    creationTimestamp: string;
    uid: string;
  };
  spec: {
    postgresql: {
      version: string;
    };
    volume: {
      size: string;
    };
    resources: {
      limits: { cpu: string; memory: string };
      requests: { cpu: string; memory: string };
    };
    teamId: string;
    numberOfInstances: number;
  };
  status?: {
    PostgresClusterStatus: string;
  };
};

function FrontPage() {
  const { toPage } = usePgSqlContext();
  const { kubeconfig } = useSessionStore((state) => state.getSession());
  const [pgsqlListStatus, setPgsqlListStatus] = useState('Pending');
  const [pgsqlName, setPgsqlName] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [deletePgsqlVisible, setDeletePgsqlVisible] = useState(false);
  const [eventsDialogVisible, setEventsDialogVisible] = useState(false);
  const [pgsqlStatus, setPgsqlStatus] = useState('');
  const { currentApp, openedApps } = useAppStore();
  const curApp = openedApps.find((item) => item.name === currentApp?.name);
  // console.log('render fronted');

  const { data: pgsqlLists } = useQuery(
    ['getAllPgsql'],
    async () => {
      const res = await request.post('/api/pgsql/getAll', { kubeconfig });
      let allReady = res.data.items?.every((item: any) => {
        return item.status.PostgresClusterStatus === 'Running';
      });
      if (allReady) {
        setPgsqlListStatus('Running');
      }
      return res;
    },
    {
      refetchInterval: pgsqlListStatus === 'Pending' ? 10 * 1000 : false, //轮询时间
      enabled: pgsqlListStatus === 'Pending' // 只有 url 为 '' 的时候需要请求
    }
  );

  const getPgsql = (pgsqlName: string) => {
    setDrawerVisible(true);
    setPgsqlName(pgsqlName);
  };

  const freshList = () => {
    setPgsqlListStatus('Pending');
  };

  const openDeleteDialog = (e: React.MouseEvent<HTMLDivElement>, item: PgsqlDetail) => {
    e.stopPropagation();
    setPgsqlName(item.metadata.name);
    setDeletePgsqlVisible(true);
    freshList();
  };

  const openEventDialog = (e: React.MouseEvent<HTMLDivElement>, item: PgsqlDetail) => {
    e.stopPropagation();
    setEventsDialogVisible(true);
    setPgsqlStatus(
      item?.status?.PostgresClusterStatus ? item?.status?.PostgresClusterStatus : 'emptyStatus'
    );
  };

  return (
    <div className={clsx(styles.pgsqlFrontPage, 'w-full h-full flex flex-col')}>
      <div
        className={clsx('flex pt-8 items-center', curApp?.size === 'maxmin' ? 'px-8' : 'px-40 ')}
      >
        <div className={styles.logo}>
          <Image src="/images/pgsql/logo.svg" alt="pgsql" width={32} height={32} />
        </div>
        <div className={clsx(styles.frontTitle, 'ml-8')}>PostgreSQL 集群列表</div>
        <div
          className={clsx(styles.addBtn, 'ml-auto cursor-pointer')}
          onClick={() => toPage(PageType.AddPage)}
        >
          <Image src="/images/pgsql/add.svg" alt="pgsql" width={16} height={16} />
          <button className="ml-2">新建集群</button>
        </div>
      </div>
      {pgsqlLists?.data.items.length === 0 && (
        <div className={clsx(styles.empty)}>
          <Image src="/images/pgsql/empty.png" alt="pgsql" width={230} height={230} />
          <div className={styles.title}>当前集群列表为空</div>
          <div className={styles.desc}>点击右上角新建集群按钮,创建一个PostgreSQL集群吧~</div>
        </div>
      )}
      <div
        className={clsx(styles.scrollWrap, 'grow', curApp?.size === 'maxmin' ? 'mx-8' : 'mx-40 ')}
      >
        <div className={clsx('w-full  py-8 absolute')}>
          <div className="table w-full">
            <div className={styles.tableHeader}>
              <div className={styles.headerItem}>名字</div>
              <div className={clsx(styles.headerItem)}>状态</div>
              <div className={styles.headerItem}>创建时间</div>
              <div className={styles.headerItem}>CPU</div>
              <div className={styles.headerItem}>Memory</div>
              <div className={styles.headerItem}>Size</div>
              <div className={styles.headerItem}>操作</div>
            </div>
            <div className={styles.tableContent}>
              {pgsqlLists?.data.items?.map((item: PgsqlDetail) => {
                return (
                  <div
                    className={styles.tableRow}
                    key={item.metadata.uid}
                    onClick={() => getPgsql(item.metadata.name)}
                  >
                    <div className={styles.tableData}>
                      <div>{item.metadata.name}</div>
                    </div>
                    <div className={clsx(styles.tableData)}>
                      <div
                        className={clsx(
                          styles.pgsqlStatus,
                          styles[item.status?.PostgresClusterStatus || 'emptyStatus'],
                          'cursor-pointer'
                        )}
                        onClick={(e) => openEventDialog(e, item)}
                      >
                        <div className={styles.circle}></div>
                        <div className="px-1">{item.status?.PostgresClusterStatus}</div>
                        <Image src="/images/pgsql/shrink.svg" alt="pgsql" width={20} height={20} />
                      </div>
                    </div>
                    <div className={clsx(styles.tableData)}>
                      {formatTime(item?.metadata?.creationTimestamp, 'YYYY/MM/DD HH:mm:ss')}
                    </div>
                    <div className={styles.tableData}>{item.spec.resources.requests.cpu}</div>
                    <div className={styles.tableData}>{item.spec.resources.requests.memory}</div>
                    <div className={styles.tableData}>{item.spec.volume.size}</div>
                    <div className={styles.tableData}>
                      <div
                        className={clsx(styles.deleteBtn, 'cursor-pointer')}
                        onClick={(e) => openDeleteDialog(e, item)}
                      >
                        <Image src="/images/pgsql/delete.svg" alt="pgsql" width={16} height={16} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Drawer
        open={eventsDialogVisible}
        onCancel={() => setEventsDialogVisible(false)}
        direction="middle"
      >
        <PgsqlEventsDialog
          name={pgsqlName}
          onCancel={() => setEventsDialogVisible(false)}
          status={pgsqlStatus}
        />
      </Drawer>

      <DeletePgsqlDialog
        open={deletePgsqlVisible}
        onChangeOpen={(open: boolean) => {
          setDeletePgsqlVisible(open);
          setPgsqlListStatus('Pending');
        }}
        deleteName={pgsqlName}
      />

      <Drawer open={drawerVisible} onCancel={() => setDrawerVisible(false)} direction="right">
        <ClusterInfo
          detailName={pgsqlName}
          onCancel={() => setDrawerVisible(false)}
          openEventDialog={openEventDialog}
          openDeleteDialog={openDeleteDialog}
        />
        <Drawer
          open={eventsDialogVisible}
          onCancel={() => setEventsDialogVisible(false)}
          direction="middle"
        >
          <PgsqlEventsDialog
            name={pgsqlName}
            onCancel={() => setEventsDialogVisible(false)}
            status={pgsqlStatus}
          />
        </Drawer>
      </Drawer>
    </div>
  );
}

export default FrontPage;

import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import Image from 'next/image';
import { useState } from 'react';
import request from 'services/request';
import useAppStore from 'stores/app';
import useSessionStore from 'stores/session';
import { formatTime } from 'utils/format';
import ClusterInfo from './clusterInfo';
import Button from './components/button';
import DeletePgsqlDialog from './components/delete_dialog';
import Drawer from './components/drawer';
import PgsqlEventsDialog from './components/events_dialog';
import styles from './front_page.module.scss';
import { PageType, usePgSqlContext } from './index';
import { EPgsqlLists, EPgsqlStatus, TPgsqlDetail } from './pgsql_common';
import PgsqlStatus from './pgsql_status';

function FrontPage() {
  const { toPage } = usePgSqlContext();
  const { kubeconfig } = useSessionStore((state) => state.getSession());
  const [pgsqlListStatus, setPgsqlListStatus] = useState(EPgsqlLists.Pending);
  const [pgsqlName, setPgsqlName] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [deletePgsqlVisible, setDeletePgsqlVisible] = useState(false);
  const [eventsDialogVisible, setEventsDialogVisible] = useState(false);
  const [pgsqlStatus, setPgsqlStatus] = useState('');
  const { currentApp } = useAppStore();

  const {
    data: pgsqlLists,
    isSuccess,
    isError
  } = useQuery(
    ['getAllPgsql'],
    async () => {
      const res = await request.post('/api/pgsql/getAll', { kubeconfig });
      let allReady = res?.data.items?.every((item: TPgsqlDetail) => {
        return item?.status?.PostgresClusterStatus === 'Running';
      });
      if (allReady) {
        setPgsqlListStatus(EPgsqlLists.Running);
      }
      return res;
    },
    {
      refetchInterval: pgsqlListStatus === EPgsqlLists.Pending ? 10 * 1000 : false, //轮询时间
      enabled: pgsqlListStatus === EPgsqlLists.Pending // 只有 url 为 '' 的时候需要请求
    }
  );

  const getPgsql = (pgsqlName: string) => {
    setDrawerVisible(true);
    setPgsqlName(pgsqlName);
  };

  const openDeleteDialog = (e: React.MouseEvent<HTMLDivElement>, item: TPgsqlDetail) => {
    e.stopPropagation();
    setPgsqlName(item.metadata.name);
    setDeletePgsqlVisible(true);
  };

  const openEventDialog = (e: React.MouseEvent<HTMLDivElement>, item: TPgsqlDetail) => {
    e.stopPropagation();
    setEventsDialogVisible(true);
    setPgsqlName(item.metadata.name);
    setPgsqlStatus(
      item?.status?.PostgresClusterStatus
        ? item?.status?.PostgresClusterStatus
        : EPgsqlStatus.EmptyStatus
    );
  };
  return (
    <div className={clsx(styles.pgsqlFrontPage, 'w-full h-full flex flex-col')}>
      <div
        className={clsx(
          'flex pt-8 items-center',
          currentApp?.size === 'maxmin' ? 'px-8' : 'px-40 '
        )}
      >
        <div className={styles.logo}>
          <Image src="/images/pgsql/logo.svg" alt="pgsql" width={32} height={32} />
        </div>
        <div className={clsx(styles.frontTitle, 'ml-8')}>PostgreSQL 集群列表</div>
        <div className="ml-auto">
          <Button
            type="primary"
            icon="/images/pgsql/add.svg"
            handleClick={() => toPage(PageType.AddPage)}
          >
            <span className="ml-2">创建集群</span>
          </Button>
        </div>
      </div>
      {(isError || pgsqlLists?.data?.items?.length === 0) && (
        <div className={clsx(styles.empty)}>
          <Image src="/images/pgsql/empty_state.svg" alt="pgsql" width={240} height={240} />
          <div className={styles.title}>当前集群列表为空</div>
          <div className={styles.desc}>点击右上角新建集群按钮,创建一个PostgreSQL集群吧~</div>
        </div>
      )}
      {isSuccess && pgsqlLists?.data?.items?.length !== 0 && (
        <div
          className={clsx(
            'grow',
            styles.scrollWrap,
            currentApp?.size === 'maxmin' ? 'mx-8' : 'mx-40 '
          )}
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
                {pgsqlLists?.data.items?.map((item: TPgsqlDetail) => {
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
                        <PgsqlStatus pgsqlDetail={item} openEventDialog={openEventDialog} />
                      </div>
                      <div className={clsx(styles.tableData)}>
                        {formatTime(item?.metadata?.creationTimestamp, 'YYYY/MM/DD HH:mm:ss')}
                      </div>
                      <div className={styles.tableData}>{item.spec.resources.requests.cpu}</div>
                      <div className={styles.tableData}>{item.spec.resources.requests.memory}</div>
                      <div className={styles.tableData}>{item.spec.volume.size}</div>
                      <div className={styles.tableData}>
                        <Button
                          type="danger"
                          shape="round"
                          handleClick={(e) => openDeleteDialog(e, item)}
                          icon={'/images/pgsql/delete.svg'}
                        ></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

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
        isOpen={deletePgsqlVisible}
        onOpen={(open: boolean) => {
          setDeletePgsqlVisible(open);
          setPgsqlListStatus(EPgsqlLists.Pending);
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

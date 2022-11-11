import {
  Add16Filled,
  MoreHorizontal24Regular,
  Navigation20Filled,
  ArrowClockwise20Regular
} from '@fluentui/react-icons';
import clsx from 'clsx';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import request from 'services/request';
import useSessionStore from 'stores/session';
import { formatTime } from 'utils/format';
import styles from './front_page.module.scss';

type InfraInfo = {
  apiVersion: string;
  kind: string;
  metadata: { creationTimestamp: string; uid: string; name: string };
  spec: any;
  status: { connections: string; ssh: any; status: string };
};

type ClusterInfo = {
  apiVersion: string;
  kind: string;
  metadata: { creationTimestamp: string; uid: string; name: string };
  spec: { images: []; infra: string; ssh: any };
  status: { status: string };
};

type FrontPageComponent = {
  toDetailPageByName: (name: string) => void;
  toAddPage: () => void;
};

type StatusComponent = {
  infraStatus: string;
  clusterStatus: string;
};

const StatusComponent = ({ infraStatus, clusterStatus }: StatusComponent) => {
  const [status, setStatus] = useState('Pending');
  const colorStatus: any = {
    Pending: ['Pending', '创建中'],
    Running: ['Running', '运行中'],
    Start: ['Start', '启动中']
  };

  useEffect(() => {
    if (infraStatus === 'Pending') {
      setStatus('Pending');
    }
    if (infraStatus === 'Running' && clusterStatus === 'Running') {
      setStatus('Running');
    }
    if (infraStatus === 'Running' && clusterStatus === 'Pending') {
      setStatus('Start');
    }
    if (infraStatus === 'Running' && clusterStatus === undefined) {
      setStatus('Start');
    }
  }, [infraStatus, clusterStatus]);

  return (
    <div className={styles.status}>
      <div className={styles[`${colorStatus[status][0]}`]}></div>
      <div className={styles.right}>{colorStatus[status][1]}</div>
    </div>
  );
};

function FrontPage({ toDetailPageByName, toAddPage }: FrontPageComponent) {
  const [listItems, setListItems] = useState([]);
  const [allCluster, setAllCluster] = useState([] as any);
  const { kubeconfig } = useSessionStore((state) => state.getSession());
  const [refresh, setRefresh] = useState(true);

  useEffect(() => {
    const getAwsAll = async () => {
      const res = await request.post('/api/infra/awsGetAll', { kubeconfig });
      console.log(res, 'infra');
      if (res?.data?.items) {
        setListItems(res.data.items);
      }
    };

    const getClusters = async () => {
      const res = await request.post('/api/infra/getAllCluster', {
        kubeconfig
      });
      if (res?.data?.items) {
        setAllCluster(res.data.items);
      }
    };

    getAwsAll();
    getClusters();
  }, [kubeconfig, refresh]);

  return (
    <div className={clsx(styles.appWrap, 'flex h-full flex-col grow')}>
      <div className={clsx(styles.head, 'px-16')}>
        <Image src="/images/infraicon/infra_title.png" alt="infra" width={374} height={50} />
      </div>
      <div className="flex px-16 mt-12 justify-items-center items-center">
        <Navigation20Filled color="#616161" />
        <span className={styles.menu}>我的集群</span>
        <div
          className="ml-auto pr-4 cursor-pointer"
          onClick={() => {
            setRefresh((pre) => !pre);
          }}
        >
          <ArrowClockwise20Regular />
        </div>
        <button className={clsx(styles.btn)} onClick={() => toAddPage()}>
          <Add16Filled color="#FFFFFF" />
          <span> 创建集群</span>
        </button>
      </div>
      <div className={clsx(styles.restWindow, styles.pageScroll, styles.pageWrapper)}>
        {listItems.length > 0 && (
          <div className="space-y-6 w-full absolute box-border p-14 pt-6 mt-8">
            {listItems?.map((item: InfraInfo, index) => {
              return (
                <div
                  className={clsx(styles.frontItem)}
                  key={item?.metadata?.uid}
                  onClick={() => toDetailPageByName(item?.metadata?.name)}
                >
                  <Image
                    src="/images/infraicon/infra_cluster.png"
                    alt="infra"
                    width={40}
                    height={40}
                  />
                  <div className="ml-10">
                    <div className="flex">
                      <span className={styles.title}>{item?.metadata?.name}</span>
                      <StatusComponent
                        infraStatus={item?.status?.status}
                        clusterStatus={allCluster[index]?.status?.status}
                      />
                    </div>
                    <div className="text-gray-500 text-xl pt-2 space-x-6">
                      <span>ID: {item?.metadata?.uid ?? '------'} </span>
                      <span>
                        {formatTime(item?.metadata?.creationTimestamp, 'YYYY/MM/DD HH:mm')}
                      </span>
                    </div>
                  </div>
                  <div className={styles.right}>
                    <MoreHorizontal24Regular />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default FrontPage;

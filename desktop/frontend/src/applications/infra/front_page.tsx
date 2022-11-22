import {
  Add16Filled,
  ArrowClockwise20Regular,
  MoreHorizontal24Regular,
  Navigation20Filled
} from '@fluentui/react-icons';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import Image from 'next/image';
import { useState } from 'react';
import request from 'services/request';
import useSessionStore from 'stores/session';
import { formatTime } from 'utils/format';
import styles from './front_page.module.scss';
import { useScpContext, PageType } from './index';

type InfraInfo = {
  apiVersion: string;
  kind: string;
  metadata: { creationTimestamp: string; uid: string; name: string };
  spec: any;
  status: { connections: string; ssh: any; status: string };
};

type StatusComponent = {
  infraStatus: string;
  clusterStatus: string;
};

const StatusComponent = ({ infraStatus, clusterStatus }: StatusComponent) => {
  let status = 'Pending';
  const colorStatus: any = {
    Pending: { value: 'Pending', title: '创建中' },
    Running: { value: 'Running', title: '运行中' },
    Start: { value: 'Start', title: '启动中' }
  };

  if (infraStatus === 'Running') {
    status = 'Start';
  }

  if (infraStatus === 'Running' && clusterStatus === 'Running') {
    status = 'Running';
  }

  return (
    <div className={styles.status}>
      <div className={styles[`${colorStatus[status].value}`]}></div>
      <div className={styles.right}>{colorStatus[status].title}</div>
    </div>
  );
};

function FrontPage() {
  const { toPage } = useScpContext();
  const { kubeconfig } = useSessionStore((state) => state.getSession());
  const [scpStatus, setScpStatus] = useState('Pending');

  const { data: scpLists } = useQuery(
    ['getAwsAll'],
    async () => {
      const res = await request.post('/api/infra/awsGetAll', { kubeconfig });
      let allReady = res.data.items?.every((item: InfraInfo) => {
        return item.status.status === 'Running';
      });
      if (allReady) {
        setScpStatus('Running');
      }
      return res;
    },
    {
      refetchInterval: scpStatus === 'Pending' ? 15 * 1000 : false, //轮询时间
      enabled: scpStatus === 'Pending' // 只有 url 为 '' 的时候需要请求
    }
  );

  const { data: clusterLists } = useQuery(['getClusters'], async () => {
    const res = await request.post('/api/infra/getAllCluster', { kubeconfig });
    return res;
  });
  // console.log(scpLists, clusterLists, 'frontpage');

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
            setScpStatus('Pending');
          }}
        >
          <ArrowClockwise20Regular />
        </div>
        <button className={clsx(styles.btn)} onClick={() => toPage(PageType.AddPage, '')}>
          <Add16Filled color="#FFFFFF" />
          <span> 创建集群</span>
        </button>
      </div>
      <div className={clsx(styles.pageWrapperScroll)}>
        {scpLists?.data?.items?.length > 0 && (
          <div className="space-y-6 w-full absolute box-border p-14 pt-6 mt-8">
            {scpLists?.data?.items?.map((item: InfraInfo, index: number) => {
              return (
                <div
                  className={clsx(styles.frontItem)}
                  key={item?.metadata?.uid}
                  onClick={() => toPage(PageType.DetailPage, item?.metadata?.name)}
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
                        clusterStatus={clusterLists?.data?.items[index]?.status?.status}
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

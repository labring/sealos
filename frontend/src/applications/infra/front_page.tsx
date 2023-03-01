import { Spinner } from '@fluentui/react-components';
import { MoreHorizontal24Regular, Navigation20Filled } from '@fluentui/react-icons';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import Image from 'next/image';
import { useState } from 'react';
import request from 'services/request';
import useSessionStore from 'stores/session';
import { formatTime } from 'utils/format';
import styles from './front_page.module.scss';
import { PageType, useScpContext } from './index';
import StatusComponent from './scp_status';

type InfraInfo = {
  apiVersion: string;
  kind: string;
  metadata: { creationTimestamp: string; uid: string; name: string; deletionTimestamp: string };
  spec: any;
  status: { connections: string; ssh: any; status: string };
};

function FrontPage() {
  const { toPage } = useScpContext();
  const { kubeconfig } = useSessionStore((state) => state.getSession());
  const [scpStatus, setScpStatus] = useState('Pending');

  const { data: scpLists, isLoading } = useQuery(
    ['getAwsAll'],
    async () => {
      const res = await request.post('/api/infra/awsGetAll', { kubeconfig });
      let allReady = res.data.items?.every((item: InfraInfo) => {
        return item?.status?.status === 'Running';
      });
      if (allReady) {
        setScpStatus('Running');
      }
      return res;
    },
    {
      refetchInterval: scpStatus === 'Pending' ? 10 * 1000 : false, //轮询时间
      enabled: scpStatus === 'Pending' // 只有 url 为 '' 的时候需要请求
    }
  );

  const { data: clusterLists } = useQuery(['getClusters'], async () => {
    const res = await request.post('/api/infra/getAllCluster', { kubeconfig });
    return res;
  });

  const getClusterStatus = (infraName: string) => {
    const cluster = clusterLists?.data?.items.find(
      (item: InfraInfo) => item.metadata.name === infraName
    );
    return cluster ? cluster?.status?.status : 'Pending';
  };

  // console.log(scpLists, clusterLists, isLoading, 'frontpage');

  return (
    <div className={clsx(styles.appWrap, 'flex h-full flex-col grow')}>
      <div className={clsx(styles.head, 'px-16')}>
        <Image src="/images/infraicon/infra_title.png" alt="infra" width={374} height={50} />
      </div>
      <div className="flex px-16 pr-20 mt-12 justify-items-center items-center">
        <Navigation20Filled color="#616161" />
        <span className={styles.menu}>我的集群</span>
        <button
          className={clsx(styles.btn, 'ml-auto ')}
          onClick={() => toPage(PageType.AddPage, '')}
        >
          创建集群
        </button>
      </div>
      {isLoading && (
        <div className={'absolute inset-2/4'}>
          <Spinner />
        </div>
      )}
      <div className={clsx(styles.pageWrapperScroll)}>
        {scpLists?.data?.items?.length > 0 && (
          <div className="space-y-6 w-full absolute box-border p-14 px-16 pt-6 mt-8">
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
                        infraStatus={
                          item?.metadata?.deletionTimestamp ? 'Deleting' : item?.status?.status
                        }
                        clusterStatus={getClusterStatus(item.metadata.name)}
                      />
                    </div>
                    <div className="text-gray-500 text-xl pt-2 space-x-6">
                      <span>ID: {item?.metadata?.uid ?? '------'} </span>
                      <span>
                        {formatTime(item?.metadata?.creationTimestamp, 'YYYY/MM/DD HH:mm:ss')}
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

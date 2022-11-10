import { Add16Filled, MoreHorizontal24Regular, Navigation20Filled } from '@fluentui/react-icons';
import { Spinner } from '@fluentui/react-components';
import clsx from 'clsx';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import request from 'services/request';
import styles from './front_page.module.scss';
import useSessionStore from 'stores/session';
import { formatTime } from 'utils/format';
import { clearInterval } from 'timers';

interface Cluster {
  apiVersion: string;
  kind: string;
  metadata: { creationTimestamp: string; uid: string; name: string };
  spec: any;
  status: { connections: string; ssh: any; currStatus: string };
}

interface FrontPageComponent {
  action: (page: number) => void;
  toDetailByName: (name: string) => void;
  toAddPage: (name: string) => void;
}

function FrontPage({ action, toDetailByName, toAddPage }: FrontPageComponent) {
  const [listItems, setListItems] = useState([]);
  const { kubeconfig } = useSessionStore((state) => state.getSession());

  useEffect(() => {
    const getAwsAll = async () => {
      // let timer: any = null;
      const res = await request.post('/api/infra/awsGetAll', { kubeconfig });
      if (res?.data?.items) {
        setListItems(res.data.items);
        // res.data.items.forEach((item: Cluster) => {
        //   if (item?.status?.currStatus !== 'created') {
        //     if (timer) {
        //       return;
        //     }
        //     timer = setTimeout(getAwsAll, 3000);
        //   }
        // });
      }
    };
    getAwsAll();
  }, [kubeconfig]);

  return (
    <div className={clsx(styles.appWrap, 'flex h-full flex-col grow')}>
      <div className={clsx(styles.head, 'px-16')}>
        <Image src="/images/infraicon/infra_title.png" alt="infra" width={374} height={50} />
      </div>
      <div className="flex px-16 mt-12 justify-items-center items-center">
        <Navigation20Filled color="#616161" />
        <span className={styles.menu}>我的集群</span>
        <button className={clsx(styles.btn)} onClick={() => toAddPage('')}>
          <Add16Filled color="#FFFFFF" />
          <span> 创建集群</span>
        </button>
      </div>
      <div className={clsx(styles.restWindow, styles.pageScroll, styles.pageWrapper)}>
        {listItems.length > 0 && (
          <div className="space-y-6 w-full absolute box-border p-14 pt-6 mt-8">
            {listItems?.map((item: Cluster) => {
              return (
                <div
                  className={clsx(styles.frontItem)}
                  key={item?.metadata?.uid}
                  onClick={() => toDetailByName(item?.metadata?.name)}
                >
                  <Image
                    src="/images/infraicon/infra_cluster.png"
                    alt="infra"
                    width={40}
                    height={40}
                  />
                  <div className="ml-10">
                    <span className={styles.title}>{item?.metadata?.name}</span>
                    <div className="text-gray-500 text-xl pt-2 space-x-6">
                      <span>ID: {item?.metadata?.uid ?? '------'} </span>
                      <span>createTime: {formatTime(item?.metadata?.creationTimestamp)}</span>
                      <span>status: {item?.status?.currStatus ?? 'creating'}</span>
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

import React from 'react';
import useAppStore from 'stores/app';
import useSessionStore from 'stores/session';
import styles from './index.module.scss';
import Image from 'next/image';

import { useQuery } from '@tanstack/react-query';
import request from 'services/request';
import { formatMoney, formatTime } from 'utils/format';
import ChargeButton from './charge_button';
import { Divider, Link } from '@fluentui/react-components';
import download from 'utils/downloadFIle';

export default function StartMenu() {
  const { isHideStartMenu, toggleStartMenu } = useAppStore((s) => s);

  const session = useSessionStore((s) => s.session);
  const user = session?.user || {};

  const amount = useQuery(
    ['user-amount'],
    () => request.post('/api/kubernetes/account/get_amount', { kubeconfig: session.kubeconfig }),
    {
      enabled: !isHideStartMenu
    }
  );

  return (
    <>
      <div
        className={styles.bg}
        onClick={() => toggleStartMenu()}
        style={{
          display: isHideStartMenu ? 'none' : 'block'
        }}
      ></div>
      <div className={styles.widPaneCont} data-hide={isHideStartMenu}>
        <div className={styles.widPane + ' ltShad'}>
          <div className="flex flex-col items-center">
            <Image src={user?.avatar} alt="" width={90} height={90} className={styles.avatar} />

            <p className="text-3xl mb-4 mt-4">{user?.name}</p>

            <p className="text-slate-800 mb-4">角色：管理员</p>
            <p className="text-slate-700">上次登录：{formatTime(new Date().getTime())}</p>
            <div className="mt-4 w-full">
              <Divider appearance="brand"></Divider>
            </div>
            <div className="mt-6 mb-6 flex flex-1 w-full items-center justify-center">
              <span className="">余额：</span>
              <span className="mr-4 text-4xl text-orange-500 ">
                ￥{formatMoney(amount?.data?.data?.amount || 0)}
              </span>

              <ChargeButton />
            </div>

            <Link
              onClick={(e) => {
                e.preventDefault();
                download('kubeconfig.yaml', session.kubeconfig);
              }}
            >
              下载 kubeconfig.yaml
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

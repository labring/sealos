/* eslint-disable @next/next/no-img-element */
import React from 'react';
import useAppStore from 'stores/app';
import useSessionStore from 'stores/session';
import styles from './index.module.scss';

import { useQuery } from '@tanstack/react-query';
import request from 'services/request';
import { formatMoney } from 'utils/format';
import ChargeButton from './charge_button';
import { Divider, Link } from '@fluentui/react-components';
import download from 'utils/downloadFIle';
import { useRouter } from 'next/router';
import useLocalSession from 'hooks/useLocalSession';

export default function StartMenu() {
  const { isHideStartMenu, toggleStartMenu } = useAppStore((s) => s);

  const { delSession } = useSessionStore((s) => s);

  const { localSession } = useLocalSession();

  const router = useRouter();

  const amount = useQuery(
    ['user-amount'],
    () =>
      request.post('/api/kubernetes/account/get_amount', { kubeconfig: localSession.kubeconfig }),
    {
      enabled: !isHideStartMenu
    }
  );

  const logout = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    delSession();
    router.reload();
  };

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
            <img
              src={localSession?.user?.avatar || ''}
              alt=""
              width={90}
              height={90}
              className={styles.avatar}
            />

            <div className="text-3xl mb-4 mt-4">{localSession?.user?.name}</div>

            <div className="mt-4 w-full">
              <Divider appearance="brand"></Divider>
            </div>
            <div className="mt-6 mb-6 flex flex-1 w-full items-center justify-center">
              <span className="">余额：</span>
              <span className="mr-4 text-4xl text-orange-500 ">
                ￥{formatMoney(amount?.data?.data?.balance || 0)}
              </span>

              <ChargeButton />
            </div>

            <div className="mb-6 flex flex-1 w-full items-center justify-center">
              <Link
                onClick={(e) => {
                  e.preventDefault();
                  download('kubeconfig.yaml', localSession?.kubeconfig.toString());
                }}
              >
                下载 kubeconfig.yaml
              </Link>
              <div className="mx-6">
                <Link onClick={logout}>退出登录</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

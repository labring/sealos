import React, { useEffect, useState } from 'react';
import useAppStore from 'stores/app';
import useSessionStore from 'stores/session';
import styles from './index.module.scss';
import Image from 'next/image';

import { Button, Input, Link, Text } from '@fluentui/react-components';
import { QRCodeSVG } from 'qrcode.react';

import {
  Dialog,
  DialogBody,
  DialogTitle,
  DialogSurface,
  DialogActions,
  DialogTrigger,
  DialogContent
} from '@fluentui/react-dialog';

export default function StartMenu() {
  const { isHideStartMenu, toggleStartMenu } = useAppStore((s) => s);

  const session = useSessionStore((s) => s.session);

  const [user, setUser] = useState<any>({});
  useEffect(() => {
    if (session?.user.avatar) {
      setUser(session.user);
    }
  }, [session]);

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
        <div className={styles.widPane}>
          <div className="short0 ltShad">
            <div className="flex flex-row mb-6">
              <Image src={user?.avatar} alt="" width={90} height={90} className={styles.avatar} />
              <div className="ml-4 flex-1">
                <div className="flex justify-between">
                  <p className="text-3xl mb-2">{user.name}</p>
                  <div className="flex items-center">
                    <span className="">当前余额：</span>
                    <span className="mr-4 text-3xl text-orange-300">￥200.00</span>

                    <Dialog modalType="non-modal">
                      <DialogTrigger>
                        <Button onClick={() => toggleStartMenu()}>立即充值</Button>
                      </DialogTrigger>
                      <DialogSurface>
                        <DialogBody>
                          <DialogTitle>充值</DialogTitle>
                          <DialogContent>
                            <div className="flex flex-col items-center justify-center">
                              <div>
                                <span>金额： </span>
                                <Input
                                  size="large"
                                  contentBefore={<Text size={400}>￥</Text>}
                                  contentAfter={<Text size={400}>元</Text>}
                                />
                                <Link className="!ml-4">去充值</Link>
                              </div>

                              <div className=" mt-10">
                                <QRCodeSVG size={240} value="https://reactjs.org/" />
                                <p className="mt-4 text-slate-500 text-center">
                                  请使用微信扫码支付
                                </p>
                              </div>
                            </div>
                          </DialogContent>
                        </DialogBody>
                      </DialogSurface>
                    </Dialog>
                  </div>
                </div>
                <p className="text-slate-800 mb-2">角色：管理员</p>
                <p className="text-slate-800">上次登录：{new Date().getTime()}</p>
              </div>
            </div>
            <div className="">
              <h2 className="text-2xl mb-4">K8s 配置信息</h2>
              <pre
                className="bg-slate-300 p-6 rounded overflow-clip"
                style={{
                  background:
                    'linear-gradient(to bottom right, var(--clr1) 0%, var(--clrWeather) 80%)'
                }}
              >
                {session?.kubeconfig?.toString()}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

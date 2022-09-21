import React, { useEffect, useState } from 'react';
import useAppStore from 'stores/app';
import useSessionStore from 'stores/session';
import session from 'stores/session';
import styles from './index.module.scss';

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
              <img src={user?.avatar} alt="" width={90} className={styles.avatar} />
              <div className="ml-4">
                <p className="text-3xl mb-2">{user.name}</p>
                <p className="text-slate-500 mb-2">角色：管理员</p>
                <p className="text-slate-500">上次登录：{new Date().getTime()}</p>
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

/* eslint-disable @next/next/no-img-element */
import React, { useState } from 'react';
import Icon from '@/components/icons';
import styles from './index.module.scss';
import tabStyles from './tab.module.scss';
import clsx from 'clsx';
import useAppStore, { TApp } from 'stores/app';

export default function AppWindow(props: {
  style?: React.CSSProperties;
  app: TApp;
  children: any;
}) {
  const { closeApp } = useAppStore((state) => state);
  const [snap, setSnap] = useState(false);
  const wnapp = props.app;

  const openSnap = () => {
    setSnap(true);
  };

  const closeSnap = () => {
    setSnap(false);
  };

  const toolClick = () => {
    // dispatch({
    // 	type: props.app,
    // 	payload: "front",
    // });
  };

  const toolDrag = () => {
    console.log('tool drag');
  };

  return (
    <div
      className={clsx(tabStyles.floatTab, tabStyles.dpShad, 'lightWindow')}
      id={wnapp.icon + 'App'}
    >
      <div className={styles.windowHeader}>
        <div
          className={styles.toolbar}
          style={{
            background: wnapp.style?.bg || '#fff'
          }}
        >
          <div
            className={clsx(styles.topInfo, 'flex flex-grow items-center ml-4')}
            onClick={toolClick}
            onMouseDown={() => {
              console.log('toolDrag');
            }}
            data-op="0"
          >
            <img src={wnapp.icon} alt="" srcSet="" width={14} />
            <div className={(styles.appFullName, 'text-xss ml-2')}>{wnapp.name}</div>
          </div>
          <div className={clsx(styles.actbtns, 'flex items-center')}>
            <div className={styles.uicon}>
              <Icon click={props.app} payload="mnmz" src="minimize" width={12} />
            </div>

            <div
              className={clsx(styles.snapbox, 'h-full')}
              data-hv={snap}
              onMouseOver={openSnap}
              onMouseLeave={closeSnap}
            >
              <div className={styles.uicon}>
                <Icon
                  click={props.app}
                  width={12}
                  payload="mxmz"
                  src={wnapp.size == 'full' ? 'maximize' : 'maxmin'}
                />
              </div>
            </div>
            <div
              className={styles.uicon}
              onClick={() => {
                closeApp(wnapp.name);
              }}
            >
              <Icon className={styles.closeBtn} src="close" width={14} />
            </div>
          </div>
        </div>
        <div className={clsx(styles.resizecont, styles.topone)}>
          <div className="flex">
            <div
              className={clsx(styles.conrsz, styles['cursor-nw-resize'])}
              data-op="1"
              onMouseDown={toolDrag}
              data-vec="-1,-1"
            ></div>
            <div
              className={clsx(styles.edgrsz, styles['cursor-n-resize'], styles.wdws)}
              data-op="1"
              onMouseDown={toolDrag}
              data-vec="-1,0"
            ></div>
          </div>
        </div>
        <div className={clsx(styles.resizecont, styles.leftone)}>
          <div className="h-full">
            <div
              className={clsx(styles.edgrsz, styles['cursor-w-resize'], styles.hdws)}
              data-op="1"
              onMouseDown={toolDrag}
              data-vec="0,-1"
            ></div>
          </div>
        </div>
        <div className={clsx(styles.resizecont, styles.rightone)}>
          <div className="h-full">
            <div
              className={clsx(styles.edgrsz, styles['cursor-w-resize'], styles.hdws)}
              onMouseDown={toolDrag}
              data-vec="0,1"
            ></div>
          </div>
        </div>
        <div className={clsx(styles.resizecont, styles.bottomone)}>
          <div className="flex">
            <div
              className={clsx(styles.conrsz, styles['cursor-ne-resize'])}
              data-op="1"
              onMouseDown={toolDrag}
              data-vec="1,-1"
            ></div>
            <div
              className={clsx(styles.edgrsz, styles['cursor-n-resize'], styles.wdws)}
              data-op="1"
              onMouseDown={toolDrag}
              data-vec="1,0"
            ></div>
            <div
              className={clsx(styles.conrsz, styles['cursor-nw-resize'])}
              data-op="1"
              onMouseDown={toolDrag}
              data-vec="1,1"
            ></div>
          </div>
        </div>
      </div>

      <div className={clsx(tabStyles.windowScreen, 'flex flex-col')}>
        <div className="restWindow flex-grow flex flex-col">
          <div className="flex-grow overflow-hidden">{props.children}</div>
        </div>
      </div>
    </div>
  );
}

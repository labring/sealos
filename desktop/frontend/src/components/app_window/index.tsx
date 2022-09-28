/* eslint-disable @next/next/no-img-element */
import React, { useRef, useState } from 'react';
import Icon from 'components/icons';
import styles from './index.module.scss';
import tabStyles from './tab.module.scss';
import clsx from 'clsx';
import useAppStore, { TApp } from 'stores/app';
import Draggable from 'react-draggable';

export default function AppWindow(props: {
  style?: React.CSSProperties;
  app: TApp;
  children: any;
}) {
  const wnapp = props.app;

  const { closeApp, updateAppInfo, switchApp } = useAppStore((state) => state);
  const dragDom = useRef(null);
  const [snap, setSnap] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const openSnap = () => {
    setSnap(true);
  };

  const closeSnap = () => {
    setSnap(false);
  };

  return (
    <Draggable
      onStart={() => {
        setDragging(true);
      }}
      onDrag={(e, position) => {
        setPosition(position);
      }}
      onStop={() => {
        setDragging(false);
      }}
      handle=".windowHeader"
      nodeRef={dragDom}
      position={position}
    >
      <div
        ref={dragDom}
        className={clsx(tabStyles.floatTab, 'lightWindow', dragging ? tabStyles.notrans : '')}
        data-size={wnapp.size}
        data-hide={!wnapp.isShow}
        id={wnapp.icon + 'App'}
        style={{
          zIndex: wnapp.zIndex
        }}
      >
        <div className={'windowHeader'}>
          <div
            className={styles.toolbar}
            onClick={() => {
              switchApp(wnapp);
            }}
            style={{
              background: wnapp.style?.bg || '#fff'
            }}
          >
            <div className={clsx(styles.topInfo, 'flex flex-grow items-center ml-4')}>
              <img src={wnapp.icon} alt={wnapp.name} width={14} />
              <div className={(styles.appFullName, 'text-xss ml-2')}>{wnapp.name}</div>
            </div>
            <div className={clsx(styles.actbtns, 'flex items-center')}>
              <div
                className={styles.uicon}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  updateAppInfo({
                    ...wnapp,
                    size: 'minimize'
                  });
                }}
              >
                <Icon click={props.app} payload="mnmz" src="minimize" width={12} />
              </div>

              <div
                className={clsx(styles.snapbox, 'h-full')}
                data-hv={snap}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  updateAppInfo({
                    ...wnapp,
                    size: wnapp.size === 'maxmin' ? 'maximize' : 'maxmin'
                  });
                  setPosition({ x: 0, y: 0 });
                }}
                onMouseOver={openSnap}
                onMouseLeave={closeSnap}
              >
                <div className={styles.uicon}>
                  <Icon
                    click={props.app}
                    width={12}
                    payload="mxmz"
                    src={wnapp.size === 'maximize' ? 'maximize' : 'maxmin'}
                  />
                </div>
              </div>
              <div
                className={styles.uicon}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  updateAppInfo({
                    ...wnapp,
                    isShow: false
                  });
                  closeApp(wnapp.name);
                }}
              >
                <Icon className={styles.closeBtn} src="close" width={14} />
              </div>
            </div>
          </div>
          <div className={clsx(styles.resizecont, styles.topone)}>
            <div className="flex">
              <div className={clsx(styles.conrsz, styles['cursor-nw-resize'])} data-op="1"></div>
              <div
                className={clsx(styles.edgrsz, styles['cursor-n-resize'], styles.wdws)}
                data-op="1"
                data-vec="-1,0"
              ></div>
            </div>
          </div>
          <div className={clsx(styles.resizecont, styles.leftone)}>
            <div className="h-full">
              <div
                className={clsx(styles.edgrsz, styles['cursor-w-resize'], styles.hdws)}
                data-op="1"
                data-vec="0,-1"
              ></div>
            </div>
          </div>
          <div className={clsx(styles.resizecont, styles.rightone)}>
            <div className="h-full">
              <div
                className={clsx(styles.edgrsz, styles['cursor-w-resize'], styles.hdws)}
                data-vec="0,1"
              ></div>
            </div>
          </div>
          <div className={clsx(styles.resizecont, styles.bottomone)}>
            <div className="flex">
              <div
                className={clsx(styles.conrsz, styles['cursor-ne-resize'])}
                data-op="1"
                data-vec="1,-1"
              ></div>
              <div
                className={clsx(styles.edgrsz, styles['cursor-n-resize'], styles.wdws)}
                data-op="1"
                data-vec="1,0"
              ></div>
              <div
                className={clsx(styles.conrsz, styles['cursor-nw-resize'])}
                data-op="1"
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
    </Draggable>
  );
}

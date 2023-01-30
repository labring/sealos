/* eslint-disable @next/next/no-img-element */
import React, { useRef, useState } from 'react';
import Icon from 'components/icons';
import styles from './index.module.scss';
import tabStyles from './tab.module.scss';
import clsx from 'clsx';
import useAppStore, { TApp } from 'stores/app';
import Draggable, { DraggableEventHandler } from 'react-draggable';
import HelpDropDown from './help_dropdown';
import HelpDocs from './help_docs';

export default function AppWindow(props: {
  style?: React.CSSProperties;
  app: TApp;
  children: any;
  desktopHeight: number;
  desktopWidth: number;
}) {
  const { app: wnapp, desktopHeight, desktopWidth } = props;
  const { closeApp, updateAppInfo, switchApp, currentApp, openedApps } = useAppStore(
    (state) => state
  );
  const dragDom = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleDragBoundary: DraggableEventHandler = (e, position) => {
    const { x, y } = position;
    const appHeaderHeight = document.querySelector('.windowHeader')?.clientHeight || 30;
    if (currentApp?.size === 'maxmin') {
      let upperBoundary = -desktopHeight * 0.1;
      let lowerBoundary = desktopHeight * 0.9 - appHeaderHeight;
      setPosition({
        x: x,
        y: y < upperBoundary ? upperBoundary : y > lowerBoundary ? lowerBoundary : y
      });
    } else {
      setPosition({
        x: x,
        y: y < 0 ? 0 : y > desktopHeight - appHeaderHeight ? desktopHeight - appHeaderHeight : y
      });
    }
  };

  return (
    <Draggable
      onStart={() => {
        setDragging(true);
      }}
      onDrag={(e, position) => {
        setPosition(position);
      }}
      onStop={(e, position) => {
        handleDragBoundary(e, position);
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
            onClick={(e) => {
              switchApp({ ...wnapp, mask: false }, 'clickMask');
            }}
            style={{
              background: '#fff'
            }}
          >
            <div className={clsx(styles.topInfo, 'flex flex-grow items-center ml-4')}>
              <img src={wnapp.icon} alt={wnapp.name} width={14} />
              <div className={clsx('ml-2')} style={{ color: wnapp.menu?.nameColor }}>
                {wnapp.name}
              </div>
              {wnapp.menu?.helpDropDown && <HelpDropDown />}
              {wnapp.menu?.helpDocs && (
                <HelpDocs
                  url={typeof wnapp.menu?.helpDocs === 'string' ? wnapp.menu?.helpDocs : ''}
                />
              )}
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
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  updateAppInfo({
                    ...wnapp,
                    size: wnapp.size === 'maxmin' ? 'maximize' : 'maxmin',
                    cacheSize: wnapp.size === 'maxmin' ? 'maximize' : 'maxmin'
                  });
                  setPosition({ x: 0, y: 0 });
                }}
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
                className={clsx(styles.uicon)}
                data-type={'close'}
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
        </div>
        <div className={clsx(tabStyles.windowScreen, 'flex flex-col')}>
          <div className="restWindow flex-grow flex flex-col relative">
            <div className="flex-grow overflow-hidden">
              {wnapp.mask && (
                <div
                  className={styles.appMask}
                  onClick={() => {
                    switchApp({ ...wnapp, mask: false }, 'clickMask');
                  }}
                ></div>
              )}
              {props.children}
            </div>
          </div>
        </div>
      </div>
    </Draggable>
  );
}

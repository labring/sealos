import React, { useState } from 'react';
import SunIcon from '@/components/icons/SunIcon';
import styles from './index.module.scss';
import tabStyles from './tab.module.scss';
import clsx from 'clsx';
import defaultApps from '../desktop_content/deskApps';

export default function AppWindow(props: any) {
  const [snap, setSnap] = useState(false);
  const wnapp = defaultApps.apps.filter((app) => app.name === 'Spotify')[0];
  console.log(222, wnapp);

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
      className={clsx('settingsApp', tabStyles.floatTab, tabStyles.dpShad)}
      data-size={wnapp.size}
      data-max={wnapp.max}
      style={{
        ...(wnapp.size == 'cstm' ? wnapp.dim : null),
        zIndex: wnapp.z
      }}
      data-hide={false}
      id={wnapp.icon + 'App'}
    >
      <div className="window-header">
        <div
          className={styles.toolbar}
          data-float={props.float != null}
          data-noinvert={props.noinvert != null}
          style={{
            background: props.bg
          }}
        >
          <div
            className={clsx(styles.topInfo, 'flex flex-grow items-center')}
            data-float={props.float != null}
            onClick={toolClick}
            onMouseDown={() => {
              console.log('toolDrag');
            }}
            data-op="0"
          >
            <SunIcon src={props.icon} width={14} />
            <div className={(styles.appFullName, 'text-xss')} data-white={props.invert != null}>
              {props.name}
            </div>
          </div>
          <div className="actbtns flex items-center">
            <SunIcon
              invert={props.invert}
              click={props.app}
              payload="mnmz"
              pr
              src="minimize"
              ui
              width={12}
            />
            <div
              className={clsx(styles.snapbox, 'h-full')}
              data-hv={snap}
              onMouseOver={openSnap}
              onMouseLeave={closeSnap}
            >
              <SunIcon
                invert={props.invert}
                click={props.app}
                ui
                pr
                width={12}
                payload="mxmz"
                src={props.size == 'full' ? 'maximize' : 'maxmin'}
              />
              {/* <SnapScreen invert={props.invert} app={props.app} snap={snap} closeSnap={closeSnap} /> */}
              {/* {snap?<SnapScreen app={props.app} closeSnap={closeSnap}/>:null} */}
            </div>
            <SunIcon
              className={styles.closeBtn}
              invert={props.invert}
              click={props.app}
              payload="close"
              pr
              src="close"
              ui
              width={14}
            />
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
              data-op="1"
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

      <div className="window-content">{props.children}</div>
    </div>
  );
}

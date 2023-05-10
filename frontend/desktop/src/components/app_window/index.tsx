/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import useAppStore from '@/stores/app';
import useDesktopGlobalConfig from '@/stores/desktop';
import { Box, Flex } from '@chakra-ui/react';
import clsx from 'clsx';
import React, { useRef, useState } from 'react';
import Draggable, { DraggableEventHandler } from 'react-draggable';
import styles from './index.module.scss';

export default function AppWindow(props: {
  style?: React.CSSProperties;
  pid: number;
  children: any;
}) {
  const { pid } = props;
  const desktopHeight = useDesktopGlobalConfig((state) => state.desktopHeight);
  const {
    closeAppById,
    updateOpenedAppInfo,
    setToHighestLayerById,
    currentApp,
    currentAppPid,
    findAppInfoById,
    maxZIndex
  } = useAppStore();
  const wnapp = findAppInfoById(pid);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragDom = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  if (!wnapp) return null;

  const handleDragBoundary: DraggableEventHandler = (e, position) => {
    const { x, y } = position;
    const appHeaderHeight = dragDom.current?.querySelector('.windowHeader')?.clientHeight || 30;
    const appHeaderWidth = dragDom.current?.querySelector('.windowHeader')?.clientWidth || 3000;

    if (currentApp()?.size === 'maxmin') {
      let upperBoundary = -desktopHeight * 0.1;
      let lowerBoundary = desktopHeight * 0.9 - appHeaderHeight;
      setPosition({
        x:
          x < 0
            ? x < -1.1 * appHeaderWidth // (0.8width + width/0.6*0.2)
              ? 0
              : x
            : x > 1.1 * appHeaderWidth
            ? 0
            : x,
        y: y < upperBoundary ? upperBoundary : y > lowerBoundary ? 0 : y
      });
    } else {
      setPosition({
        x: x < 0 ? (x < -0.8 * appHeaderWidth ? 0 : x) : x > 0.8 * appHeaderWidth ? 0 : x,
        y: y < 0 ? 0 : y > desktopHeight - appHeaderHeight ? 0 : y
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
      position={position}
    >
      <div
        ref={dragDom}
        className={clsx(styles.windowContainer, dragging ? styles.notrans : '')}
        data-size={wnapp?.size}
        data-hide={!wnapp?.isShow}
        id={wnapp?.icon + 'App'}
        style={{
          zIndex: wnapp?.zIndex
        }}
      >
        {/* app window header */}
        <Flex
          cursor={'pointer'}
          h="28px"
          background={'#F7F8FA'}
          className={'windowHeader'}
          borderRadius={'6px 6px 0 0'}
          onDoubleClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            updateOpenedAppInfo({
              ...wnapp,
              size: wnapp?.size === 'maxmin' ? 'maximize' : 'maxmin',
              cacheSize: wnapp?.size === 'maxmin' ? 'maximize' : 'maxmin'
            });
            setPosition({ x: 0, y: 0 });
          }}
        >
          <Flex ml="16px" alignItems={'center'}>
            <img src={wnapp?.icon} alt={wnapp?.name} width={14} />
            <Box ml="8px" color={wnapp?.menuData?.nameColor} fontSize={'12px'} fontWeight={400}>
              {wnapp?.name}
            </Box>
          </Flex>
          <Flex ml={'auto'}>
            <Box
              className={styles.uicon}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                updateOpenedAppInfo({
                  ...wnapp,
                  size: 'minimize',
                  cacheSize: wnapp.size
                });
              }}
            >
              <img src="/icons/minimize.png" width={12} />
            </Box>
            <Box
              className={styles.uicon}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                updateOpenedAppInfo({
                  ...wnapp,
                  size: wnapp?.size === 'maxmin' ? 'maximize' : 'maxmin',
                  cacheSize: wnapp?.size === 'maxmin' ? 'maximize' : 'maxmin'
                });
                setPosition({ x: 0, y: 0 });
              }}
            >
              <img
                src={wnapp.size === 'maximize' ? '/icons/maximize.png' : '/icons/maxmin.png'}
                width={12}
              />
            </Box>
            <Box
              className={clsx(styles.uicon)}
              data-type={'close'}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                updateOpenedAppInfo({
                  ...wnapp,
                  isShow: false
                });
                closeAppById(currentAppPid);
              }}
            >
              <img src={'/icons/close.png'} width={12} />
            </Box>
          </Flex>
        </Flex>
        {/* app switch mask */}
        <div
          className={styles.appMask}
          onClick={() => {
            setToHighestLayerById(pid);
          }}
          style={{ pointerEvents: wnapp.zIndex !== maxZIndex ? 'unset' : 'none' }}
        ></div>
        {/* app window content */}
        <Flex flexGrow={1} overflow={'hidden'} borderRadius={'0 0 6px 6px'} position={'relative'}>
          {dragging && (
            <Box
              position={'absolute'}
              w="100%"
              h="100%"
              background={'transparent'}
              zIndex={8888}
            ></Box>
          )}
          {props.children}
        </Flex>
      </div>
    </Draggable>
  );
}

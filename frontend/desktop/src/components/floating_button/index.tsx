import useAppStore, { AppInfo } from '@/stores/app';
import { useConfigStore } from '@/stores/config';
import { useDesktopConfigStore } from '@/stores/desktopConfig';
import { APPTYPE } from '@/types';
import { Box, Flex, Image, useDisclosure } from '@chakra-ui/react';
import clsx from 'clsx';
import { MouseEvent, useMemo, useState } from 'react';
import { Menu, useContextMenu } from 'react-contexify';
import Draggable, { DraggableEventHandler } from 'react-draggable';
import Iconfont from '../iconfont';
import styles from './index.module.scss';
import dockStyles from '@/components/AppDock/index.module.css';
import { useTranslation } from 'next-i18next';

enum Suction {
  None,
  Left = 'left',
  Right = 'right'
}

const Floating_Button_Menu_Id = 'Floating_Button_Menu_Id';

export default function FloatingButton() {
  const { t } = useTranslation();
  const {
    installedApps: apps,
    runningInfo,
    setToHighestLayerById,
    currentAppPid,
    switchAppById,
    updateOpenedAppInfo
  } = useAppStore();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [endPosition, setEndPosition] = useState({ x: 0, y: 0 });
  const [suction, setSuction] = useState(Suction.None);
  const [lockSuction, setLockSuction] = useState(true);
  const { isAppBar, toggleShape } = useDesktopConfigStore();
  const { show } = useContextMenu({
    id: Floating_Button_Menu_Id
  });
  const [isRightClick, setIsRightClick] = useState(false);

  // Hover Ball Menu
  const AppMenuLists: AppInfo[] = [
    {
      name: 'home',
      icon: '/icons/home.svg',
      zIndex: 99999,
      isShow: true,
      pid: -9,
      size: 'maxmin',
      cacheSize: 'maxmin',
      style: {},
      mouseDowning: false,
      key: `system-sealos-home`,
      type: APPTYPE.IFRAME,
      data: {
        url: '',
        desc: ''
      },
      displayType: 'hidden'
    },
    ...runningInfo
  ];

  const logo = useConfigStore().layoutConfig?.logo;

  const [degree, contentSkewDegree, contentRotateDegree] = useMemo(() => {
    const len = apps?.length < 6 ? 6 : apps?.length > 8 ? 8 : apps?.length;
    const temp: number = 360 / len;
    const skewDegree = -(90 - temp);
    const rotateDegree = -(90 - temp / 2);
    return [temp, skewDegree, rotateDegree];
  }, [apps.length]);

  if (apps?.length === 0) return null;

  // Determine whether to drag or click
  const handleCenterButton = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const d = Math.sqrt(
      (startPosition.x - endPosition.x) * (startPosition.x - endPosition.x) +
        (startPosition.y - endPosition.y) * (startPosition.y - endPosition.y)
    );
    if (d <= 5) {
      return isOpen ? onClose() : onOpen();
    }
  };

  // Calculate the correct orientation of the icon
  const calculateDegree = (index: number) => {
    const temp = -(degree * index + contentRotateDegree);
    return `rotate(${temp}deg)`;
  };

  // drag boundary calculation
  const handleDragBoundary: DraggableEventHandler = (e, position) => {
    try {
      setLockSuction(true);
      const { x, y } = position;
      const browserWidth = window.innerWidth;
      const browserHeight = window.innerHeight;
      const floatButtonNav = document?.getElementById('floatButtonNav');
      if (!floatButtonNav) return;

      const distanceLeft = floatButtonNav.getBoundingClientRect().left;
      const floatButtonNavWidth = floatButtonNav.clientHeight || 64;
      const floatButtonNavHeight = floatButtonNav.clientHeight || 64;
      // 120 is absolute positioning; 10 Boundary distance;
      const leftBoundary = -browserWidth + floatButtonNavWidth + 120 + 10;
      const rightBoundary = 120 - 10;
      const topBoundary = -browserHeight + floatButtonNavHeight + 120;
      const bottomBoundary = 120;
      const isLeft = distanceLeft < browserWidth / 2;

      setPosition({
        x: x < leftBoundary ? leftBoundary : x > rightBoundary ? rightBoundary : x,
        y: y < topBoundary ? topBoundary : y > bottomBoundary ? bottomBoundary : y
      });

      // The method of dealing with suction edge
      const handleSuction = (suction: Suction) => {
        onClose();
        setSuction(suction);
        setTimeout(() => {
          setLockSuction(false);
        }, 1000);
      };
      // Handle the suction edge
      x < leftBoundary
        ? handleSuction(Suction.Left)
        : x > rightBoundary
        ? handleSuction(Suction.Right)
        : null;
    } catch (error) {
      console.log(error);
    }
  };

  // Handle icon click event
  const handleNavItem = (e: MouseEvent<HTMLDivElement>, item: AppInfo) => {
    if (item.key === 'system-sealos-home') {
      const isNotMinimized = runningInfo.some((item) => item.size !== 'minimize');
      runningInfo.forEach((item) => {
        updateOpenedAppInfo({
          ...item,
          size: isNotMinimized ? 'minimize' : item.cacheSize
        });
      });
      return;
    }

    if (item.pid === currentAppPid && item.size !== 'minimize') {
      updateOpenedAppInfo({
        ...item,
        size: 'minimize',
        cacheSize: item.size
      });
    } else {
      switchAppById(item.pid);
    }
  };

  const displayMenu = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsRightClick(true);
    onClose();
    show({
      event: e,
      position: {
        // @ts-ignore
        x: '-65%',
        // @ts-ignore
        y: '-80%'
      }
    });
  };

  return (
    <>
      <Draggable
        onStart={(e, position) => {
          setDragging(true);
          setStartPosition(position);
        }}
        onDrag={(e, position) => {
          setPosition(position);
        }}
        onStop={(e, position) => {
          handleDragBoundary(e, position);
          setEndPosition(position);
          setDragging(false);
        }}
        handle="#centerButton"
        position={position}
      >
        <div
          onContextMenu={(e) => displayMenu(e)}
          id="floatButtonNav"
          className={clsx(styles.container, 'floatButtonNav', dragging ? styles.notrans : '')}
          data-open={isOpen}
          onMouseEnter={(e) => {
            if (suction !== Suction.None) return;
            if (isRightClick) return;
            onOpen();
          }}
          onMouseLeave={(e) => {
            if (suction !== Suction.None) return;
            onClose();
          }}
        >
          <div
            className={clsx(styles.floatBtn, dragging ? styles.notrans : '')}
            data-suction={suction}
          >
            <div className={styles.innerBtn}>
              <div
                id="centerButton"
                className={styles.centerBtn}
                onClick={handleCenterButton}
              ></div>
            </div>
          </div>

          {/* menu */}
          <Box
            className={styles.cricleNav}
            data-open={isOpen}
            userSelect={'none'}
            style={{ display: suction === Suction.None ? 'block' : 'none' }}
          >
            {AppMenuLists?.map((item: AppInfo, index: number) => {
              return (
                <Box
                  cursor={'pointer'}
                  className={styles.navItem}
                  color={'white'}
                  key={item?.name}
                  transform={
                    isOpen
                      ? `rotate(${degree * (index + 1)}deg) skew(${90 - degree}deg)`
                      : `rotate(75deg) skew(60deg)`
                  }
                  _hover={{ bg: 'rgba(88,90,93,0.5)' }}
                  onClick={(e) => handleNavItem(e, item)}
                >
                  <Flex
                    justifyContent={'center'}
                    pt="12px"
                    className={styles.subItem}
                    // The icon is perpendicular to the center of the circle
                    transform={`skew(${contentSkewDegree}deg) rotate(${contentRotateDegree}deg)`}
                  >
                    <Flex
                      w="40px"
                      h="40px"
                      background={currentAppPid === item.pid ? 'rgba(244, 246, 248, 0.6)' : ''}
                      borderRadius={'50%'}
                      justifyContent={'center'}
                      alignItems={'center'}
                    >
                      <Flex
                        w="32px"
                        h="32px"
                        backgroundColor={'rgba(244, 246, 248, 0.9)'}
                        border={'1px solid #FFFFFF'}
                        borderRadius={'50%'}
                        boxShadow={'0px 0.5px 1px rgba(0, 0, 0, 0.2)'}
                        justifyContent={'center'}
                        alignItems={'center'}
                        // The icon is perpendicular to the x-axis of the page
                        transform={calculateDegree(index + 1)}
                      >
                        <Image
                          src={item?.icon}
                          fallbackSrc={logo || '/logo.svg'}
                          alt={item?.name}
                          w="24px"
                          h="24px"
                        />
                      </Flex>
                    </Flex>
                  </Flex>
                </Box>
              );
            })}
          </Box>
          {/* Button Suction State */}
          <Flex
            alignItems={'center'}
            justifyContent={suction === Suction.Left ? 'end' : 'start'}
            userSelect={'none'}
            className={styles.suctionState}
            data-suction={suction}
            onClick={() => {
              onClose();
              setSuction(Suction.None);
            }}
            onMouseEnter={() => {
              if (!lockSuction) {
                setSuction(Suction.None);
              }
            }}
          >
            <Iconfont
              iconName={suction === Suction.Left ? 'icon-more-left' : 'icon-more-right'}
              color="#FFFFFF"
              width={24}
              height={24}
            />
          </Flex>
          <Menu className={dockStyles.contexify} id={Floating_Button_Menu_Id}>
            <>
              <Box
                cursor={'pointer'}
                p={'4px'}
                _hover={{
                  bg: 'rgba(17, 24, 36, 0.10)'
                }}
                onClick={toggleShape}
                borderRadius={'4px'}
              >
                {t('common:toggle_app_bar')}
                <div className={dockStyles.arrow}></div>
              </Box>
            </>
          </Menu>
        </div>
      </Draggable>
      {dragging && (
        <Box position={'absolute'} top={0} left={0} w="100%" h="100%" zIndex={8888}></Box>
      )}
    </>
  );
}

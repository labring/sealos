import useAppStore from '@/stores/app';
import { useConfigStore } from '@/stores/config';
import { TApp, displayType } from '@/types';
import {
  Box,
  Flex,
  Grid,
  Image,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalBody,
  Center,
  useBreakpointValue
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import {
  DragEventHandler,
  MouseEvent,
  MouseEventHandler,
  ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { useAppDisplayConfigStore } from '@/stores/appDisplayConfig';
import styles from './index.module.scss';
import { ArrowRight, Volume2 } from 'lucide-react';
import { useGuideModalStore } from '@/stores/guideModal';
import { currentDriver, destroyDriver } from '../account/driver';

const AppItem = ({
  app,
  onClick,
  onDragStart,
  onDragEnd
}: {
  app: TApp;
  onClick?: (e: MouseEvent<HTMLDivElement>, app: TApp) => void;
  onDragStart?: DragEventHandler<HTMLDivElement>;
  onDragEnd?: DragEventHandler<HTMLDivElement>;
}) => {
  const { i18n } = useTranslation();
  const fallbackIcon = useConfigStore().layoutConfig?.logo || '/logo.svg';

  return (
    <Flex
      draggable={
        !['system-devbox', 'system-applaunchpad', 'system-template', 'system-dbprovider'].includes(
          app.key
        )
      }
      flexDirection={'column'}
      justifyContent={'flex-start'}
      alignItems={'center'}
      userSelect="none"
      cursor={'pointer'}
      className={app.key}
      onClick={(e) => {
        if (onClick) {
          onClick(e, app);
        }
      }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <Center
        w={{ base: '64px', md: '78px' }}
        h={{ base: '64px', md: '78px' }}
        borderRadius={{ base: '20px', md: '24px' }}
        border={'1px solid rgba(0, 0, 0, 0.05)'}
        boxShadow={'0px 5.634px 8.451px -1.69px rgba(0, 0, 0, 0.05)'}
        transition="transform 0.2s ease"
        overflow={'hidden'}
        _hover={{ transform: 'scale(1.05)' }}
      >
        <Image
          w={app.key.startsWith('user-') ? '60px' : '100%'}
          h={app.key.startsWith('user-') ? '60px' : '100%'}
          src={app?.icon}
          fallbackSrc={fallbackIcon}
          draggable={false}
          alt="app logo"
        />
      </Center>
      <Text
        mt="12px"
        color={'primary'}
        fontSize={'14px'}
        fontWeight={500}
        textAlign={'center'}
        lineHeight={'18px'}
      >
        {app?.i18n?.[i18n?.language]?.name ? app?.i18n?.[i18n?.language]?.name : app?.name}
      </Text>
    </Flex>
  );
};

const AppGrid = ({
  children,
  gridGap,
  appHeight
}: {
  children: ReactNode;
  gridGap?: number;
  appHeight?: number;
}) => {
  return (
    <Grid
      flexShrink={0}
      flexGrow={0}
      flexBasis={'100%'}
      alignContent={'center'}
      overflow={'hidden'}
      gap={`${gridGap}px`}
      templateColumns={{
        base: 'repeat(4, 1fr)',
        md: 'repeat(5, 1fr)'
      }}
      templateRows={`repeat(auto-fill, ${appHeight}px)`}
      className="apps-container"
    >
      {children}
    </Grid>
  );
};

const AppGridPagingContainer = ({
  children,
  gridGap,
  appHeight,
  totalPages,
  currentPage,
  onChange
}: {
  children: ReactNode;
  gridGap: number;
  appHeight: number;
  totalPages: number;
  currentPage: number;
  onChange: (currentPage: number, pageSize: number) => void;
}) => {
  const gridWrapperRef = useRef<HTMLDivElement>(null);

  const columns = useBreakpointValue({
    base: 4,
    md: 5
  });

  const [scrollPosition, setGridScrollPosition] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  const calculateItemsPerPage = useCallback(() => {
    if (!gridWrapperRef.current) return 8;

    const height = gridWrapperRef.current.clientHeight;
    const rows = Math.floor((height + gridGap) / (appHeight + gridGap));

    return rows * columns!;
  }, [columns, gridGap, appHeight]);

  const changePageInGrid = useCallback(
    (pageIndex: number) => {
      if (!gridWrapperRef.current) return;

      const targetPage = pageIndex < 0 ? 0 : pageIndex >= totalPages ? totalPages - 1 : pageIndex;

      const gridWidth = gridWrapperRef.current.scrollWidth / totalPages;
      const scrollLeft = targetPage * gridWidth;
      setGridScrollPosition(scrollLeft);
    },
    [totalPages]
  );

  // Calculate items per page and scroll position on initial render and on screen size changes
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        setItemsPerPage(calculateItemsPerPage());
      }, 200);
    };

    handleResize();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(debounceTimer);
    };
  }, [columns, calculateItemsPerPage, changePageInGrid]);

  // Change scroll position when currentPage changes and when screen size changes
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        changePageInGrid(currentPage);
      }, 50);
    };

    changePageInGrid(currentPage);

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [currentPage, changePageInGrid, totalPages]);

  // Call onChange callback when something changes
  useEffect(() => {
    onChange(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage, onChange]);

  return (
    <Flex
      ref={gridWrapperRef}
      h="full"
      w="full"
      transform={`translateX(-${scrollPosition}px)`}
      transition="transform 0.3s ease-out"
    >
      {children}
    </Flex>
  );
};

const MoreAppsFolder = ({
  apps,
  onClick,
  onDrop
}: {
  apps: TApp[];
  onClick?: MouseEventHandler<HTMLDivElement>;
  onDrop?: DragEventHandler<HTMLDivElement>;
}) => {
  const folderIconRef = useRef<HTMLDivElement>(null);

  const fallbackIcon = useConfigStore().layoutConfig?.logo || '/logo.svg';

  const handleDragOverFolder = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (folderIconRef.current) {
      folderIconRef.current.classList.add(styles.folderPulse);
    }
  };

  const handleDragLeaveFolder = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (folderIconRef.current) {
      folderIconRef.current.classList.remove(styles.folderPulse);
    }
  };

  const handleDropOnFolder = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (folderIconRef.current) {
      folderIconRef.current.classList.remove(styles.folderPulse);
    }
  };

  return (
    <Center alignItems={'flex-start'}>
      <Flex
        flexDirection={'column'}
        alignItems={'center'}
        w={{ base: '64px', md: '78px' }}
        h={{ base: '64px', md: '78px' }}
        userSelect="none"
        cursor={'pointer'}
        className="more-apps-folder"
        onClick={onClick}
      >
        <Box
          w="100%"
          h="100%"
          ref={folderIconRef}
          borderRadius={{ base: '20px', md: '24px' }}
          backgroundColor={'#EDEDED'}
          position="relative"
          transition="all 0.3s ease"
          _hover={{ transform: 'scale(1.05)' }}
          onDragOver={handleDragOverFolder}
          onDragLeave={handleDragLeaveFolder}
          onDrop={(e) => {
            handleDropOnFolder(e);

            if (onDrop) {
              onDrop(e);
            }
          }}
        >
          <Grid
            templateColumns="repeat(2, 1fr)"
            templateRows="repeat(2, 1fr)"
            width="100%"
            height="100%"
            p="4px"
            gap="4px"
          >
            {apps.length > 0
              ? apps.slice(0, 4).map((app, idx) => (
                  <Box
                    key={idx}
                    width={{ base: '26px', md: '30px' }}
                    height={{ base: '26px', md: '30px' }}
                    overflow="hidden"
                    bg="white"
                    borderRadius={'10px'}
                    boxShadow={'0px 5.634px 8.451px -1.69px rgba(0, 0, 0, 0.05)'}
                    draggable={false}
                  >
                    <Image
                      width="100%"
                      height="100%"
                      src={app?.icon}
                      fallbackSrc={fallbackIcon}
                      objectFit="contain"
                      alt="app icon"
                    />
                  </Box>
                ))
              : Array(4)
                  .fill(null)
                  .map((_, idx) => (
                    <Box
                      key={idx}
                      width="100%"
                      height="100%"
                      overflow="hidden"
                      borderRadius="10px"
                      border={'1px dashed rgba(0, 0, 0, 0.10)'}
                      bg="white"
                    />
                  ))}
          </Grid>
        </Box>
      </Flex>
    </Center>
  );
};

const PageSwitcher = ({
  pages,
  current,
  onChange
}: {
  pages: number;
  current: number;
  onChange: (target: number) => void;
}) => {
  return (
    <Flex justifyContent="center" alignItems="center" gap="8px">
      {Array.from({ length: pages }).map((_, index) => (
        <Box
          key={index}
          w="12px"
          h="12px"
          borderRadius="50%"
          bg={index === current ? 'gray.400' : 'gray.200'}
          cursor="pointer"
          onClick={() => onChange(index)}
          _hover={{ bg: index === current ? 'gray.400' : 'gray.300' }}
        />
      ))}
    </Flex>
  );
};

export default function Apps() {
  const { t, i18n } = useTranslation();
  const { installedApps, openApp, openDesktopApp } = useAppStore();
  const { appDisplayConfigs, updateAppDisplayType } = useAppDisplayConfigStore();
  const logo = useConfigStore().layoutConfig?.logo || '/logo.svg';
  const { layoutConfig, authConfig } = useConfigStore();
  const [draggedApp, setDraggedApp] = useState<TApp | null>(null);
  const [draggedFromFolder, setDraggedFromFolder] = useState(false);
  const [moreAppsFolder, setMoreAppsFolder] = useState<TApp[]>([]);
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [folderPosition, setFolderPosition] = useState({ top: 0, left: 0 });

  const [isDraggingOutside, setIsDraggingOutside] = useState(false);
  const { openGuideModal } = useGuideModalStore();
  const desktopRef = useRef<HTMLDivElement>(null);
  const folderRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  const appHeight = 128;
  const gridGap = 8;

  const [itemsPerPageInGrid, setItemsPerPageInGrid] = useState(0);
  const [totalPagesInGrid, setTotalPagesInGrid] = useState(0);
  const [currentPageInGrid, setCurrentPageInGrid] = useState(0);

  const [itemsPerPageInFolder, setItemsPerPageInFolder] = useState(0);
  const [totalPagesInFolder, setTotalPagesInFolder] = useState(0);
  const [currentPageInFolder, setCurrentPageInFolder] = useState(0);

  const getAppDisplayType = useCallback(
    (app: TApp): displayType => {
      return appDisplayConfigs[app.key] || app.displayType;
    },
    [appDisplayConfigs]
  );

  const renderApps = useMemo(() => {
    return installedApps.filter((app) => getAppDisplayType(app) === 'normal');
  }, [installedApps, getAppDisplayType]);

  const moreApps = useMemo(() => {
    return installedApps.filter((app) => getAppDisplayType(app) === 'more');
  }, [installedApps, getAppDisplayType]);

  const gridPages = useMemo(() => {
    const getPageInGrid = (pageIndex: number) => {
      const start = pageIndex * itemsPerPageInGrid;
      const end = start + itemsPerPageInGrid;
      return renderApps.slice(start, end);
    };

    return Array.from({ length: totalPagesInGrid }).map((_, index) => getPageInGrid(index));
  }, [renderApps, itemsPerPageInGrid, totalPagesInGrid]);

  const folderPages = useMemo(() => {
    const getPageInFolder = (pageIndex: number) => {
      const start = pageIndex * itemsPerPageInFolder;
      const end = start + itemsPerPageInFolder;
      return moreApps.slice(start, end);
    };

    return Array.from({ length: totalPagesInFolder }).map((_, index) => getPageInFolder(index));
  }, [moreApps, itemsPerPageInFolder, totalPagesInFolder]);

  const { isDriverActive } = useGuideModalStore();

  const handleAppClick = (e: MouseEvent<HTMLDivElement>, item: TApp) => {
    console.log(item, 'item', isDriverActive);
    if (isDriverActive) {
      const guidedElements = [
        'system-devbox',
        'system-applaunchpad',
        'system-template',
        'system-dbprovider'
      ];
      if (guidedElements.includes(item.key)) {
        if (openDesktopApp) {
          openDesktopApp({
            appKey: item.key,
            pathname:
              item.key === 'system-applaunchpad' || item.key === 'system-dbprovider'
                ? '/redirect'
                : '/',
            query: {
              action: 'guide'
            },
            messageData: {},
            appSize: 'maximize'
          });
        }
        if (currentDriver) {
          destroyDriver();
        }
        return;
      }
    }

    e.preventDefault();
    closeFolder();
    if (item?.name) {
      openApp(item);
    }
  };

  const handleMoreAppsClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();

    if (e.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect();
      setFolderPosition({
        top: rect.bottom + 10,
        left: rect.left
      });
    }

    setIsFolderOpen(true);
    setMoreAppsFolder(moreApps);
  };

  const closeFolder = () => {
    setIsFolderOpen(false);
    setCurrentPageInFolder(0);
  };

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    app: TApp,
    source: 'desktop' | 'folder'
  ) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ app, source }));
    setDraggedApp(app);

    if (source === 'folder') {
      setDraggedFromFolder(true);
    }
  };

  const handleDragEnd = () => {
    setDraggedApp(null);
    setDraggedFromFolder(false);
    setIsDraggingOutside(false);

    // ! =========================================================
    // if (folderIconRef.current) {
    // folderIconRef.current.classList.remove(styles.folderPulse);
    // }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    if (draggedFromFolder) {
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      if (modalContentRef.current) {
        const rect = modalContentRef.current.getBoundingClientRect();
        const isOutside =
          mouseX < rect.left - 5 ||
          mouseX > rect.right + 5 ||
          mouseY < rect.top - 5 ||
          mouseY > rect.bottom + 5;

        if (isOutside) {
          closeFolder();
        }
        setIsDraggingOutside(isOutside);
      }
    }
  };

  const handleDesktopDrop = (e: React.DragEvent<HTMLDivElement>) => {
    console.log('handleDesktopDrop');

    e.preventDefault();

    try {
      const data: { app: TApp; source: 'desktop' | 'folder' } = JSON.parse(
        e.dataTransfer.getData('application/json')
      );

      if (data && data.app) {
        console.log(data.source, 'data.source', isFolderOpen, 'isFolderOpen');
        if (data.source === 'folder' && !isFolderOpen) {
          updateAppDisplayType(data.app.key, 'normal');
          console.log('将应用移动到桌面:', data.app.name);
        }
      }
    } catch (error) {}
  };

  const handleMoreAppsDrop = (e: React.DragEvent<HTMLDivElement>) => {
    try {
      const data: { app: TApp; source: 'desktop' | 'folder' } = JSON.parse(
        e.dataTransfer.getData('application/json')
      );

      if (data && data.app) {
        if (data.source === 'desktop') {
          updateAppDisplayType(data.app.key, 'more');

          setMoreAppsFolder((prev) => {
            const newApps = [...prev];
            if (!newApps.some((app) => app.key === data.app.key)) {
              const app = installedApps.find((a) => a.key === data.app.key);
              if (app) newApps.push(app);
            }
            return newApps;
          });
        }
      }
    } catch (error) {}
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (folderRef.current && !folderRef.current.contains(e.target as Node) && isFolderOpen) {
        closeFolder();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick as any);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick as any);
    };
  }, [isFolderOpen]);

  console.log(renderApps, 'renderApps');

  const gradientIconStyle = {
    '.gradient-icon': {
      svg: {
        stroke: 'url(#iconGradient)'
      },
      '&::before': {
        content: '""',
        position: 'absolute',
        width: '0',
        height: '0'
      }
    }
  };

  // const openCostCenterApp = () => {
  //   openDesktopApp({
  //     appKey: 'system-costcenter',
  //     pathname: '/'
  //   });
  // };

  const openReferralApp = () => {
    openDesktopApp({
      appKey: 'system-invite',
      pathname: '/'
    });
  };

  return (
    <Flex
      flexDirection={'column'}
      flex={1}
      height={'0'}
      position={'relative'}
      zIndex={1}
      ref={desktopRef}
      onDragOver={(e) => e.preventDefault()}
      onDrag={handleDrag}
      onDrop={handleDesktopDrop}
      sx={gradientIconStyle}
    >
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#636363" />
            <stop offset="100%" stopColor="#000" />
          </linearGradient>
        </defs>
      </svg>
      <Flex width={'full'} height={'full'} overflow={'hidden'} flexDirection={'column'}>
        <Center>
          <Center
            width={'fit-content'}
            borderRadius={'54px'}
            border={'1px solid rgba(228, 228, 231, 0.50)'}
            bg={
              'linear-gradient(90deg, rgba(245, 245, 245, 0.20) 0%, rgba(212, 212, 212, 0.20) 100%)'
            }
            gap={'8px'}
            p={'8px 12px'}
            cursor={'pointer'}
            onClick={layoutConfig?.version === 'cn' ? openReferralApp : () => openGuideModal()}
          >
            <Box position="relative" className="gradient-icon">
              <Volume2 width={16} height={16} />
            </Box>
            <Text
              fontSize={'14px'}
              fontWeight={'500'}
              background={'linear-gradient(120deg, #636363 0%, #000 100%)'}
              backgroundClip={'text'}
              sx={{
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              {layoutConfig?.version === 'cn' ? t('v2:invite_friend') : t('v2:onboard_guide')}
            </Text>
            <Box position="relative" className="gradient-icon">
              <ArrowRight width={16} height={16} />
            </Box>
          </Center>
        </Center>

        <AppGridPagingContainer
          gridGap={gridGap}
          appHeight={appHeight}
          totalPages={totalPagesInGrid}
          currentPage={currentPageInGrid}
          onChange={(currentPage, pageSize) => {
            setCurrentPageInGrid(currentPage);
            setItemsPerPageInGrid(pageSize);
            // length + 1 = apps + more apps folder
            setTotalPagesInGrid(Math.ceil((renderApps.length + 1) / pageSize));
          }}
        >
          {gridPages.map((page, pageIndex) => (
            <AppGrid key={pageIndex} gridGap={gridGap} appHeight={appHeight}>
              {page.map((app, index) => (
                <AppItem
                  key={index}
                  app={app}
                  onClick={handleAppClick}
                  onDragStart={(e) => handleDragStart(e, app, 'desktop')}
                  onDragEnd={handleDragEnd}
                />
              ))}

              {/* More Apps Folder on last page */}
              {moreApps && pageIndex === totalPagesInGrid - 1 && (
                <MoreAppsFolder
                  apps={moreApps}
                  onClick={handleMoreAppsClick}
                  onDrop={handleMoreAppsDrop}
                />
              )}
            </AppGrid>
          ))}
        </AppGridPagingContainer>
      </Flex>

      <Box position="absolute" bottom="16px" left="0" right="0">
        <PageSwitcher
          pages={totalPagesInGrid}
          current={currentPageInGrid}
          onChange={(page) => setCurrentPageInGrid(page)}
        />
      </Box>

      <Modal isOpen={isFolderOpen} onClose={closeFolder} size="xl" isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.3)" backdropFilter="blur(2px)" />
        <ModalContent
          ref={modalContentRef}
          maxH={'90vh'}
          maxW={'90vw'}
          height={'720px'}
          borderRadius="16px"
          boxShadow="0 4px 20px rgba(0, 0, 0, 0.15)"
          border="1px solid rgba(0, 0, 0, 0.05)"
          p="0"
        >
          <ModalCloseButton
            top="16px"
            right="24px"
            color="#18181B"
            _hover={{ bg: 'rgba(0, 0, 0, 0.05)' }}
          />
          <ModalBody
            py={{
              base: '48px',
              xl: '100px'
            }}
            px={{
              base: '16px',
              xl: '150px'
            }}
            overflow="hidden"
            className="folder-modal-body"
          >
            <AppGridPagingContainer
              gridGap={gridGap}
              appHeight={appHeight}
              totalPages={totalPagesInFolder}
              currentPage={currentPageInFolder}
              onChange={(currentPage, pageSize) => {
                setCurrentPageInFolder(currentPage);
                setItemsPerPageInFolder(pageSize);
                setTotalPagesInFolder(Math.ceil(moreApps.length / pageSize));
              }}
            >
              {folderPages.map((page, pageIndex) => (
                <AppGrid key={pageIndex} gridGap={gridGap} appHeight={appHeight}>
                  {page.map((app, index) => (
                    <AppItem
                      key={index}
                      app={app}
                      onClick={handleAppClick}
                      onDragStart={(e) => handleDragStart(e, app, 'folder')}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </AppGrid>
              ))}
            </AppGridPagingContainer>

            <Box position="absolute" bottom="16px" left="0" right="0">
              <PageSwitcher
                pages={totalPagesInFolder}
                current={currentPageInFolder}
                onChange={(page) => setCurrentPageInFolder(page)}
              />
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Flex>
  );
}

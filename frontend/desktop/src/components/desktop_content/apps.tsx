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
  useBreakpointValue,
  GridProps,
  FlexProps
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import {
  DragEventHandler,
  MouseEvent,
  MouseEventHandler,
  ReactNode,
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
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { i18n } = useTranslation();
  const fallbackIcon = useConfigStore().layoutConfig?.logo || '/logo.svg';

  return (
    <Flex
      ref={wrapperRef}
      flexDirection={'column'}
      justifyContent={'flex-start'}
      alignItems={'center'}
      className={app.key}
      w="fit-content"
      h="fit-content"
      maxW="100%"
    >
      <Center
        w={{ base: '64px', sm: '78px' }}
        h={{ base: '64px', sm: '78px' }}
        borderRadius={{ base: '18px', md: '24px' }}
        border={'1px solid rgba(0, 0, 0, 0.05)'}
        boxShadow={'0px 5.634px 8.451px -1.69px rgba(0, 0, 0, 0.05)'}
        transition="transform 0.2s ease"
        overflow={'hidden'}
        _hover={{ transform: 'scale(1.05)' }}
        cursor={'pointer'}
        flexShrink={0}
        style={{
          touchAction: 'none',
          userSelect: 'none'
        }}
        onClick={(e) => {
          if (onClick) {
            onClick(e, app);
          }
        }}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        draggable
      >
        <Image
          w={app.key.startsWith('user-') ? '60px' : '100%'}
          h={app.key.startsWith('user-') ? '60px' : '100%'}
          src={app?.icon}
          fallbackSrc={fallbackIcon}
          draggable={false}
          pointerEvents={'none'}
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
        flexShrink={0}
        maxW="100%"
        wordBreak="break-word"
        noOfLines={2}
        style={{
          touchAction: 'none',
          userSelect: 'none'
        }}
      >
        {app?.i18n?.[i18n?.language]?.name ? app?.i18n?.[i18n?.language]?.name : app?.name}
      </Text>
    </Flex>
  );
};

const AppGrid = ({
  children,
  gridGap,
  rows,
  appHeight,
  columns,
  gridProps
}: {
  children: ReactNode;
  gridGap?: number;
  rows: number;
  appHeight: number;
  columns: number;
  gridProps?: Omit<
    GridProps,
    'templateColumns' | 'templateRows' | 'gap' | 'flexGrow' | 'flexShrink' | 'flexBasis'
  >;
}) => {
  return (
    <Grid
      {...gridProps}
      flexShrink={0}
      flexGrow={0}
      flexBasis={'100%'}
      gap={`${gridGap ?? 0}px`}
      templateColumns={`repeat(${columns}, 1fr)`}
      templateRows={`repeat(${rows}, minmax(${appHeight}px, auto))`}
      justifyItems={'center'}
      alignContent={'space-between'}
      justifyContent={'space-between'}
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
  columns,
  totalPages,
  currentPage,
  handleNavigation,
  pageGap,
  onChange,
  dragContainerProps
}: {
  children: ReactNode;
  dragContainerProps?: FlexProps;
  gridGap: number;
  appHeight: number;
  columns: number;
  totalPages: number;
  currentPage: number;
  handleNavigation: boolean;
  pageGap: number;
  onChange: (currentPage: number, pageSize: number) => void;
}) => {
  const dragContainerRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const [pageWidth, setPageWidth] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [dragDelta, setDragDelta] = useState(0);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);

  const clampedCurrentPage = Math.min(Math.max(currentPage, 0), totalPages - 1);
  const scrollPosition =
    (pageWidth + pageGap) * clampedCurrentPage - dragDelta >
    (totalPages - 1) * (pageWidth + pageGap)
      ? (pageWidth + pageGap) * clampedCurrentPage
      : (pageWidth + pageGap) * clampedCurrentPage - dragDelta;

  const calculateItemsPerPage = useCallback(() => {
    if (!gridContainerRef.current) return 8;

    const height = gridContainerRef.current.clientHeight;
    // At least 1 row in a grid.
    const rows = Math.max(1, Math.floor((height + gridGap) / (appHeight + gridGap)));

    return rows * columns;
  }, [columns, gridGap, appHeight]);

  const calculatePageWidth = useCallback(() => {
    if (!gridContainerRef.current) return 0;

    return (gridContainerRef.current.scrollWidth + pageGap) / totalPages - pageGap;
  }, [totalPages, pageGap]);

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
  }, [columns, calculateItemsPerPage]);

  // Calculate grid width on screen size changes
  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        setPageWidth(calculatePageWidth());
      }, 50);
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(debounceTimer);
    };
  }, [calculatePageWidth]);

  // Call onChange callback when something changes
  useEffect(() => {
    onChange(clampedCurrentPage, itemsPerPage);
  }, [clampedCurrentPage, itemsPerPage, onChange]);

  // Keyboard pagination
  useEffect(() => {
    const handleKeyboardPagination = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        onChange(Math.max(0, currentPage - 1), itemsPerPage);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        onChange(Math.min(totalPages - 1, currentPage + 1), itemsPerPage);
      }
    };

    if (handleNavigation) {
      document.addEventListener('keydown', handleKeyboardPagination);

      return () => {
        document.removeEventListener('keydown', handleKeyboardPagination);
      };
    }
  }, [handleNavigation, currentPage, totalPages, itemsPerPage, onChange]);

  // Pointer drag pagination
  useEffect(() => {
    const wrapper = dragContainerRef.current;
    if (!wrapper) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (!dragContainerRef.current) return;

      setDragStartX(e.screenX);
      setDragStartY(e.screenY);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pressure <= 0) return;

      // Handles dragging outside of the wrapper
      // Prevents the pointer from being captured by the wrapper when *clicking* on the icons
      if (
        !wrapper.hasPointerCapture(e.pointerId) &&
        Math.hypot(e.screenX - dragStartX, e.screenY - dragStartY) > 48
      ) {
        wrapper.setPointerCapture(e.pointerId);
      }

      setDragDelta(e.screenX - dragStartX);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (wrapper.hasPointerCapture(e.pointerId)) {
        wrapper.releasePointerCapture(e.pointerId);
      }

      if (Math.abs(dragDelta) > 96) {
        if (dragDelta < -96) {
          onChange(Math.min(totalPages - 1, currentPage + 1), itemsPerPage);
        } else if (dragDelta > 96) {
          onChange(Math.max(0, currentPage - 1), itemsPerPage);
        }
      }

      setDragDelta(0);
    };

    if (handleNavigation) {
      wrapper.addEventListener('pointerdown', handlePointerDown, { passive: true });
      wrapper.addEventListener('pointermove', handlePointerMove);
      wrapper.addEventListener('pointerup', handlePointerUp);
      wrapper.addEventListener('pointercancel', handlePointerUp);

      return () => {
        wrapper.removeEventListener('pointerdown', handlePointerDown);
        wrapper.removeEventListener('pointermove', handlePointerMove);
        wrapper.removeEventListener('pointerup', handlePointerUp);
        wrapper.removeEventListener('pointercancel', handlePointerUp);
      };
    }
  }, [
    handleNavigation,
    currentPage,
    totalPages,
    itemsPerPage,
    onChange,
    dragStartX,
    dragStartY,
    dragDelta
  ]);

  return (
    <Flex ref={dragContainerRef} w="full" h="full" {...dragContainerProps}>
      <Flex
        ref={gridContainerRef}
        h="full"
        w="full"
        transition="transform 0.2s ease-out"
        gap={`${pageGap}px`}
        style={{
          transform: `translateX(-${scrollPosition}px)`
        }}
      >
        {children}
      </Flex>
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
        w={{ base: '84px', sm: '108px' }}
        h={{ base: '84px', sm: '108px' }}
        userSelect="none"
        cursor={'pointer'}
        className="more-apps-folder"
        onClick={onClick}
      >
        <Box
          w="100%"
          h="100%"
          ref={folderIconRef}
          borderRadius={{ base: '16px', md: '24px' }}
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
            p={{ base: '12px', sm: '16px' }}
            gap={{ base: '6px', sm: '10px' }}
          >
            {apps.length > 0
              ? apps.slice(0, 4).map((app, idx) => (
                  <Box
                    key={idx}
                    width={{ base: '28px', sm: '32px' }}
                    height={{ base: '28px', sm: '32px' }}
                    overflow="hidden"
                    bg="white"
                    borderRadius={{ base: '8px', sm: '10px' }}
                    border={'1px solid rgba(0, 0, 0, 0.05)'}
                    boxShadow={'0px 5.634px 8.451px -1.69px rgba(0, 0, 0, 0.05)'}
                  >
                    <Image
                      width="100%"
                      height="100%"
                      src={app?.icon}
                      fallbackSrc={fallbackIcon}
                      objectFit="contain"
                      alt="app icon"
                      draggable={false}
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
                      draggable={false}
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
    <Flex justifyContent="center" alignItems="center" gap="11px">
      {Array.from({ length: pages }).map((_, index) => (
        <Box
          key={index}
          w="10px"
          h="10px"
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
  const { t } = useTranslation();
  const { installedApps, openApp, openDesktopApp } = useAppStore();
  const { appDisplayConfigs, updateAppDisplayType } = useAppDisplayConfigStore();
  const { layoutConfig } = useConfigStore();
  const [draggedFromFolder, setDraggedFromFolder] = useState(false);
  const [isFolderOpen, setIsFolderOpen] = useState(false);

  const { openGuideModal } = useGuideModalStore();
  const desktopRef = useRef<HTMLDivElement>(null);
  const folderRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  // min = 1 line app name
  // max = 2 lines app name
  const appHeight =
    useBreakpointValue({
      base: 112,
      md: 126
    }) ?? 112;
  const columns =
    useBreakpointValue({
      base: 2,
      sm: 3,
      lg: 5
    }) ?? 2;
  const gridGap = 10;

  const [itemsPerPageInGrid, setItemsPerPageInGrid] = useState(0);
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

  const normalApps = useMemo(() => {
    return installedApps.filter((app) => getAppDisplayType(app) === 'normal');
  }, [installedApps, getAppDisplayType]);

  const moreApps = useMemo(() => {
    return installedApps.filter((app) => getAppDisplayType(app) === 'more');
  }, [installedApps, getAppDisplayType]);

  // Placed on desktop, but there's not enough space to show these apps on desktop
  const dynamicApps = useMemo(() => {
    if (itemsPerPageInGrid === 0) return [];
    return normalApps.slice(itemsPerPageInGrid - 1);
  }, [normalApps, itemsPerPageInGrid]);

  const folderApps = useMemo(() => {
    return [...dynamicApps, ...moreApps];
  }, [dynamicApps, moreApps]);

  const desktopPages = useMemo(() => {
    // One page desktop
    const firstPageApps = itemsPerPageInGrid > 0 ? normalApps.slice(0, itemsPerPageInGrid - 1) : [];
    console.log([firstPageApps], 'desktop pages');
    return [firstPageApps];
  }, [normalApps, itemsPerPageInGrid]);

  const folderPages = useMemo(() => {
    const getPageInFolder = (pageIndex: number) => {
      const start = pageIndex * itemsPerPageInFolder;
      const end = start + itemsPerPageInFolder;
      return folderApps.slice(start, end);
    };

    const pages = Array.from({ length: totalPagesInFolder }).map((_, index) =>
      getPageInFolder(index)
    );
    console.log(pages, 'folder pages');
    return pages;
  }, [folderApps, itemsPerPageInFolder, totalPagesInFolder]);

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
    }

    setIsFolderOpen(true);
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
    // these apps are not allowed to be dragged
    const notDraggableApps = [
      'system-devbox',
      'system-applaunchpad',
      'system-template',
      'system-dbprovider'
    ];
    if (notDraggableApps.includes(app.key)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.dataTransfer.setData('application/json', JSON.stringify({ app, source }));

    if (source === 'folder') {
      setDraggedFromFolder(true);
    }
  };

  const handleDragEnd = () => {
    setDraggedFromFolder(false);
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
        }
      }
    } catch (error) {}
  };

  // Close folder when clicking outside
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
        <Center mx={'12px'}>
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

        <Box p={'12px'} pt={{ base: '56px', sm: '48px' }} w={'full'} h={'full'}>
          <AppGridPagingContainer
            gridGap={gridGap}
            appHeight={appHeight}
            columns={columns}
            // One page desktop, other apps are in folder
            totalPages={1}
            currentPage={currentPageInGrid}
            handleNavigation={false}
            pageGap={0}
            onChange={(currentPage, pageSize) => {
              setCurrentPageInGrid(currentPage);
              setItemsPerPageInGrid(pageSize);
            }}
          >
            {desktopPages.map((page, pageIndex) => (
              <AppGrid
                key={pageIndex}
                gridGap={gridGap}
                rows={itemsPerPageInGrid / columns}
                appHeight={appHeight}
                columns={columns}
              >
                {page.map((app, index) => (
                  <AppItem
                    key={index}
                    app={app}
                    onClick={handleAppClick}
                    onDragStart={(e) => handleDragStart(e, app, 'desktop')}
                    onDragEnd={handleDragEnd}
                  />
                ))}

                <MoreAppsFolder
                  apps={folderApps}
                  onClick={handleMoreAppsClick}
                  onDrop={handleMoreAppsDrop}
                />
              </AppGrid>
            ))}
          </AppGridPagingContainer>
        </Box>
      </Flex>

      <Modal isOpen={isFolderOpen} onClose={closeFolder} size="xl" isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.3)" backdropFilter="blur(2px)" />
        <ModalContent
          ref={modalContentRef}
          maxH={'90vh'}
          maxW={'min(90vw, 1240px)'}
          height={'min(calc(100vh - 80px), 720px)'}
          borderRadius="32px"
          boxShadow="0 4px 20px rgba(0, 0, 0, 0.15)"
          border="1px solid rgba(0, 0, 0, 0.05)"
          p="0"
        >
          <ModalCloseButton
            top="40px"
            right="40px"
            padding={'12.5px'}
            size={'20px'}
            border={'1.25px solid #E4E4E7'}
            borderRadius={'full'}
            color="#18181B"
            _hover={{ bg: 'rgba(0, 0, 0, 0.05)' }}
          />
          <ModalBody p="0" maxH={'full'}>
            <AppGridPagingContainer
              dragContainerProps={{
                pt: {
                  base: '112.5px',
                  sm: '124.5px'
                },
                pb: {
                  base: '112.5px',
                  sm: '144.5px'
                },
                px: {
                  base: '31.5px',
                  sm: '60px',
                  md: '64px',
                  lg: '82px',
                  xl: '90px'
                },
                overflow: 'hidden'
              }}
              gridGap={gridGap}
              appHeight={appHeight}
              columns={columns}
              totalPages={totalPagesInFolder}
              currentPage={currentPageInFolder}
              handleNavigation={isFolderOpen}
              pageGap={240}
              onChange={(currentPage, pageSize) => {
                setCurrentPageInFolder(currentPage);
                setItemsPerPageInFolder(pageSize);
                setTotalPagesInFolder(Math.ceil(folderApps.length / pageSize));
              }}
            >
              {folderPages.map((page, pageIndex) => (
                <AppGrid
                  key={pageIndex}
                  gridGap={gridGap}
                  rows={itemsPerPageInFolder / columns}
                  appHeight={appHeight}
                  columns={columns}
                  gridProps={{
                    alignContent: 'center'
                  }}
                >
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

            <Box
              position="absolute"
              w="fit-content"
              bottom="32px"
              left="0"
              right="0"
              marginInline={'auto'}
            >
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

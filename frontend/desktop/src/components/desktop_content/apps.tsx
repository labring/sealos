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
  Center
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppDisplayConfigStore } from '@/stores/appDisplayConfig';
import styles from './index.module.scss';
import { ArrowRight, Volume2 } from 'lucide-react';
import { useGuideModalStore } from '@/stores/guideModal';
import { currentDriver, destroyDriver } from '../account/driver';

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
  const folderIconRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  // grid value
  const gridMX = 0;
  const gridMT = 46;
  const gridSpacing = 48;
  const appWidth = 120;
  const appHeight = 128;
  const pageButton = 12;

  const [currentPage, setCurrentPage] = useState(0);

  const calculateAppsPerPage = () => {
    console.log(modalContentRef, 'modalContentRef');

    if (!modalContentRef.current) return 10;

    const modalWidth = modalContentRef.current.clientWidth;
    const modalHeight = modalContentRef.current.clientHeight;

    const availableHeight = modalHeight - 120 * 2 - 64;
    const isXl = modalWidth >= 1280;
    const columnsPerRow = isXl ? 5 : Math.floor((modalWidth - 80 * 2) / appWidth);

    const rowsPerPage = Math.floor(availableHeight / appHeight);

    return Math.max(columnsPerRow * rowsPerPage, 1);
  };

  const [appsPerPage, setAppsPerPage] = useState(10);

  useEffect(() => {
    let debounceTimer: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        console.log('handleResize');
        if (isFolderOpen && modalContentRef.current) {
          console.log('calculateAppsPerPage');
          setAppsPerPage(calculateAppsPerPage());
        }
      }, 200);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(debounceTimer);
    };
  }, [isFolderOpen]);

  const totalPages = Math.ceil(moreAppsFolder.length / appsPerPage);

  const getCurrentPageApps = () => {
    const start = currentPage * appsPerPage;
    const end = start + appsPerPage;
    return moreAppsFolder.slice(start, end);
  };

  const handlePageChange = (pageIndex: number) => {
    setCurrentPage(pageIndex);
  };

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

  const { isDriverActive } = useGuideModalStore();

  const handleDoubleClick = (e: MouseEvent<HTMLDivElement>, item: TApp) => {
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

  const handleFolderClick = (e: MouseEvent<HTMLDivElement>) => {
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

    // 文件夹打开时手动触发一次计算
    setTimeout(() => {
      if (modalContentRef.current) {
        setAppsPerPage(calculateAppsPerPage());
      }
    }, 0);
  };

  const closeFolder = () => {
    setIsFolderOpen(false);
    setCurrentPage(0);
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

    if (folderIconRef.current) {
      folderIconRef.current.classList.remove(styles.folderPulse);
    }
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

  const handleDropOnDesktop = (e: React.DragEvent<HTMLDivElement>) => {
    console.log('handleDropOnDesktop');

    e.preventDefault();

    try {
      const data: { app: TApp; source: 'desktop' | 'folder' } = JSON.parse(
        e.dataTransfer.getData('application/json')
      );

      if (data && data.app) {
        if (data.source === 'folder' && !isFolderOpen) {
          updateAppDisplayType(data.app.key, 'normal');
          console.log('将应用移动到桌面:', data.app.name);
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
      onDrop={handleDropOnDesktop}
      px={'100px'}
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
      <Flex width={'full'} height={'full'} overflow={'auto'} flexDirection={'column'}>
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

        <Grid
          overflow={'hidden'}
          flex={1}
          mt={`${gridMT}px`}
          mx={`${gridMX}px`}
          gap={`${gridSpacing}px`}
          templateColumns={`repeat(auto-fill, minmax(${appWidth}px, 1fr))`}
          templateRows={`repeat(auto-fit, ${appHeight}px)`}
          className="apps-container"
        >
          {renderApps.map((item: TApp, index) => (
            <Flex
              draggable={
                ![
                  'system-devbox',
                  'system-applaunchpad',
                  'system-template',
                  'system-dbprovider'
                ].includes(item.key)
              }
              flexDirection={'column'}
              justifyContent={'center'}
              alignItems={'center'}
              key={index}
              userSelect="none"
              cursor={'pointer'}
              onClick={(e) => handleDoubleClick(e, item)}
              className={item.key}
              onDragStart={(e) => handleDragStart(e, item, 'desktop')}
              onDragEnd={handleDragEnd}
            >
              <Center
                w="78px"
                h="78px"
                borderRadius={'24px'}
                border={'1px solid rgba(0, 0, 0, 0.05)'}
                boxShadow={'0px 5.634px 8.451px -1.69px rgba(0, 0, 0, 0.05)'}
                transition="transform 0.2s ease"
                overflow={'hidden'}
                _hover={{ transform: 'scale(1.05)' }}
              >
                <Image
                  w={item.key.startsWith('user-') ? '60px' : '100%'}
                  h={item.key.startsWith('user-') ? '60px' : '100%'}
                  src={item?.icon}
                  fallbackSrc={logo}
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
                {item?.i18n?.[i18n?.language]?.name
                  ? item?.i18n?.[i18n?.language]?.name
                  : item?.name}
              </Text>
            </Flex>
          ))}
          <Center>
            <Flex
              flexDirection={'column'}
              alignItems={'center'}
              w="106px"
              h="108px"
              userSelect="none"
              cursor={'pointer'}
              className="more-apps-folder"
              onClick={handleFolderClick}
            >
              <Box
                w="100%"
                h="100%"
                ref={folderIconRef}
                borderRadius={'24px'}
                backgroundColor={'#EDEDED'}
                position="relative"
                transition="all 0.3s ease"
                _hover={{ transform: 'scale(1.05)' }}
                onDragOver={handleDragOverFolder}
                onDragLeave={handleDragLeaveFolder}
                onDrop={handleDropOnFolder}
              >
                <Grid
                  templateColumns="repeat(2, 1fr)"
                  templateRows="repeat(2, 1fr)"
                  width="100%"
                  height="100%"
                  p="16px"
                  gap="10px"
                >
                  {moreApps.length > 0
                    ? moreApps.slice(0, 4).map((app, idx) => (
                        <Box
                          key={idx}
                          width="32px"
                          height="32px"
                          overflow="hidden"
                          bg="white"
                          borderRadius={'10px'}
                          boxShadow={'0px 5.634px 8.451px -1.69px rgba(0, 0, 0, 0.05)'}
                          draggable={false}
                          // onDragStart={(e) => handleDragStart(e, app, 'folder')}
                        >
                          <Image
                            width="100%"
                            height="100%"
                            src={app?.icon}
                            fallbackSrc={logo}
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
        </Grid>
      </Flex>
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
            py={'100px'}
            px={{
              base: '80px',
              xl: '150px'
            }}
            overflow="hidden"
            className="folder-modal-body"
          >
            <Grid
              templateColumns={{
                base: `repeat(auto-fill, ${appWidth}px)`,
                xl: `repeat(5, 1fr)`
              }}
              templateRows={`repeat(auto-fit, ${appHeight}px)`}
              columnGap={'30px'}
              rowGap={'64px'}
              justifyContent="center"
            >
              {getCurrentPageApps().map((app, index) => (
                <Flex
                  key={index}
                  flexDirection="column"
                  alignItems="center"
                  draggable
                  onDragStart={(e) => handleDragStart(e, app, 'folder')}
                  onDrag={handleDrag}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => handleDoubleClick(e, app)}
                  cursor="pointer"
                  className={app.key}
                >
                  <Center
                    w="78px"
                    h="78px"
                    borderRadius="24px"
                    border="1px solid rgba(0, 0, 0, 0.05)"
                    boxShadow="0px 5.634px 8.451px -1.69px rgba(0, 0, 0, 0.05)"
                    overflow="hidden"
                    transition="transform 0.2s ease"
                    _hover={{ transform: 'scale(1.05)' }}
                  >
                    <Image
                      w={app.key.startsWith('user-') ? '60px' : '78px'}
                      h={app.key.startsWith('user-') ? '60px' : '78px'}
                      src={app?.icon}
                      fallbackSrc={logo}
                      alt="app logo"
                    />
                  </Center>
                  <Text
                    mt="12px"
                    color="primary"
                    fontSize="14px"
                    fontWeight={500}
                    textAlign="center"
                    noOfLines={1}
                    lineHeight={'18px'}
                  >
                    {app?.i18n?.[i18n?.language]?.name
                      ? app?.i18n?.[i18n?.language]?.name
                      : app?.name}
                  </Text>
                </Flex>
              ))}
            </Grid>

            <Flex
              justifyContent="center"
              alignItems="center"
              position="absolute"
              bottom="16px"
              left="0"
              right="0"
              gap="8px"
            >
              {Array.from({ length: totalPages }).map((_, index) => (
                <Box
                  key={index}
                  w="6px"
                  h="6px"
                  borderRadius="50%"
                  bg={index === currentPage ? 'gray.400' : 'gray.200'}
                  cursor="pointer"
                  onClick={() => handlePageChange(index)}
                  _hover={{ bg: index === currentPage ? 'gray.400' : 'gray.300' }}
                />
              ))}
            </Flex>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Flex>
  );
}

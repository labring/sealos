import useAppStore from '@/stores/app';
import { useConfigStore } from '@/stores/config';
import { TApp, displayType } from '@/types';
import {
  Box,
  Flex,
  Grid,
  Image,
  Text,
  useBreakpointValue,
  keyframes,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useAppDisplayConfigStore } from '@/stores/appDisplayConfig';

export default function Apps() {
  const { t, i18n } = useTranslation();
  const { installedApps, openApp } = useAppStore();
  const { appDisplayConfigs, updateAppDisplayType } = useAppDisplayConfigStore();
  const logo = useConfigStore().layoutConfig?.logo || '/logo.svg';

  // 用于处理拖拽的状态
  const [draggedApp, setDraggedApp] = useState<TApp | null>(null);
  const [draggedFromFolder, setDraggedFromFolder] = useState(false);
  const [moreAppsFolder, setMoreAppsFolder] = useState<TApp[]>([]);
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [folderPosition, setFolderPosition] = useState({ top: 0, left: 0 });

  // 引用
  const desktopRef = useRef<HTMLDivElement>(null);
  const folderRef = useRef<HTMLDivElement>(null);
  const folderIconRef = useRef<HTMLDivElement>(null);

  // 动画
  const pulseAnimation = keyframes`
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  `;

  // grid value
  const gridMX = 0;
  const gridMT = 32;
  const gridSpacing = 36;
  const appWidth = 120;
  const appHeight = 108;
  const pageButton = 12;

  // 应用显示类型处理
  const getAppDisplayType = (app: TApp): displayType => {
    // 优先使用本地存储的配置，没有则使用应用默认配置
    return appDisplayConfigs[app.key] || app.displayType;
  };

  // 筛选出要显示的应用
  const renderApps = useMemo(() => {
    return installedApps.filter((app) => getAppDisplayType(app) === 'normal');
  }, [installedApps, appDisplayConfigs]);

  // 筛选出要放入文件夹的应用
  const moreApps = useMemo(() => {
    return installedApps.filter((app) => getAppDisplayType(app) === 'more');
  }, [installedApps, appDisplayConfigs]);

  const handleDoubleClick = (e: MouseEvent<HTMLDivElement>, item: TApp) => {
    e.preventDefault();
    if (item?.name) {
      openApp(item);
    }
  };

  // 处理文件夹点击
  const handleFolderClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();

    // 计算文件夹位置
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

  // 关闭文件夹
  const closeFolder = () => {
    setIsFolderOpen(false);
  };

  // 处理拖拽开始
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

  // 处理拖拽结束
  const handleDragEnd = () => {
    setDraggedApp(null);
    setDraggedFromFolder(false);

    // 重置文件夹样式
    if (folderIconRef.current) {
      folderIconRef.current.style.animation = '';
    }
  };

  // 处理拖拽过程中
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    if (draggedFromFolder) {
      // 获取鼠标相对于视口的位置
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // 获取Modal内容的边界
      const modalContent = document.querySelector('.chakra-modal__content');
      if (modalContent) {
        const rect = modalContent.getBoundingClientRect();

        // 检查鼠标是否已经离开Modal区域
        if (
          mouseX < rect.left - 20 ||
          mouseX > rect.right + 20 ||
          mouseY < rect.top - 20 ||
          mouseY > rect.bottom + 20
        ) {
          // 鼠标已离开Modal区域，关闭文件夹
          setTimeout(() => {
            closeFolder();
          }, 200);
        }
      }
    }
  };

  // 处理拖拽经过文件夹
  const handleDragOverFolder = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    try {
      // 获取被拖拽的数据
      const dataText = e.dataTransfer.getData('application/json');
      if (dataText) {
        const data = JSON.parse(dataText);
        // 只有从桌面拖拽的应用才应该高亮文件夹
        if (data.source === 'desktop') {
          // 添加动画样式
          if (folderIconRef.current) {
            folderIconRef.current.style.animation = `${pulseAnimation} 1s infinite`;
            folderIconRef.current.style.boxShadow = '0 0 0 3px rgba(24, 144, 255, 0.5)';
            folderIconRef.current.style.borderColor = 'rgba(24, 144, 255, 0.8)';
          }
        }
      }
    } catch (error) {
      // 处理错误：无法从dataTransfer获取数据（可能是首次拖动）
      // 为保险起见，还是应用动画效果
      if (folderIconRef.current) {
        folderIconRef.current.style.animation = `${pulseAnimation} 1s infinite`;
        folderIconRef.current.style.boxShadow = '0 0 0 3px rgba(24, 144, 255, 0.5)';
        folderIconRef.current.style.borderColor = 'rgba(24, 144, 255, 0.8)';
      }
    }
  };

  // 处理拖拽离开文件夹
  const handleDragLeaveFolder = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    // 重置动画效果
    if (folderIconRef.current) {
      folderIconRef.current.style.animation = '';
      folderIconRef.current.style.boxShadow = '0px 5.634px 8.451px -1.69px rgba(0, 0, 0, 0.05)';
      folderIconRef.current.style.borderColor = 'rgba(0, 0, 0, 0.05)';
    }
  };

  // 处理拖拽放置到文件夹
  const handleDropOnFolder = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    // 重置文件夹样式
    if (folderIconRef.current) {
      folderIconRef.current.style.animation = '';
      folderIconRef.current.style.boxShadow = '0px 5.634px 8.451px -1.69px rgba(0, 0, 0, 0.05)';
      folderIconRef.current.style.borderColor = 'rgba(0, 0, 0, 0.05)';
    }

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));

      if (data && data.app) {
        // 如果拖拽的是桌面应用，将其移动到文件夹中
        if (data.source === 'desktop') {
          // 更新应用状态，将其displayType改为more
          updateAppDisplayType(data.app.key, 'more');
          console.log('将应用移动到文件夹:', data.app.name);

          // 更新文件夹内容显示
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
    } catch (error) {
      console.error('拖拽数据解析错误:', error);
    }
  };

  // 处理从文件夹拖拽到桌面
  const handleDropOnDesktop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));

      if (data && data.app) {
        // 如果拖拽的是文件夹应用，将其移动到桌面
        if (data.source === 'folder') {
          // 更新应用状态，将其displayType改为normal
          updateAppDisplayType(data.app.key, 'normal');
          console.log('将应用移动到桌面:', data.app.name);
        }
      }
    } catch (error) {
      console.error('拖拽数据解析错误:', error);
    }
  };

  useEffect(() => {
    // 点击外部关闭文件夹
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
    >
      <Flex width={'full'} height={'full'} id="apps-container" overflow={'auto'}>
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
              flexDirection={'column'}
              alignItems={'center'}
              key={index}
              userSelect="none"
              cursor={'pointer'}
              onClick={(e) => handleDoubleClick(e, item)}
              className={item.key}
              draggable
              onDragStart={(e) => handleDragStart(e, item, 'desktop')}
              onDragEnd={handleDragEnd}
            >
              <Box
                w="78px"
                h="78px"
                borderRadius={'24px'}
                border={'1px solid rgba(0, 0, 0, 0.05)'}
                boxShadow={'0px 5.634px 8.451px -1.69px rgba(0, 0, 0, 0.05)'}
                transition="transform 0.2s ease"
                _hover={{ transform: 'scale(1.05)' }}
              >
                <Image
                  width="100%"
                  height="100%"
                  src={item?.icon}
                  fallbackSrc={logo}
                  draggable={false}
                  alt="app logo"
                />
              </Box>
              <Text
                mt="12px"
                color={'#18181B'}
                fontSize={'14px'}
                fontWeight={500}
                textAlign={'center'}
              >
                {item?.i18n?.[i18n?.language]?.name
                  ? item?.i18n?.[i18n?.language]?.name
                  : item?.name}
              </Text>
            </Flex>
          ))}

          {/* 文件夹图标 - 无论是否有应用都显示 */}
          <Flex
            flexDirection={'column'}
            alignItems={'center'}
            w="100%"
            h="108px"
            userSelect="none"
            cursor={'pointer'}
            className="more-apps-folder"
            onClick={handleFolderClick}
            onDragOver={handleDragOverFolder}
            onDragLeave={handleDragLeaveFolder}
            onDrop={handleDropOnFolder}
          >
            <Box
              ref={folderIconRef}
              w="78px"
              h="78px"
              borderRadius={'24px'}
              border={'1px solid rgba(0, 0, 0, 0.05)'}
              boxShadow={'0px 5.634px 8.451px -1.69px rgba(0, 0, 0, 0.05)'}
              backgroundColor={'rgba(255, 255, 255, 0.98)'}
              position="relative"
              transition="all 0.3s ease"
              _hover={{ transform: 'scale(1.05)' }}
              overflow="hidden"
            >
              {/* 文件夹预览 - 显示最多4个应用图标 */}
              <Grid
                templateColumns="repeat(2, 1fr)"
                templateRows="repeat(2, 1fr)"
                width="100%"
                height="100%"
                p="4px"
                gap="4px"
              >
                {moreApps.slice(0, 4).map((app, idx) => (
                  <Box
                    key={idx}
                    width="100%"
                    height="100%"
                    overflow="hidden"
                    borderRadius="14px"
                    border={'1px solid rgba(0, 0, 0, 0.05)'}
                    bg="white"
                  >
                    <Image
                      width="100%"
                      height="100%"
                      src={app?.icon}
                      fallbackSrc={logo}
                      objectFit="cover"
                      alt="app icon"
                    />
                  </Box>
                ))}
                {/* 当没有应用时显示默认空文件夹样式 */}
                {moreApps.length === 0 && (
                  <>
                    <Box
                      width="100%"
                      height="100%"
                      overflow="hidden"
                      borderRadius="14px"
                      border={'1px solid rgba(0, 0, 0, 0.05)'}
                      bg="white"
                    />
                    <Box
                      width="100%"
                      height="100%"
                      overflow="hidden"
                      borderRadius="14px"
                      border={'1px solid rgba(0, 0, 0, 0.05)'}
                      bg="white"
                    />
                    <Box
                      width="100%"
                      height="100%"
                      overflow="hidden"
                      borderRadius="14px"
                      border={'1px solid rgba(0, 0, 0, 0.05)'}
                      bg="white"
                    />
                    <Box
                      width="100%"
                      height="100%"
                      overflow="hidden"
                      borderRadius="14px"
                      border={'1px solid rgba(0, 0, 0, 0.05)'}
                      bg="white"
                    />
                  </>
                )}
              </Grid>
            </Box>
            <Text
              mt="12px"
              color={'#18181B'}
              fontSize={'14px'}
              fontWeight={500}
              textAlign={'center'}
            >
              {t('common:more_apps')}
            </Text>
          </Flex>
        </Grid>
      </Flex>

      {/* 使用Modal替代原来的弹出层 */}
      <Modal isOpen={isFolderOpen} onClose={closeFolder} size="xl" isCentered>
        <ModalOverlay bg="rgba(0, 0, 0, 0.3)" backdropFilter="blur(2px)" />
        <ModalContent
          width="656px"
          height="460px"
          borderRadius="16px"
          boxShadow="0 4px 20px rgba(0, 0, 0, 0.15)"
          border="1px solid rgba(0, 0, 0, 0.05)"
          p="0"
        >
          <ModalHeader
            px="24px"
            py="16px"
            borderBottom="1px solid rgba(0, 0, 0, 0.05)"
            fontSize="16px"
            fontWeight="medium"
            color="#18181B"
          >
            {t('common:more_apps')}
          </ModalHeader>
          <ModalCloseButton
            top="16px"
            right="24px"
            color="#18181B"
            _hover={{ bg: 'rgba(0, 0, 0, 0.05)' }}
          />
          <ModalBody p="24px" height="calc(100% - 56px)" overflowY="auto">
            <Grid templateColumns="repeat(5, 1fr)" gap="24px" justifyContent="center">
              {moreAppsFolder.map((app, index) => (
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
                >
                  <Box
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
                      width="100%"
                      height="100%"
                      src={app?.icon}
                      fallbackSrc={logo}
                      alt="app logo"
                    />
                  </Box>
                  <Text
                    mt="12px"
                    color="#18181B"
                    fontSize="14px"
                    fontWeight={500}
                    textAlign="center"
                    noOfLines={1}
                  >
                    {app?.i18n?.[i18n?.language]?.name
                      ? app?.i18n?.[i18n?.language]?.name
                      : app?.name}
                  </Text>
                </Flex>
              ))}
            </Grid>

            {/* 底部分页指示器 */}
            <Flex
              justifyContent="center"
              alignItems="center"
              position="absolute"
              bottom="16px"
              left="0"
              right="0"
              gap="8px"
            >
              {[0, 1, 2, 3].map((index) => (
                <Box
                  key={index}
                  w="6px"
                  h="6px"
                  borderRadius="50%"
                  bg={index === 0 ? 'gray.400' : 'gray.200'}
                />
              ))}
            </Flex>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Flex>
  );
}

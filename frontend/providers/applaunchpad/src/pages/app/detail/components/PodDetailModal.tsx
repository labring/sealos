import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalHeader,
  ModalBody,
  Box,
  Flex,
  Grid,
  Button,
  useTheme,
  useDisclosure,
  MenuButton
} from '@chakra-ui/react';
import { ChevronDownIcon } from '@chakra-ui/icons';
import type { PodDetailType, PodEvent } from '@/types/app';
import PodLineChart from '@/components/PodLineChart';
import { MOCK_PODS } from '@/mock/apps';
import { getPodEvents } from '@/api/app';
import { useQuery } from '@tanstack/react-query';
import { useLoading } from '@/hooks/useLoading';
import MyIcon from '@/components/Icon';
import { streamFetch } from '@/services/streamFetch';
import { useToast } from '@/hooks/useToast';
import { SealosMenu } from '@sealos/ui';

import { MyTooltip } from '@sealos/ui';

import styles from '../index.module.scss';
import { useTranslation } from 'next-i18next';
import { SHOW_EVENT_ANALYZE } from '@/store/static';

const Logs = ({
  pod = MOCK_PODS[0],
  pods = [],
  podAlias,
  setPodDetail,
  closeFn
}: {
  pod: PodDetailType;
  pods: { alias: string; podName: string }[];
  podAlias: string;
  setPodDetail: (name: string) => void;
  closeFn: () => void;
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const controller = useRef(new AbortController());
  const { Loading } = useLoading();
  const { toast } = useToast();
  const [events, setEvents] = useState<PodEvent[]>([]);
  const [eventAnalysesText, setEventAnalysesText] = useState('');
  const { isOpen: isAnalyzing, onOpen: onStartAnalyses, onClose: onEndAnalyses } = useDisclosure();
  const {
    isOpen: isOpenAnalyses,
    onOpen: onOpenAnalyses,
    onClose: onCloseAnalyses
  } = useDisclosure();

  const RenderItem = useCallback(
    ({ label, children }: { label: string; children: React.ReactNode }) => {
      return (
        <Flex w={'100%'} my={5} alignItems="center">
          <Box flex={'0 0 100px'} w={0} color={'grayModern.900'}>
            {label}
          </Box>
          <Box
            flex={'1 0 0'}
            w={0}
            color={'grayModern.600'}
            userSelect={typeof children === 'string' ? 'all' : 'auto'}
          >
            {children}
          </Box>
        </Flex>
      );
    },
    []
  );
  const RenderTag = useCallback(({ children }: { children: string }) => {
    return (
      <MyTooltip label={children}>
        <Box
          py={1}
          px={4}
          backgroundColor={'grayModern.100'}
          whiteSpace={'nowrap'}
          overflow={'hidden'}
          textOverflow={'ellipsis'}
          color={'grayModern.700'}
          cursor={'default'}
          border={theme.borders.base}
          borderRadius={'md'}
        >
          {children}
        </Box>
      </MyTooltip>
    );
  }, []);

  const { isLoading } = useQuery(['initPodEvents'], () => getPodEvents(pod.podName), {
    refetchInterval: 3000,
    onSuccess(res) {
      setEvents(res);
    }
  });

  useEffect(() => {
    controller.current = new AbortController();
    return () => {
      controller.current?.abort();
    };
  }, []);

  const onCloseAnalysesModel = useCallback(() => {
    setEventAnalysesText('');
    onCloseAnalyses();
    controller.current?.abort();
    controller.current = new AbortController();
  }, [onCloseAnalyses]);

  const onclickAnalyses = useCallback(async () => {
    try {
      onOpenAnalyses();
      onStartAnalyses();
      await streamFetch({
        url: '/api/getPodEventsAnalyses',
        data: events.map((item) => ({
          reason: item.reason,
          message: item.message,
          count: item.count,
          type: item.type,
          firstTimestamp: item.firstTime,
          lastTimestamp: item.lastTime
        })),
        abortSignal: controller.current,
        onMessage: (text: string) => {
          setEventAnalysesText((state) => (state += text));
        }
      });
    } catch (err: any) {
      toast({
        title: typeof err === 'string' ? err : err?.message || '智能分析出错了~',
        status: 'warning',
        duration: 5000,
        isClosable: true
      });
      onCloseAnalysesModel();
    }
    onEndAnalyses();
  }, [events, onCloseAnalysesModel, onEndAnalyses, onOpenAnalyses, onStartAnalyses, toast]);

  return (
    <Modal isOpen={true} onClose={closeFn} size={'sm'} isCentered lockFocusAcrossFrames={false}>
      <ModalOverlay />
      <ModalContent h={'90vh'} maxW={'90vw'} m={0} display={'flex'} flexDirection={'column'}>
        <ModalCloseButton fontSize={16} top={6} right={6} />
        <Flex p={7} alignItems={'center'}>
          <Box mr={3} fontSize={'xl'} fontWeight={'bold'}>
            Pod {t('Details')}
          </Box>
          <Box px={3}>
            <SealosMenu
              width={240}
              Button={
                <MenuButton
                  minW={'240px'}
                  h={'32px'}
                  textAlign={'start'}
                  bg={'grayModern.100'}
                  border={theme.borders.base}
                  borderRadius={'md'}
                >
                  <Flex px={4} alignItems={'center'}>
                    <Box flex={1}>{podAlias}</Box>
                    <ChevronDownIcon ml={2} />
                  </Flex>
                </MenuButton>
              }
              menuList={pods.map((item) => ({
                isActive: item.podName === pod.podName,
                child: <Box>{item.alias}</Box>,
                onClick: () => setPodDetail(item.podName)
              }))}
            />
          </Box>
        </Flex>
        <Grid gridTemplateColumns={'1fr 1fr'} gridGap={2} py={2} px={7}>
          <Box>
            <Box mb={3}>CPU ({pod.usedCpu.yData[pod.usedCpu.yData.length - 1]}%)</Box>
            <Box h={'80px'} w={'100%'}>
              <PodLineChart type={'blue'} data={pod.usedCpu} />
            </Box>
          </Box>
          <Box>
            <Box mb={3}>
              {t('Memory')} ({pod.usedMemory.yData[pod.usedMemory.yData.length - 1]}%)
            </Box>
            <Box h={'80px'} w={'100%'}>
              <PodLineChart type={'purple'} data={pod.usedMemory} />
            </Box>
          </Box>
        </Grid>
        <Grid py={5} flex={'1 0 0'} h={0} px={7} gridTemplateColumns={'450px 1fr'} gridGap={4}>
          <Flex flexDirection={'column'} h={'100%'}>
            <Box mb={4} color={'myGray.600'}>
              {t('Details')}
            </Box>
            <Box
              flex={'1 0 0'}
              h={0}
              backgroundColor={'myWhite.300'}
              px={7}
              py={3}
              overflowY={'auto'}
            >
              <RenderItem label={t('Status')}>
                <Box as="span" color={pod.status.color}>
                  {pod.status.label}
                </Box>
              </RenderItem>
              <RenderItem label="Restarts">{pod.restarts}</RenderItem>
              <RenderItem label="Age">{pod.age}</RenderItem>
              <RenderItem label="Pod Name">{pod.podName}</RenderItem>
              <RenderItem label="Controlled By">{`${pod.metadata?.ownerReferences?.[0].kind}/${pod.metadata?.ownerReferences?.[0].name}`}</RenderItem>
              <RenderItem label="Labels">
                <Grid gridTemplateColumns={'auto auto'} gridGap={2}>
                  {Object.entries(pod.metadata?.labels || {}).map(
                    ([key, value]: [string, string]) => (
                      <RenderTag key={key}>{`${key}=${value}`}</RenderTag>
                    )
                  )}
                </Grid>
              </RenderItem>
              <RenderItem label="Annotations">
                {Object.entries(pod.metadata?.annotations || {}).map(
                  ([key, value]: [string, string]) => (
                    <Box key={key} mb={2}>
                      <RenderTag>{`${key}=${value}`}</RenderTag>
                    </Box>
                  )
                )}
              </RenderItem>
            </Box>
          </Flex>
          <Flex position={'relative'} flexDirection={'column'} h={'100%'}>
            <Flex mb={4} alignItems={'center'}>
              <Box color={'myGray.600'}>Events</Box>
              {events.length > 0 && SHOW_EVENT_ANALYZE && (
                <Button
                  ml={3}
                  size={'sm'}
                  variant={'base'}
                  leftIcon={<MyIcon name={'analyze'} />}
                  onClick={onclickAnalyses}
                >
                  {t('Intelligent Analysis')}
                </Button>
              )}
            </Flex>
            <Box flex={'1 0 0'} h={0} overflowY={'auto'}>
              {events.map((event, i) => (
                <Box
                  key={event.id}
                  pl={6}
                  pb={6}
                  ml={4}
                  borderLeft={`2px solid ${i === events.length - 1 ? 'transparent' : '#DCE7F1'}`}
                  position={'relative'}
                  _before={{
                    content: '""',
                    position: 'absolute',
                    left: '-6.5px',
                    w: '8px',
                    h: '8px',
                    borderRadius: '8px',
                    backgroundColor: '#fff',
                    border: '2px solid',
                    borderColor: event.type === 'Warning' ? '#D92D20' : '#039855'
                  }}
                >
                  <Flex lineHeight={1} mb={2} alignItems={'center'}>
                    <Box fontWeight={'bold'}>
                      {event.reason},&ensp;Last Occur: {event.lastTime}
                    </Box>
                    <Box ml={2} color={'blackAlpha.700'}>
                      First Seen: {event.firstTime}
                    </Box>
                    <Box ml={2} color={'blackAlpha.700'}>
                      count: {event.count}
                    </Box>
                  </Flex>
                  <Box color={'blackAlpha.700'}>{event.message}</Box>
                </Box>
              ))}
              {events.length === 0 && !isLoading && (
                <Flex
                  alignItems={'center'}
                  justifyContent={'center'}
                  flexDirection={'column'}
                  h={'100%'}
                >
                  <MyIcon name="noEvents" w={'48px'} h={'48px'} color={'transparent'} />
                  <Box mt={4} color={'myGray.600'}>
                    {t('No events yet')}
                  </Box>
                </Flex>
              )}
            </Box>
            <Loading loading={isLoading} fixed={false} />
          </Flex>
        </Grid>
      </ModalContent>
      {/* analyses modal */}
      <Modal isOpen={isOpenAnalyses} onClose={onCloseAnalysesModel} lockFocusAcrossFrames={false}>
        <ModalOverlay />
        <ModalContent maxW={'50vw'} h={'70vh'}>
          <ModalHeader>Pod {t('Intelligent Analysis')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody
            className={isAnalyzing ? styles.analysesAnimation : ''}
            overflowY={'auto'}
            h={'100%'}
            whiteSpace={'pre-wrap'}
            position={'relative'}
            pb={2}
          >
            {eventAnalysesText}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Modal>
  );
};

export default Logs;

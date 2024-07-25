import { getPodEvents } from '@/api/db';
import MyIcon from '@/components/Icon';
import { defaultPod } from '@/constants/db';
import { useLoading } from '@/hooks/useLoading';
import { streamFetch } from '@/services/streamFetch';
import type { PodDetailType, PodEvent } from '@/types/db';
import { ChevronDownIcon } from '@chakra-ui/icons';
import {
  Box,
  Button,
  Collapse,
  Flex,
  Grid,
  MenuButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
  useTheme
} from '@chakra-ui/react';
import { SealosMenu, useMessage } from '@sealos/ui';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from '../index.module.scss';

const Logs = ({
  pod = defaultPod,
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
  const { message: toast } = useMessage();
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
        <Flex w={'100%'} my={'12px'} alignItems="center" fontSize={'base'}>
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
    const [isExpanded, setIsExpanded] = useState(false);
    const text = children.split('=');

    return (
      <>
        <Collapse startingHeight={'31px'} in={isExpanded}>
          <Box
            p={'4px 8px'}
            backgroundColor={'#F4F4F7'}
            whiteSpace={isExpanded ? 'wrap' : 'nowrap'}
            overflow={'hidden'}
            textOverflow={'ellipsis'}
            cursor={'pointer'}
            border={'1px solid'}
            borderColor={'#E8EBF0'}
            borderRadius={'md'}
            _hover={{
              bg: '#E8EBF0'
            }}
            onMouseUp={(e) => {
              const selection = window.getSelection();
              if (selection && selection.toString() !== '') {
                return;
              }
              setIsExpanded(!isExpanded);
            }}
          >
            <Text color={'grayModern.900'} display={'inline'}>
              {text[0]}
            </Text>
            <Text color={'grayModern.900'} display={'inline'}>
              =
            </Text>
            <Text color={'grayModern.500'} display={'inline'}>
              {text[1]}
            </Text>
          </Box>
        </Collapse>{' '}
      </>
    );
  }, []);

  const { isLoading } = useQuery(['init'], () => getPodEvents(pod.podName), {
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
        title: typeof err === 'string' ? err : err?.message || t('event_analyze_error'),
        status: 'warning',
        duration: 5000,
        isClosable: true
      });
      onCloseAnalysesModel();
    }
    onEndAnalyses();
  }, [events, onCloseAnalysesModel, onEndAnalyses, onOpenAnalyses, onStartAnalyses, t, toast]);

  return (
    <Modal isOpen={true} onClose={closeFn} size={'sm'} isCentered lockFocusAcrossFrames={false}>
      <ModalOverlay />
      <ModalContent h={'90vh'} maxW={'90vw'} m={0} display={'flex'} flexDirection={'column'}>
        <ModalHeader py={'8px'}>
          <Flex alignItems={'center'}>
            <Box mr={3} fontSize={'xl'} fontWeight={'bold'}>
              Pod {t('details')}
            </Box>
            <Box px={3}>
              <SealosMenu
                width={240}
                Button={
                  <MenuButton
                    as={Button}
                    variant={'outline'}
                    leftIcon={<MyIcon name="pods" width={'16px'} height={'16px'} />}
                    minW={'240px'}
                    h={'32px'}
                    textAlign={'start'}
                    bg={'grayModern.100'}
                    border={theme.borders.base}
                    borderRadius={'md'}
                  >
                    <Flex alignItems={'center'}>
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
          <ModalCloseButton top={'10px'} right={'10px'} />
        </ModalHeader>
        <Grid
          py={'32px'}
          flex={'1 0 0'}
          h={0}
          px={'52px'}
          gridTemplateColumns={'450px 1fr'}
          gridGap={4}
        >
          <Flex flexDirection={'column'} h={'100%'}>
            <Box fontSize={'md'} fontWeight={'bold'} mb={4} color={'grayModern.600'}>
              {t('details')}
            </Box>
            <Box
              flex={'1 0 0'}
              h={0}
              backgroundColor={'grayModern.25'}
              border={theme.borders.base}
              px={7}
              py={3}
              overflow={'overlay'}
              borderRadius={'8px'}
            >
              <RenderItem label="Restarts">{pod.restarts}</RenderItem>
              <RenderItem label="Age">{pod.age}</RenderItem>
              <RenderItem label="Pod Name">{pod.podName}</RenderItem>
              <RenderItem label="Controlled By">{`${pod.metadata?.ownerReferences?.[0].kind}/${pod.metadata?.ownerReferences?.[0].name}`}</RenderItem>
              <Box>
                <Box mb={'12px'} color={'grayModern.900'} fontSize={'base'}>
                  Labels
                </Box>
                <Flex flexWrap={'wrap'} gap={'8px'}>
                  {Object.entries(pod.metadata?.labels || {}).map(
                    ([key, value]: [string, string]) => (
                      <RenderTag key={key}>{`${key}=${value}`}</RenderTag>
                    )
                  )}
                </Flex>
              </Box>
              <Box mt={'12px'}>
                <Box mb={'12px'} color={'grayModern.900'} fontSize={'base'}>
                  Annotations
                </Box>
                <Flex flexWrap={'wrap'} gap={'8px'}>
                  {Object.entries(pod.metadata?.annotations || {}).map(
                    ([key, value]: [string, string]) => (
                      <RenderTag key={key}>{`${key}=${value}`}</RenderTag>
                    )
                  )}
                </Flex>
              </Box>
            </Box>
          </Flex>
          <Flex position={'relative'} flexDirection={'column'} h={'100%'}>
            <Flex mb={4} alignItems={'center'}>
              <Box fontSize={'md'} fontWeight={'bold'} mb={4} color={'grayModern.600'}>
                Events
              </Box>
              {/* {events.length > 0 && (
                <Button
                  ml={3}
                  size={'sm'}
                  variant={'base'}
                  leftIcon={<MyIcon name={'analyze'} />}
                  onClick={onclickAnalyses}
                >
                  {t('event_analyze')}
                </Button>
              )} */}
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
                  <Box mt={4} color={'grayModern.600'}>
                    暂无 Events
                  </Box>
                </Flex>
              )}
            </Box>
            <Loading loading={isLoading} fixed={false} />
          </Flex>
        </Grid>
      </ModalContent>
      {/* analyses modal */}
      <Modal isOpen={isOpenAnalyses} onClose={onCloseAnalysesModel}>
        <ModalOverlay />
        <ModalContent maxW={'50vw'}>
          <ModalHeader>Pod 问题分析</ModalHeader>
          <ModalCloseButton top={'10px'} right={'10px'} />
          <ModalBody position={'relative'}>
            <Box
              className={isAnalyzing ? styles.analysesAnimation : ''}
              h={'60vh'}
              overflow={'overlay'}
              whiteSpace={'pre-wrap'}
            >
              {eventAnalysesText}
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Modal>
  );
};

export default Logs;

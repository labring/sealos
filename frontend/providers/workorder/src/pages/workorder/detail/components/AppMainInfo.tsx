import { FeishuNotification, deleteFileByName, getFileUrl, uploadFile } from '@/api/platform';
import { updateWorkOrderDialogById } from '@/api/workorder';
import MyIcon from '@/components/Icon';
import Markdown from '@/components/Markdown';
import { useSelectFile } from '@/hooks/useSelectFile';
import { useToast } from '@/hooks/useToast';
import useSessionStore from '@/store/session';
import { WorkOrderDB, WorkOrderDialog } from '@/types/workorder';
import { isURL } from '@/utils/file';
import { formatTime } from '@/utils/tools';
import {
  Box,
  Button,
  Center,
  Flex,
  Icon,
  Image,
  Spinner,
  Text,
  Textarea,
  keyframes
} from '@chakra-ui/react';
import { fetchEventSource } from '@fortaine/fetch-event-source';
import { throttle } from 'lodash';
import { useTranslation } from 'next-i18next';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const statusAnimation = keyframes`
  0% {
    opacity: 1;
  }

  100% {
    opacity: 0.11;
  }
`;

const CommandTip = () => {
  const { t } = useTranslation();

  return (
    <Flex alignItems={'center'} gap={'4px'} color={'rgb(153, 153, 153)'} fontSize={'12px'}>
      <Icon
        xmlns="http://www.w3.org/2000/svg"
        width="12px"
        height="12px"
        viewBox="0 0 24 24"
        fill="transparent"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="9 10 4 15 9 20"></polyline>
        <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
      </Icon>
      <Text>{t('send')}</Text>
      <Text>/</Text>
      <Flex alignItems={'center'}>
        <Icon
          fill={'rgb(153, 153, 153)'}
          height="12px"
          width="12px"
          viewBox="0 0 32 32"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="m21 28h-10a2.0023 2.0023 0 0 1 -2-2v-10h-5a1 1 0 0 1 -.707-1.707l12-12a.9994.9994 0 0 1 1.414 0l12 12a1 1 0 0 1 -.707 1.707h-5v10a2.0027 2.0027 0 0 1 -2 2zm-14.5859-14h4.5859v12h10v-12h4.5859l-9.5859-9.5859z" />
          <path d="m0 0h32v32h-32z" fill="none" />
        </Icon>
        <Icon
          xmlns="http://www.w3.org/2000/svg"
          width="12px"
          height="12px"
          viewBox="0 0 24 24"
          fill="transparent"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 10 4 15 9 20"></polyline>
          <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
        </Icon>
      </Flex>
      <Text>{t('newline')}</Text>
    </Flex>
  );
};

const AppMainInfo = ({
  app,
  refetchWorkOrder,
  isManuallyHandled
}: {
  app: WorkOrderDB;
  refetchWorkOrder: () => void;
  isManuallyHandled: boolean;
}) => {
  const textareaMinH = '50px';
  const [isLoading, setIsloading] = useState(false);
  const { session } = useSessionStore();
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const { toast } = useToast();
  const [dialogs, setDialogs] = useState(app?.dialogs || []);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messageBoxRef = useRef<HTMLDivElement>(null);
  const TextareaDom = useRef<HTMLTextAreaElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<
    {
      fileName: string;
      originalName: string;
      fileUrl: string;
    }[]
  >();

  const { File, onOpen } = useSelectFile({
    fileType: 'image/*',
    multiple: true
  });

  const removeFile = async (fileName: string) => {
    await deleteFileByName({ fileName: fileName });
    setUploadedFiles(
      (prevFiles) => prevFiles && prevFiles.filter((file) => file.fileName !== fileName)
    );
  };

  const uploadFiles = async (files: File[]) => {
    const form = new FormData();
    files.forEach((item) => {
      form.append('file', item, encodeURIComponent(item.name));
    });
    const temp = await uploadFile(form);
    setUploadedFiles(temp.map((i) => ({ ...i, fileUrl: '' })));

    const result = await Promise.all(
      temp.map(async (i) => {
        const fileUrl = await getFileUrl({ fileName: i.fileName });
        return {
          fileName: i.fileName,
          originalName: i.originalName,
          fileUrl: fileUrl
        };
      })
    );
    setUploadedFiles(result);
  };

  const handleSend = async () => {
    if (!session) return;
    const promises: Promise<any>[] = [];
    const temps: WorkOrderDialog[] = [];
    if (isChatLoading) {
      toast({
        status: 'info',
        title: t('please wait for the end')
      });
      return;
    }
    setIsChatLoading(true);
    try {
      if (uploadedFiles) {
        uploadedFiles.forEach((i) => {
          const temp: WorkOrderDialog = {
            time: new Date(),
            content: i.fileUrl,
            userId: session?.user?.userId,
            isAdmin: session?.user?.isAdmin,
            isAIBot: false
          };
          temps.push(temp);
          promises.push(
            updateWorkOrderDialogById({
              orderId: app.orderId,
              content: temp.content
            })
          );
        });
        setUploadedFiles(undefined);
      }
      if (text !== '') {
        const temp: WorkOrderDialog = {
          time: new Date(),
          content: text,
          userId: session?.user?.userId,
          isAdmin: session?.user?.isAdmin,
          isAIBot: false
        };
        temps.push(temp);
        promises.push(
          updateWorkOrderDialogById({
            orderId: app.orderId,
            content: temp.content
          })
        );
        setText('');
      }

      setDialogs((v) => [...v, ...temps]);
      await Promise.all(promises);
      if (text !== '' && !session?.user?.isAdmin) {
        await triggerRobotReply();
      }
    } catch (error) {
      console.log(error);
      toast({ title: t('network anomaly'), status: 'error' });
      setDialogs((v) => v.slice(0, v.length - temps.length));
      setText('');
      setUploadedFiles(undefined);
    }
    setIsChatLoading(false);
  };

  const triggerRobotReply = async () => {
    let temp = '';
    try {
      if (!app.manualHandling.isManuallyHandled && !session?.user?.isAdmin) {
        await fetchEventSource('/api/ai/fastgpt', {
          method: 'POST',
          headers: {
            Authorization: useSessionStore.getState()?.session?.token || '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            orderId: app.orderId
          }),
          openWhenHidden: true,
          onmessage: async ({ event, data }) => {
            if (data === '[DONE]') {
              return;
            }
            if (event === '[LIMIT]') {
              toast({ status: 'error', title: t('Request exceeds limit') });
              handleTransferToHuman();
              return;
            }
            if (event === 'error') {
              toast({ status: 'error', title: t('api is error') });
              return;
            }

            const json = JSON.parse(data);

            const text = json?.choices?.[0]?.delta?.content || '';
            temp += text;

            if (temp && temp !== '') {
              const updatedLastDialog = {
                time: new Date(),
                userId: 'robot',
                isAdmin: false,
                isAIBot: true,
                content: temp
              };
              setDialogs((prevDialogs) => {
                const lastDialog = prevDialogs[prevDialogs.length - 1];
                if (lastDialog && lastDialog.userId === 'robot') {
                  return [...prevDialogs.slice(0, -1), updatedLastDialog];
                } else {
                  return [...prevDialogs, updatedLastDialog];
                }
              });
            }
          },
          onerror(err) {
            console.log(err);
          }
        });

        if (temp !== '') {
          await updateWorkOrderDialogById({
            orderId: app.orderId,
            content: temp,
            isRobot: true
          });
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleTransferToHuman = async () => {
    try {
      setIsloading(true);
      await FeishuNotification({
        type: app.type,
        description: app.description,
        orderId: app.orderId,
        switchToManual: true
      });
      toast({
        title: t('Notification SwitchToManual Tips'),
        status: 'success'
      });
    } catch (error) {
      toast({
        title: t('network anomaly'),
        status: 'error'
      });
    }
    setIsloading(false);
    refetchWorkOrder();
  };

  const scrollToBottom = useRef(
    throttle(() => {
      const boxElement = messageBoxRef.current;
      if (boxElement) {
        requestAnimationFrame(() => {
          boxElement.scrollTop = boxElement.scrollHeight;
        });
      }
    }, 1000)
  ).current;

  useLayoutEffect(() => {
    scrollToBottom();
  }, [dialogs, scrollToBottom]);

  useEffect(() => {
    if (app?.dialogs?.length === 1) {
      triggerRobotReply();
    }
  }, []);

  useEffect(() => {
    if (isManuallyHandled && app?.dialogs) {
      setDialogs(app?.dialogs);
    }
  }, [app?.dialogs, isManuallyHandled]);

  return (
    <>
      <Text fontSize={'18px'} fontWeight={500} color={'#24282C'} mt="24px" ml="36px">
        {t('Order Conversation')}
      </Text>
      <Box
        id="messageBoxRef"
        ref={messageBoxRef}
        pl="71px"
        pr="64px"
        mt="24px"
        position={'relative'}
        flex={'1 0 0'}
        h="0"
        w="100%"
        overflow={'auto'}
        scrollBehavior={'smooth'}
      >
        {dialogs &&
          dialogs?.map((item, index) => {
            return (
              <Box key={item.time.toString() + index}>
                {index === 0 ||
                (dialogs?.[index - 1] &&
                  new Date(dialogs[index - 1].time).getTime() <
                    new Date(item.time).getTime() - 5 * 60 * 1000) ? (
                  <Flex
                    fontSize={'12px'}
                    fontWeight={400}
                    color={'#5A646E'}
                    justifyContent={'center'}
                  >
                    {formatTime(item.time, 'YYYY-MM-DD HH:mm')}
                  </Flex>
                ) : null}
                <Flex w="100%" gap="16px" mb="16px">
                  <Center
                    border={'1px solid #fdfdfe'}
                    w={'36px'}
                    h={'36px'}
                    bg={'#f2f5f7'}
                    borderRadius={'full'}
                    filter={
                      'drop-shadow(0px 0px 1px rgba(121, 141, 159, 0.25)) drop-shadow(0px 2px 4px rgba(161, 167, 179, 0.25))'
                    }
                  >
                    <MyIcon
                      width={'24px'}
                      name={
                        item.isAdmin ? 'sealosAvator' : item.isAIBot ? 'robot' : 'defaultAvator'
                      }
                      color={'#219BF4'}
                    />
                  </Center>

                  <Box flex={1} fontSize={'12px'} color={'#24282C'}>
                    <Box fontSize={'12px'} fontWeight={500}>
                      {item.isAdmin ? (
                        <Flex gap={'4px'}>
                          <Text>Sealos 支持</Text>
                          <Text color={'#7B838B'}>ID:{item.userId}</Text>
                        </Flex>
                      ) : item.isAIBot && isChatLoading ? (
                        <Box
                          animation={
                            isChatLoading && index === dialogs.length - 1
                              ? `${statusAnimation} 0.8s linear infinite alternate`
                              : ''
                          }
                        >
                          Robot
                        </Box>
                      ) : (
                        item.userId
                      )}
                    </Box>

                    <Box mt="4px" p="12px" bg="#F6F8F9" borderRadius={'4px'} fontWeight={400}>
                      {isURL(item.content) ? (
                        <Image alt="img" src={item.content} onLoad={() => scrollToBottom()}></Image>
                      ) : (
                        <Box fontWeight={400}>
                          <Markdown source={item.content} />
                        </Box>
                      )}
                    </Box>
                    {index === dialogs?.length - 1 &&
                      !session?.user.isAdmin &&
                      !app?.manualHandling?.isManuallyHandled && (
                        <Button
                          isLoading={isLoading}
                          h="28px"
                          onClick={handleTransferToHuman}
                          fontSize={'12px'}
                          mt={'4px'}
                        >
                          {t('Switch to manual')}
                        </Button>
                      )}
                  </Box>
                </Flex>
              </Box>
            );
          })}
      </Box>

      <Flex
        mx="71px"
        mb="24px"
        position={'relative'}
        px="12px"
        py="8px"
        borderRadius={'4px'}
        boxShadow={
          '0px 0px 1px 0px rgba(121, 141, 159, 0.25), 0px 2px 4px 0px rgba(161, 167, 179, 0.25)'
        }
        border={'1px solid #EAEBF0'}
        flexDirection={'column'}
      >
        {uploadedFiles && (
          <Flex alignItems={'center'} gap={'4px'} wrap={'wrap'} mb={'4px'}>
            {uploadedFiles.map((file, index) => (
              <Flex
                flexShrink={'0'}
                height={'28px'}
                key={file.fileName}
                padding={'4px'}
                alignItems={'center'}
                gap={'4px'}
                fontSize={'12px'}
                fontWeight={'400'}
                color={'#24282C'}
                bg={'#F4F4F7'}
              >
                <Icon
                  xmlns="http://www.w3.org/2000/svg"
                  width="20px"
                  height="20px"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <g clipPath="url(#clip0_192_9620)">
                    <path
                      d="M16.6667 2.5C17.1087 2.5 17.5326 2.67559 17.8452 2.98816C18.1577 3.30072 18.3333 3.72464 18.3333 4.16667V15.8333C18.3333 16.2754 18.1577 16.6993 17.8452 17.0118C17.5326 17.3244 17.1087 17.5 16.6667 17.5H3.33333C2.89131 17.5 2.46738 17.3244 2.15482 17.0118C1.84226 16.6993 1.66667 16.2754 1.66667 15.8333V4.16667C1.66667 3.72464 1.84226 3.30072 2.15482 2.98816C2.46738 2.67559 2.89131 2.5 3.33333 2.5H16.6667ZM16.6667 4.16667H3.33333V15.8333H4.1075L11.8642 8.07667C11.9609 7.97991 12.0757 7.90316 12.2021 7.85079C12.3285 7.79842 12.464 7.77147 12.6008 7.77147C12.7376 7.77147 12.8731 7.79842 12.9995 7.85079C13.1259 7.90316 13.2408 7.97991 13.3375 8.07667L16.6667 11.405V4.16667ZM12.6008 9.69667L6.46417 15.8333H16.6667V13.7625L12.6008 9.69667ZM6.25 5.83333C6.58152 5.83333 6.89946 5.96503 7.13388 6.19945C7.3683 6.43387 7.5 6.75181 7.5 7.08333C7.5 7.41485 7.3683 7.7328 7.13388 7.96722C6.89946 8.20164 6.58152 8.33333 6.25 8.33333C5.91848 8.33333 5.60054 8.20164 5.36612 7.96722C5.1317 7.7328 5 7.41485 5 7.08333C5 6.75181 5.1317 6.43387 5.36612 6.19945C5.60054 5.96503 5.91848 5.83333 6.25 5.83333Z"
                      fill="#47C8BF"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_192_9620">
                      <rect width="20" height="20" fill="white" />
                    </clipPath>
                  </defs>
                </Icon>
                <Text>{file.originalName}</Text>
                <Center
                  w={'20px'}
                  h={'20px'}
                  cursor={'pointer'}
                  onClick={() => removeFile(file.fileName)}
                >
                  {file.fileUrl ? (
                    <Icon
                      xmlns="http://www.w3.org/2000/svg"
                      width="12px"
                      height="12px"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M2.64645 2.64645C2.84171 2.45118 3.15829 2.45118 3.35355 2.64645L6 5.29289L8.64645 2.64645C8.84171 2.45118 9.15829 2.45118 9.35355 2.64645C9.54882 2.84171 9.54882 3.15829 9.35355 3.35355L6.70711 6L9.35355 8.64645C9.54882 8.84171 9.54882 9.15829 9.35355 9.35355C9.15829 9.54882 8.84171 9.54882 8.64645 9.35355L6 6.70711L3.35355 9.35355C3.15829 9.54882 2.84171 9.54882 2.64645 9.35355C2.45118 9.15829 2.45118 8.84171 2.64645 8.64645L5.29289 6L2.64645 3.35355C2.45118 3.15829 2.45118 2.84171 2.64645 2.64645Z"
                        fill="#485264"
                      />
                    </Icon>
                  ) : (
                    <Spinner size={'xs'} thickness="1px" />
                  )}
                </Center>
              </Flex>
            ))}
          </Flex>
        )}

        <Textarea
          ref={TextareaDom}
          placeholder="在这里输入你的消息..."
          variant={'unstyled'}
          value={text}
          p={'0'}
          resize={'none'}
          maxH={'200px'}
          overflowWrap={'break-word'}
          overflowY={'auto'}
          _focusVisible={{
            border: 'none'
          }}
          whiteSpace={'pre-wrap'}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = textareaMinH;
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        <Flex alignItems={'center'} alignSelf={'end'} h="28px" gap="20px">
          <CommandTip />
          <Icon
            cursor={'pointer'}
            xmlns="http://www.w3.org/2000/svg"
            width="24px"
            height="24px"
            viewBox="0 0 24 24"
            fill="none"
            onClick={() => {
              onOpen();
            }}
          >
            <path
              d="M8.46502 11.2931C9.59802 10.1601 11.574 10.1601 12.707 11.2931L13.414 12.0001L14.828 10.5861L14.121 9.87906C13.178 8.93506 11.922 8.41406 10.586 8.41406C9.25002 8.41406 7.99402 8.93506 7.05102 9.87906L4.92902 12.0001C3.99332 12.9388 3.4679 14.2101 3.4679 15.5356C3.4679 16.861 3.99332 18.1323 4.92902 19.0711C5.3929 19.5356 5.94399 19.9039 6.55064 20.1548C7.15729 20.4057 7.80754 20.5342 8.46402 20.5331C9.12068 20.5344 9.77114 20.406 10.378 20.1551C10.9848 19.9042 11.5361 19.5358 12 19.0711L12.707 18.3641L11.293 16.9501L10.586 17.6571C10.0225 18.2181 9.25969 18.533 8.46452 18.533C7.66935 18.533 6.90655 18.2181 6.34302 17.6571C5.78153 17.0938 5.46623 16.3309 5.46623 15.5356C5.46623 14.7402 5.78153 13.9773 6.34302 13.4141L8.46502 11.2931Z"
              fill="#7B838B"
            />
            <path
              d="M12 4.92899L11.293 5.63599L12.707 7.04999L13.414 6.34299C13.9775 5.78198 14.7403 5.46702 15.5355 5.46702C16.3307 5.46702 17.0935 5.78198 17.657 6.34299C18.2185 6.90626 18.5338 7.66916 18.5338 8.46449C18.5338 9.25983 18.2185 10.0227 17.657 10.586L15.535 12.707C14.402 13.84 12.426 13.84 11.293 12.707L10.586 12L9.172 13.414L9.879 14.121C10.822 15.065 12.078 15.586 13.414 15.586C14.75 15.586 16.006 15.065 16.949 14.121L19.071 12C20.0067 11.0613 20.5321 9.78991 20.5321 8.46449C20.5321 7.13908 20.0067 5.86771 19.071 4.92899C18.1325 3.9928 16.8611 3.46704 15.5355 3.46704C14.2099 3.46704 12.9385 3.9928 12 4.92899Z"
              fill="#7B838B"
            />
          </Icon>
          <Button
            variant={'primary'}
            w="71px"
            h="28px"
            borderRadius={'4px'}
            onClick={() => handleSend()}
          >
            {t('Send')}
          </Button>
        </Flex>

        <File onSelect={(e) => uploadFiles(e)} />
      </Flex>
    </>
  );
};

export default AppMainInfo;

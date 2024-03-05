import { updateOrderDialogById } from '@/api/order';
import { getFileUrl, uploadFile } from '@/api/platform';
import { useSelectFile } from '@/hooks/useSelectFile';
import { useToast } from '@/hooks/useToast';
import useSessionStore from '@/store/session';
import { OrderDB } from '@/types/order';
import { isURL } from '@/utils/file';
import { formatTime } from '@/utils/tools';
import { Avatar, Box, Button, Flex, Icon, Image, Text, Textarea } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { useEffect, useRef, useState } from 'react';

const AppMainInfo = ({ app, refetch }: { app: OrderDB; refetch: () => void }) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const { isAdmin } = useSessionStore();
  const { toast } = useToast();
  const messageBoxRef = useRef<HTMLDivElement>(null);

  const { File, onOpen } = useSelectFile({
    fileType: 'image/*',
    multiple: false
  });

  const handleSelectFile = async (files: File[]) => {
    try {
      const form = new FormData();
      files.forEach((item) => {
        console.log(item.name);
        form.append('file', item, encodeURIComponent(item.name));
      });
      const result = await uploadFile(form);
      const fileUrl = await getFileUrl({ fileName: result[0] });
      await updateOrderDialogById({
        orderID: app.orderID,
        content: fileUrl ? fileUrl : ''
      });
      refetch();
    } catch (error) {
      toast({
        status: 'error',
        title: t('File upload failed')
      });
    }
  };

  const handleSend = async () => {
    try {
      if (text === '') return;
      await updateOrderDialogById({
        orderID: app.orderID,
        content: text
      });
      setText('');
    } catch (error) {
      console.log(error);
    }
    refetch();
  };

  const scrollToBottom = () => {
    const boxElement = messageBoxRef.current;
    if (boxElement) {
      boxElement.scrollTop = boxElement.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [app?.dialogs?.length]);

  return (
    <>
      <Text fontSize={'18px'} fontWeight={500} color={'#24282C'} mt="24px" ml="36px">
        {t('Order Conversation')}
      </Text>
      <Box
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
        {app?.dialogs &&
          app?.dialogs?.map((item, index) => {
            return (
              <Box key={item.time.toString() + index}>
                {index === 0 ||
                (app?.dialogs?.[index - 1] &&
                  new Date(app?.dialogs[index - 1].time).getTime() <
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
                  <Avatar w="36px" h="36px" src={item.isAdmin ? '/icons/sealos.svg' : ''} />
                  <Box flex={1} fontSize={'12px'} color={'#24282C'}>
                    <Text fontWeight={500}>{item.isAdmin ? 'sealos 支持' : item.userID}</Text>
                    <Box mt="4px" p="12px" bg="#F6F8F9" borderRadius={'4px'} fontWeight={400}>
                      {isURL(item.content) ? (
                        <Image alt="img" src={item.content} onLoad={() => scrollToBottom()}></Image>
                      ) : (
                        <Box whiteSpace={'pre-line'} fontWeight={400}>
                          {item.content}
                        </Box>
                      )}
                    </Box>
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
        pb="12px"
        borderRadius={'4px'}
        boxShadow={
          '0px 0px 1px 0px rgba(121, 141, 159, 0.25), 0px 2px 4px 0px rgba(161, 167, 179, 0.25)'
        }
        border={'1px solid #EAEBF0'}
        flexDirection={'column'}
      >
        <Textarea
          h={'100%'}
          variant={'unstyled'}
          resize={'none'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.altKey) {
              e.preventDefault();
              handleSend();
            }
            if (e.key === 'Enter' && e.altKey) {
              e.preventDefault();
              const cursorPosition = e.currentTarget.selectionStart;
              const newText = `${text.substring(0, cursorPosition)}\n${text.substring(
                cursorPosition
              )}`;
              setText(newText);
            }
          }}
        ></Textarea>
        <Flex alignItems={'center'} alignSelf={'end'} h="28px" gap="20px">
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
          <Button variant={'primary'} w="71px" h="28px" borderRadius={'4px'} onClick={handleSend}>
            {t('Send')}
          </Button>
        </Flex>
        <File onSelect={handleSelectFile} />
      </Flex>
    </>
  );
};

export default AppMainInfo;

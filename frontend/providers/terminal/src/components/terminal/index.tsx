import Iconfont from '@/components/iconfont';
import { Box, Flex, Text } from '@chakra-ui/react';
import { debounce } from 'lodash';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import styles from './index.module.scss';

type Terminal = {
  id: string;
  command?: string;
};

function Terminal({ url }: { url: string }) {
  const [tabId, setTabId] = useState(nanoid(6));
  const router = useRouter();
  const { query } = router;

  const [tabContents, setTabContents] = useState<Terminal[]>([
    {
      id: tabId,
      command:
        query?.defaultCommand && typeof query?.defaultCommand === 'string'
          ? decodeURIComponent(query.defaultCommand)
          : ''
    }
  ]);

  useEffect(() => {
    const event = (e: MessageEvent) => {
      if (
        e.origin === process.env.NEXT_PUBLIC_SITE &&
        e.data.type === 'new terminal' &&
        e.data.command
      ) {
        newTerminal(decodeURIComponent(e.data.command));
      }
    };
    try {
      window.addEventListener('message', event);
    } catch (error) {}
    return () => window.removeEventListener('message', event);
  }, []);

  const onLoadIframe = (e: any, item: Terminal) => {
    try {
      if (item.command) {
        setTimeout(() => {
          e.target.contentWindow.postMessage({ command: item.command }, url);
        }, 2000);
      }
    } catch (error) {}
  };

  const newTerminal = (command?: string) => {
    const temp = nanoid(6);
    setTabContents((pre) => {
      return [
        ...pre,
        {
          id: temp,
          command: command
        }
      ];
    });
    setTabId(temp);
  };

  const deleteTerminal = (key: string) => {
    if (tabContents.length <= 1) return;
    setTabContents((pre) => {
      const temp = pre.filter((item) => item.id !== key);
      setTabId(temp[temp.length - 1].id);
      return temp;
    });
  };

  const onTabChange = (id: string) => {
    setTabId(id);
  };

  return (
    <Flex w="100%" h="100%" color="white" bg="#2b2b2b" overflow={'hidden'}>
      <Flex
        backgroundColor={'#2C3035'}
        userSelect={'none'}
        flexDirection={'column'}
        cursor={'pointer'}
        className={styles.containerLeft}
      >
        <Flex
          flexShrink={0}
          h="50px"
          pl="16px"
          alignItems={'center'}
          borderBottom={'2px solid #232528'}
          _hover={{ background: '#282B30' }}
          onClick={debounce(() => newTerminal(), 500)}
        >
          <Iconfont
            color="rgba(255, 255, 255, 0.9)"
            iconName="icon-a-material-symbols_addadd1"
            width={16}
            height={16}
          />
          <Text color="rgba(255, 255, 255, 0.9)" pl={'8px'} isTruncated>
            Add a Terminal
          </Text>
        </Flex>
        <Box overflowX={'hidden'} overflowY="auto" pb="20px">
          {tabContents?.map((item: Terminal, index: number) => {
            return (
              <Flex
                py="12px"
                pl="16px"
                pr="12px"
                bg={item?.id === tabId ? '#232528' : ''}
                _hover={{ bg: item?.id === tabId ? '#232528' : '#282b30' }}
                key={item?.id}
                alignItems="center"
                onClick={() => onTabChange(item?.id)}
                className={styles.tabs}
                data-isactive={item?.id === tabId}
              >
                <Iconfont
                  iconName="icon-codicon_terminalterminal"
                  color="rgba(255, 255, 255, 0.9)"
                  width={14}
                  height={14}
                ></Iconfont>
                <Text isTruncated color="rgba(255, 255, 255, 0.9)" pl="8px">
                  {`terminal ${index + 1}`}
                </Text>
                <Box
                  ml="auto"
                  className={styles.closeIcon}
                  onClick={() => deleteTerminal(item?.id)}
                >
                  <Iconfont
                    iconName="icon-delete"
                    color="rgba(255, 255, 255, 0.9)"
                    width={14}
                    height={14}
                  ></Iconfont>
                </Box>
              </Flex>
            );
          })}
        </Box>
      </Flex>
      {tabContents?.map((item: Terminal) => {
        return (
          <Box flexGrow={1} key={item?.id} display={item?.id === tabId ? 'block' : 'none'}>
            <iframe
              onLoad={(e) => onLoadIframe(e, item)}
              className={styles.iframeWindow}
              id={tabId}
              src={url}
              allow="camera;microphone;clipboard-write;"
            />
          </Box>
        );
      })}
    </Flex>
  );
}

export default Terminal;

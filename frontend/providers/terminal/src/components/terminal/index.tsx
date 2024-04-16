import Iconfont from '@/components/iconfont';
import { Box, Flex, Text } from '@chakra-ui/react';
import { debounce } from 'lodash';
import { nanoid } from 'nanoid';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import styles from './index.module.scss';
import useSessionStore from '@/store/session';

type Terminal = {
  id: string;
  command?: string;
};

function Terminal({ url, site }: { url: string; site: string }) {
  const [tabId, setTabId] = useState(nanoid(6));
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { query } = router;
  const session = useSessionStore((s) => s.session);
  const nsid = session?.user?.nsid;
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
    const event = async (e: MessageEvent) => {
      const whitelist = [url, site];
      if (!whitelist.includes(e.origin)) return;
      try {
        if (e.data.type === 'new terminal' && e.data.command) {
          newTerminal(decodeURIComponent(e.data.command));
        }
        if (e.data?.ttyd === 'ready') {
          iframeRef.current?.contentWindow?.postMessage(
            {
              command: `kubectl config set-context --current --namespace=${nsid} && export PS1="\\u@(${nsid}) \\W\\$ " && clear`
            },
            url
          );
          iframeRef.current?.contentWindow?.postMessage(
            {
              command: `echo -e "\\e[A\\e[K 👉  Switched to namespace \\e[1;4;32m${nsid}\\e[0m" && history -c`
            },
            url
          );
          const command = iframeRef.current?.getAttribute('data-command');
          iframeRef?.current?.contentWindow?.postMessage({ command }, url);
        }
      } catch (error) {
        console.log(error, 'error');
      }
    };
    window.addEventListener('message', event);
    return () => window.removeEventListener('message', event);
  }, [site, url]);

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
        backgroundColor={'#1A1A1A'}
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
          _hover={{ background: '#232323' }}
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
                bg={item?.id === tabId ? '#2B2B2B' : ''}
                _hover={{ bg: item?.id === tabId ? '#2B2B2B' : '#232323' }}
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
              ref={iframeRef}
              data-command={item?.command}
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

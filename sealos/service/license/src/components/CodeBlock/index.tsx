import { useCopyData } from '@/hooks/useCopyData';
import { Box, Center, Divider, Flex, FlexProps, Text } from '@chakra-ui/react';
import { CSSProperties } from 'react';
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { CopyIcon } from '@/components/Icon';

type CodeBlockProps = {
  copyCode: string;
  displayCode?: string;
  language: string;
  customStyle?: CSSProperties | undefined;
  flexStyle?: FlexProps;
};

export default function CodeBlock({
  displayCode,
  copyCode,
  language,
  customStyle,
  flexStyle
}: CodeBlockProps) {
  const { copyData } = useCopyData();

  return (
    <Flex
      position={'relative'}
      backgroundColor="#F8FAFB"
      borderRadius={'6px'}
      {...flexStyle}
      border={'1px solid #EAEBF0'}
      _hover={{
        '.copy-button': {
          opacity: 0.9
        }
      }}
    >
      <Flex
        flex={1}
        alignItems={'center'}
        overflowX={'scroll'}
        pt="16px"
        pb="10px"
        px="20px"
        fontSize={'14px'}
      >
        <Box mr="10px" color={'#B779D4'} alignSelf={'self-start'}>
          #
        </Box>
        <SyntaxHighlighter
          language={language}
          customStyle={{
            background: '#F8FAFB',
            color: '#24282c'
          }}
          {...customStyle}
        >
          {displayCode ? displayCode : copyCode}
        </SyntaxHighlighter>
      </Flex>

      <Center
        position="absolute" // 绝对定位
        top="16px" // 顶部对齐
        right="8px" // 右侧对齐
        cursor={'pointer'}
        onClick={() => copyData(copyCode)}
        className="copy-button"
        opacity={0}
        transition="opacity 0.3s"
      >
        <CopyIcon fill="#219BF4" />
      </Center>
    </Flex>
  );
}

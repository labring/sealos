import { useCopyData } from '@/hooks/useCopyData';
import { Box, Center, Divider, Flex, FlexProps, Text } from '@chakra-ui/react';
import { CSSProperties } from 'react';
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { CopyIcon } from '@/components/Icon';

type CodeBlockProps = {
  code: string;
  copyValue?: string;
  language: string;
  customStyle?: CSSProperties | undefined;
  flexStyle?: FlexProps;
};

export default function CodeBlock({
  code,
  language,
  customStyle,
  flexStyle,
  copyValue
}: CodeBlockProps) {
  const { copyData } = useCopyData();

  return (
    <Flex
      position={'relative'}
      backgroundColor="#F8FAFB"
      borderRadius={'6px'}
      {...flexStyle}
      border={'1px solid #EAEBF0'}
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
          $
        </Box>
        <SyntaxHighlighter
          language={language}
          customStyle={{
            background: '#F8FAFB',
            color: '#24282c'
          }}
        >
          {code}
        </SyntaxHighlighter>
      </Flex>
      <Divider orientation="vertical" bg="#EAEBF0" h="auto" />
      <Center mx="20px" cursor={'pointer'} onClick={() => copyData(copyValue ? copyValue : code)}>
        <CopyIcon fill="#219BF4" />
      </Center>
    </Flex>
  );
}

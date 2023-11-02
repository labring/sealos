import { useCopyData } from '@/hooks/useCopyData';
import { Box, Center, Flex, FlexProps, Text } from '@chakra-ui/react';
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
    <Flex position={'relative'} backgroundColor="#24282C" borderRadius={'6px'} {...flexStyle}>
      <Flex
        flex={1}
        alignItems={'center'}
        overflowX={'scroll'}
        pt="16px"
        pb="10px"
        px="20px"
        fontSize={'14px'}
      >
        <Box mr="10px" color={'#c99bdf'} alignSelf={'self-start'}>
          $
        </Box>
        <SyntaxHighlighter language={language} customStyle={customStyle}>
          {code}
        </SyntaxHighlighter>
      </Flex>
      <Center mx="20px" onClick={() => copyData(copyValue ? copyValue : code)}>
        <CopyIcon _hover={{ fill: '#219BF4' }} />
      </Center>
    </Flex>
  );
}

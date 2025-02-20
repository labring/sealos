import { useMemo } from 'react';
import { Box } from '@chakra-ui/react';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';

import { codeTheme } from '@/constants/hljs';

type TMarkDown = {
  content: string;
  language: string;
  [key: string]: any;
};

const Code = ({ content, language, ...props }: TMarkDown) => {
  const code = useMemo(() => '```' + language + '\n' + content + '```', [content, language]);

  return (
    <Box
      sx={{
        height: '100%',
        '& div': {
          overflow: 'auto !important'
        }
      }}
    >
      <ReactMarkdown
        {...props}
        // eslint-disable-next-line react/no-children-prop
        children={code}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                // eslint-disable-next-line react/no-children-prop
                children={String(children).replace(/\n$/, '')}
                showLineNumbers={true}
                // @ts-ignore nextline
                style={codeTheme}
                language={match[1]}
                PreTag="div"
                {...props}
              />
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
        }}
      />
    </Box>
  );
};

export default Code;

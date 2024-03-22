import { ReactNode, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { codeTheme } from './hljs';
import { Box, BoxProps } from '@chakra-ui/react';
import { ReactMarkdownOptions } from 'react-markdown/lib/react-markdown';

type YamlCodeProps = Omit<BoxProps, 'children'> & { markdown: ReactMarkdownOptions };

export default function YamlCode(props: YamlCodeProps) {
  const { markdown, ...rest } = props;
  const { children, components, ...markdownRest } = markdown;
  const markdownCode = useMemo(() => '```yaml\n' + children + '```', [children]);
  return (
    <Box
      sx={{
        '>': {
          h: '100%'
        }
      }}
      {...rest}
      children={
        <ReactMarkdown
          {...markdownRest}
          children={markdownCode}
          components={{
            code({ node, inline, className, children, ...rest }) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                ((
                  <SyntaxHighlighter
                    {...rest}
                    children={String(children).replace(/\n$/, '')}
                    showLineNumbers={true}
                    language={match[1]}
                    PreTag="div"
                    style={codeTheme}
                  />
                ) as any)
              ) : (
                <code className={className} {...rest}>
                  {children}
                </code>
              );
            },
            ...components
          }}
        />
      }
    />
  );
}

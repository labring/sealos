import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';

import { cn } from '@/lib/utils';
import { codeTheme } from '@/constants/hljs';

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface CodeProps {
  content: string;
  language: string;
  className?: string;
}

const Code = ({ content, language, className }: CodeProps) => {
  const code = useMemo(() => '```' + language + '\n' + content + '```', [content, language]);

  return (
    <ScrollArea className="h-full w-full min-w-0 pr-1 pb-1">
      <div className={cn('w-full min-w-0 rounded-md bg-card text-card-foreground', className)}>
        <div className="relative w-full">
          <ReactMarkdown
            className="w-full min-w-0"
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
                    codeTagProps={{
                      style: {
                        fontFamily: 'var(--font-fira-code)',
                        fontSize: '12px',
                        lineHeight: '150%',
                        fontWeight: 450,
                        margin: 0
                      }
                    }}
                    customStyle={{
                      margin: 0,
                      width: '100%'
                    }}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  />
                ) : (
                  <code
                    className={cn(
                      'rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm',
                      className
                    )}
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
            }}
          >
            {code}
          </ReactMarkdown>
        </div>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};

export default Code;

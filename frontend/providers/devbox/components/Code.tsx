import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';

import { cn } from '@/lib/utils';
import { codeTheme } from '@/constants/hljs';

interface CodeProps {
  content: string;
  language: string;
  className?: string;
}

const Code = ({ content, language, className }: CodeProps) => {
  const code = useMemo(() => '```' + language + '\n' + content + '```', [content, language]);

  return (
    <div className={cn('h-full w-full rounded-md bg-card text-card-foreground', className)}>
      <div className="relative h-full overflow-auto">
        <ReactMarkdown
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
                      fontFamily: 'var(--font-fira-code)'
                    }
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
  );
};

export default Code;

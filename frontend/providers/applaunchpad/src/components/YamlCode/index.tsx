import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { codeTheme } from './hljs';
import styles from './index.module.scss';

type TMarkDown = {
  content: string;
  [key: string]: any;
};

const YamlCode = ({ content, ...props }: TMarkDown) => {
  const code = useMemo(() => '```yaml\n' + content + '```', [content]);

  return (
    <ReactMarkdown
      {...props}
      className={styles.markdown}
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
  );
};

export default YamlCode;

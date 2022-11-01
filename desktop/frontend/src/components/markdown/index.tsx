import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import styles from './index.module.scss';

const MarkDown = ({ text }: { text: string }) => {
  const copyContent = () => {
    navigator.clipboard.writeText(text);
  };
  return (
    <div className={styles.copyMark}>
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                showLineNumbers={true}
                // style={darkMode ? them.dark : them.light}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {text ?? ''}
      </ReactMarkdown>
      <div className={styles.copyMarkBtn} onClick={() => copyContent()}>
        复制
      </div>
    </div>
  );
};

export default MarkDown;

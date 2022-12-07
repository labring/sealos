/* eslint-disable react/no-children-prop */
import { V1SELinuxOptions } from '@kubernetes/client-node';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { vs, vs2015, stackoverflowLight } from 'react-syntax-highlighter/dist/cjs/styles/hljs';
import styles from './index.module.scss';

const MarkDown = ({ text, themeDark }: { text: string; themeDark?: boolean }) => {
  const copyContent = () => {
    navigator.clipboard.writeText(text.slice(10, -4));
  };
  return (
    <div className={styles.copyMark}>
      <ReactMarkdown
        children={text}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                children={String(children).replace(/\n$/, '')}
                showLineNumbers={true}
                style={themeDark ? vs2015 : stackoverflowLight}
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
      <div className={styles.copyMarkBtn} onClick={() => copyContent()}>
        复制
      </div>
    </div>
  );
};

export default MarkDown;

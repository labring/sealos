/* eslint-disable react/no-children-prop */
import clsx from 'clsx';
import 'github-markdown-css/github-markdown-light.css';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
const { stackoverflowLight } = require('react-syntax-highlighter/dist/cjs/styles/hljs');
import styles from './index.module.scss';

type TMarkDown = {
  text: string;
  themeDark?: boolean;
  isShowCopyBtn?: boolean;
};
const MarkDown = (props: TMarkDown) => {
  const { text, themeDark, isShowCopyBtn } = props;
  const copyContent = () => {
    navigator.clipboard.writeText(text.slice(8, -4));
  };
  return (
    <div className={clsx(styles.copyMark, 'markdown-body')}>
      <ReactMarkdown
        children={text}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                children={String(children).replace(/\n$/, '')}
                showLineNumbers={true}
                style={stackoverflowLight}
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
      {isShowCopyBtn && (
        <div className={styles.copyMarkBtn} onClick={() => copyContent()}>
          复制
        </div>
      )}
    </div>
  );
};

export default MarkDown;

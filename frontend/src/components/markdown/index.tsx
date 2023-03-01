/* eslint-disable react/no-children-prop */
import { V1SELinuxOptions } from '@kubernetes/client-node';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { vs, vs2015, stackoverflowLight } from 'react-syntax-highlighter/dist/cjs/styles/hljs';
import styles from './index.module.scss';
import 'github-markdown-css/github-markdown-light.css';

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
      {isShowCopyBtn && (
        <div className={styles.copyMarkBtn} onClick={() => copyContent()}>
          复制
        </div>
      )}
    </div>
  );
};

export default MarkDown;

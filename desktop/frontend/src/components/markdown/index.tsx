import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs, vs2015 } from 'react-syntax-highlighter/dist/cjs/styles/hljs';
import styles from './index.module.scss';

const MarkDown = ({ text, themeDark }: { text: string; themeDark?: boolean }) => {
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
                style={themeDark ? vs2015 : vs}
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

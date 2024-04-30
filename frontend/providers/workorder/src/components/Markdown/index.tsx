import dynamic from 'next/dynamic';
import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import RemarkBreaks from 'remark-breaks';
import RemarkGfm from 'remark-gfm';
import styles from './index.module.scss';

const CodeLight = dynamic(() => import('./CodeLight'));
const MdImage = dynamic(() => import('./img/Image'));

export enum CodeClassName {
  guide = 'guide',
  questionGuide = 'questionGuide',
  mermaid = 'mermaid',
  echarts = 'echarts',
  quote = 'quote',
  files = 'files'
}

const Markdown = ({
  source = '',
  showAnimation = false
}: {
  source?: string;
  showAnimation?: boolean;
}) => {
  const components = useMemo<any>(
    () => ({
      img: Image,
      pre: 'div',
      p: (pProps: any) => <p {...pProps} dir="auto" />,
      code: Code
    }),
    []
  );

  const formatSource = source
    .replace(/\\n/g, '\n&nbsp;')
    .replace(/(http[s]?:\/\/[^\s，。]+)([。，])/g, '$1 $2')
    .replace(/\n*(\[QUOTE SIGN\]\(.*\))/g, '$1');

  return (
    <ReactMarkdown
      className={`markdown ${styles.markdown}
      ${showAnimation ? `${formatSource ? styles.waitingAnimation : styles.animation}` : ''}
    `}
      remarkPlugins={[[RemarkGfm, { singleTilde: false }], RemarkBreaks]}
      rehypePlugins={[]}
      components={components}
      linkTarget={'_blank'}
    >
      {formatSource}
    </ReactMarkdown>
  );
};

export default React.memo(Markdown);

const Code = React.memo(function Code(e: any) {
  const { inline, className, children } = e;

  const match = /language-(\w+)/.exec(className || '');

  const Component = useMemo(() => {
    return (
      <CodeLight className={className} inline={inline} match={match}>
        {children}
      </CodeLight>
    );
  }, [className, inline, match, children]);

  return Component;
});

const Image = React.memo(function Image({ src }: { src?: string }) {
  return <MdImage src={src} />;
});

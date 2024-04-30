import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
// import 'katex/dist/katex.min.css';
// import RemarkMath from 'remark-math';
// import RehypeKatex from 'rehype-katex';

// import RemarkBreaks from 'remark-breaks'; // 1
// import RemarkGfm from 'remark-gfm';// 1

import styles from './index.module.scss';
import dynamic from 'next/dynamic';
import { Link, Button } from '@chakra-ui/react';
import MyTooltip from '../MyTooltip';
import { useTranslation } from 'next-i18next';

const CodeLight = dynamic(() => import('./CodeLight'));
// const MermaidCodeBlock = dynamic(() => import('./img/MermaidCodeBlock'));
// const MdImage = dynamic(() => import('./img/Image'));
// const EChartsCodeBlock = dynamic(() => import('./img/EChartsCodeBlock'));

// const ChatGuide = dynamic(() => import('./chat/Guide'));
// const QuestionGuide = dynamic(() => import('./chat/QuestionGuide'));

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
      // img: Image,
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
      // remarkPlugins={[RemarkMath, [RemarkGfm, { singleTilde: false }], RemarkBreaks]}
      // rehypePlugins={[RehypeKatex]}
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
  const codeType = match?.[1];

  const strChildren = String(children);

  const Component = useMemo(() => {
    // if (codeType === CodeClassName.mermaid) {
    //   return <MermaidCodeBlock code={strChildren} />;
    // }
    // if (codeType === CodeClassName.guide) {
    //   return <ChatGuide text={strChildren} />;
    // }
    // if (codeType === CodeClassName.questionGuide) {
    //   return <QuestionGuide text={strChildren} />;
    // }

    // if (codeType === CodeClassName.echarts) {
    //   return <EChartsCodeBlock code={strChildren} />;
    // }

    return (
      <CodeLight className={className} inline={inline} match={match}>
        {children}
      </CodeLight>
    );
  }, [codeType, className, inline, match, children, strChildren]);

  return Component;
});

// const Image = React.memo(function Image({ src }: { src?: string }) {
//   return <MdImage src={src} />;
// });

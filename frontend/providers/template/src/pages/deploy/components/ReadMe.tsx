import MyIcon from '@/components/Icon';
import { Box } from '@chakra-ui/react';
import 'github-markdown-css/github-markdown-light.css';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeRewrite from 'rehype-rewrite';
import remarkGfm from 'remark-gfm';
import remarkUnwrapImages from 'remark-unwrap-images';
import styles from './index.module.scss';

const ReadMe = ({ readUrl, readmeContent }: { readUrl: string; readmeContent: string }) => {
  // @ts-ignore
  const myRewrite = (node, index, parent) => {
    if (node.tagName === 'img' && !node.properties.src.startsWith('http')) {
      const imgSrc = node.properties.src.replace(/^\.\/|^\//, '');
      const baseUrl = readUrl?.substring(0, readUrl?.lastIndexOf('/') + 1);
      node.properties.referrerPolicy = 'no-referrer';
      node.properties.src = `${baseUrl}${imgSrc}`;
    }
  };

  return (
    <Box flexGrow={1} border={'1px solid #DFE2EA'} mt={'16px'} borderRadius={'8px'}>
      <Box
        p={'16px 0'}
        borderBottom={'1px solid #E8EBF0'}
        color={'#24282C'}
        fontSize={'16px'}
        fontWeight={500}
      >
        <MyIcon name={'markdown'} mr={'8px'} w={'20px'} ml={'42px'} color={'myGray.500'} />
        README.md
      </Box>
      <Box borderRadius={'8px'} p={'24px'} className={`markdown-body ${styles.customMarkDownBody}`}>
        <ReactMarkdown
          linkTarget={'_blank'}
          rehypePlugins={[rehypeRaw, [rehypeRewrite, { rewrite: myRewrite }]]}
          remarkPlugins={[remarkGfm, remarkUnwrapImages]}
        >
          {readmeContent}
        </ReactMarkdown>
      </Box>
    </Box>
  );
};

export default ReadMe;

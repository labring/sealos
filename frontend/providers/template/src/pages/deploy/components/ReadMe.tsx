import MyIcon from '@/components/Icon';
import { TemplateType } from '@/types/app';
import { Box } from '@chakra-ui/react';
import 'github-markdown-css/github-markdown-light.css';
import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkUnwrapImages from 'remark-unwrap-images';
import rehypeRewrite from 'rehype-rewrite';
import styles from './index.module.scss';
import { parseGithubUrl } from '@/utils/tools';
import { Octokit, App } from 'octokit';

const ReadMe = ({ templateDetail }: { templateDetail: TemplateType }) => {
  const [templateReadMe, setTemplateReadMe] = useState('');

  // const octokit = new Octokit({
  //   auth: ''
  // });
  // useEffect(() => {
  //   (async () => {
  //     const result = await octokit.request('GET /repos/{owner}/{repo}/readme', {
  //       owner: 'appsmithorg',
  //       repo: 'appsmith',
  //       headers: {}
  //     });
  //     console.log(result);
  //   })();
  // }, []);

  const githubOptions = useMemo(
    () => parseGithubUrl(templateDetail?.spec?.readme),
    [templateDetail?.spec?.readme]
  );

  useEffect(() => {
    if (templateDetail?.spec?.readme) {
      (async () => {
        try {
          const res = await (await fetch(templateDetail?.spec?.readme)).text();
          setTemplateReadMe(res);
        } catch (error) {
          console.log(error);
        }
      })();
    }
  }, [templateDetail?.spec?.readme]);

  // @ts-ignore
  const myRewrite = (node, index, parent) => {
    if (node.tagName === 'img' && !node.properties.src.startsWith('http')) {
      const imgSrc = node.properties.src.replace(/^\.\/|^\//, '');

      node.properties.src = `https://${githubOptions?.hostname}/${githubOptions?.organization}/${githubOptions?.repository}/${githubOptions?.branch}/${imgSrc}`;
    }
  };

  return (
    <Box flexGrow={1} border={'1px solid #DEE0E2'} mt={'16px'}>
      <Box
        p={'16px 0'}
        borderBottom={'1px solid #DEE0E2'}
        color={'#24282C'}
        fontSize={'18px'}
        fontWeight={500}
      >
        <MyIcon name={'markdown'} mr={5} w={'24px'} h={'24px'} ml={'42px'} color={'myGray.500'} />
        README.md
      </Box>
      <Box p={'24px'} className={`markdown-body ${styles.customMarkDownBody}`}>
        <ReactMarkdown
          linkTarget={'_blank'}
          rehypePlugins={[rehypeRaw, [rehypeRewrite, { rewrite: myRewrite }]]}
          remarkPlugins={[remarkGfm, remarkUnwrapImages]}
        >
          {templateReadMe}
        </ReactMarkdown>
      </Box>
    </Box>
  );
};

export default ReadMe;

import { Box } from '@chakra-ui/react';
import 'github-markdown-css/github-markdown-light.css';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeRewrite from 'rehype-rewrite';
import remarkGfm from 'remark-gfm';
import remarkUnwrapImages from 'remark-unwrap-images';

export default function ReadMe() {
  const [templateReadMe, setTemplateReadMe] = useState('xxx');

  useEffect(() => {
    (async () => {
      try {
        const res = await (
          await fetch(
            'https://raw.githubusercontent.com/labring/sealos/main/docs/4.0/i18n/zh-Hans/self-hosting/installation.md'
          )
        ).text();
        setTemplateReadMe(res);
      } catch (error) {
        console.log(error);
      }
    })();
  }, []);

  // @ts-ignore
  const myRewrite = (node, index, parent) => {
    if (node.tagName === 'img' && !node.properties.src.startsWith('http')) {
      const imgUrl = node.properties.src?.replace('./images', '');
      node.properties.src = `https://raw.githubusercontent.com/labring/sealos/main/docs/4.0/i18n/zh-Hans/self-hosting/images/${imgUrl}`;
    }
  };

  return (
    <Box className={`markdown-body`}>
      <ReactMarkdown
        rehypePlugins={[rehypeRaw, [rehypeRewrite, { rewrite: myRewrite }]]}
        remarkPlugins={[remarkGfm, remarkUnwrapImages]}
      >
        {`
### 服务器

以下是一些基本的要求：

- 每个集群节点应该有不同的主机名。**主机名不要带下划线，也不要大写**。
- 所有节点的时间需要同步。
- 建议使用干净的操作系统来创建集群。**不要自己装 Docker！**
- 支持大多数 Linux 发行版，例如：Ubuntu、CentOS、Rocky linux。
- 支持 [Docker Hub](https://hub.docker.com/r/labring/kubernetes/tags) 中的所有 Kubernetes 版本。

推荐配置：

| 操作系统         | 内核版本 | CPU  | 内存 | 存储  | Master 节点数量 | Node 节点数量 |
| ---------------- | -------- | ---- | ---- | ----- | --------------- | ------------- |
| Ubuntu 22.04 LTS | ≥ 5.4    | 4C   | 8GB  | 100GB | 奇数台          | 任意          |

`}
      </ReactMarkdown>
    </Box>
  );
}

import { TAppDetail } from 'applications/app_store/detail_page';
const appDetailInfo: TAppDetail = {
  currentVersionInfo: {
    version: 'latest',
    sha: 'ca82a6dff817ec66f44342007202690a93763949',
    supportProcessor: 'ARM/X86_64',
    memory: '148.69MB'
  },
  versions: ['latest', 'v.8.0', 'v.5.6'],
  installGuide: ['sealos pull mysql:latest', 'sealos run mysql latest'],
  // the current version of readme
  currentReadme: `
  # A demo of \`react-markdown\`

\`react-markdown\` is a markdown component for React.

👉 Changes are re-rendered as you type.

👈 Try writing some markdown on the left.

## Overview

* Follows [CommonMark](https://commonmark.org)
* Optionally follows [GitHub Flavored Markdown](https://github.github.com/gfm/)
* Renders actual React elements instead of using \`dangerouslySetInnerHTML\`
* Lets you define your own components (to render \`MyHeading\` instead of \`h1\`)
* Has a lot of plugins

## Table of contents

Here is an example of a plugin in action
([\`remark-toc\`](https://github.com/remarkjs/remark-toc)).
This section is replaced by an actual table of contents.
  \`\`\`
  import React from 'react'
import ReactDOM from 'react-dom'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'

ReactDOM.render(
  <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{'# Your markdown here'}</ReactMarkdown>,
  document.querySelector('#content')
)
\`\`\`
`
};

export default appDetailInfo;

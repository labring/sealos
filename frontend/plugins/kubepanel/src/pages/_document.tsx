import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="application-name" content="Kube Panel" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Sealos" />
        <meta name="description" content="sealos cloud" />
        <meta name="format-detection" content="telephone=no" />
      </Head>
      {/* fix: tailwind css conflict with antd
       * @link https://github.com/ant-design/ant-design/issues/38794#issuecomment-1345475630
       */}
      <body id="app">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

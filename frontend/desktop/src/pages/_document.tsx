import { theme } from '@/styles/chakraTheme';
import { ColorModeScript } from '@chakra-ui/react';
import Document, { DocumentContext, Head, Html, Main, NextScript } from 'next/document';
import Script from 'next/script';

interface MyDocumentProps {
  scripts?: any[];
  noscripts?: any[];
}
class MyDocument extends Document<MyDocumentProps> {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    const noscripts = global?.AppConfig?.desktop?.layout?.meta?.noscripts;
    const scripts = global?.AppConfig?.desktop?.layout?.meta?.scripts;
    return {
      ...initialProps,
      scripts,
      noscripts
    };
  }

  render() {
    const { scripts = [], noscripts = [] } = this.props;

    return (
      <Html lang="en">
        <Head>
          <script src="/iconfont/iconfont.js" async></script>
          <meta name="application-name" content="Sealos" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="Sealos" />
          <meta name="description" content="sealos cloud" />
          <meta name="format-detection" content="telephone=no" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="msapplication-config" content="/icons/browserconfig.xml" />
          <meta name="msapplication-TileColor" content="#2B5797" />
          <meta name="msapplication-tap-highlight" content="no" />
          <meta name="theme-color" content="#FFFFFF" />

          <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
          <link rel="manifest" href="/manifest.json" />
          <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#5bbad5" />
          {scripts?.map((item, i) => {
            return <Script key={i} {...item} strategy="beforeInteractive"></Script>;
          })}
        </Head>
        <body>
          {noscripts?.map((item, i) => {
            return <noscript key={i} {...item}></noscript>;
          })}
          <ColorModeScript initialColorMode={theme.config.initialColorMode} />
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;

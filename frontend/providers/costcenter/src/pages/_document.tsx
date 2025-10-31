import Document, { Html, Head, Main, NextScript, DocumentContext } from 'next/document';
import Script from 'next/script';

interface MyDocumentProps {
  scripts?: any[];
  noscripts?: any[];
}
class MyDocument extends Document<MyDocumentProps> {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    const noscripts = global?.AppConfig?.costCenter?.layout?.meta?.noscripts;
    const scripts = global?.AppConfig?.costCenter?.layout?.meta?.scripts;
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
          {scripts?.map((item, i) => {
            return (
              <Script
                key={i}
                onLoad={() => console.log('script loaded')}
                onError={(e) => console.error('script error:', e)}
                strategy="beforeInteractive"
                {...item}
              />
            );
          })}
        </Head>
        <body className="max-w-screen overflow-x-hidden">
          {noscripts?.map((item, i) => {
            return <noscript key={i} {...item} />;
          })}
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
export default MyDocument;

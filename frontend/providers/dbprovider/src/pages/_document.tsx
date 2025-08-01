import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  const scripts: { [key: string]: string }[] = JSON.parse(process.env.CUSTOM_SCRIPTS ?? '[]');

  return (
    <Html lang="en">
      <Head>
        <meta name="application-name" content="Sealos Desktop App Demo" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Sealos" />
        <meta name="description" content="sealos cloud" />
        <meta name="format-detection" content="telephone=no" />
      </Head>
      <body>
        <Main />
        <NextScript />
        {scripts.map((script, i) => (
          <script key={i} {...script} async />
        ))}
      </body>
    </Html>
  );
}

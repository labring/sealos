import { Html, Head, Main, NextScript } from 'next/document';
import Script from 'next/script';

export default function Document() {
  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'Sealos';
  const scripts: { [key: string]: string }[] = JSON.parse(process.env.CUSTOM_SCRIPTS ?? '[]');

  return (
    <Html lang="en">
      <Head>
        <meta name="application-name" content={`${brandName} Desktop App Demo`} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={brandName} />
        <meta name="description" content={`${brandName} cloud`} />
        <meta name="format-detection" content="telephone=no" />
        {scripts.map((script, i) => (
          <Script key={i} {...script} />
        ))}
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

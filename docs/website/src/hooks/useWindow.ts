import { useEffect, useState } from 'react';
import useIsBrowser from '@docusaurus/useIsBrowser';

export default function () {
  const isBrowser = useIsBrowser();
  const [screenWidth, setScreenWidth] = useState(isBrowser ? document.body.clientWidth : 1440);
  const [currentLanguage, setCurrentLanguage] = useState(
    isBrowser ? document.documentElement.lang : 'en'
  );
  const [cloudUrl, setCloudUrl] = useState('https://cloud.sealos.io');

  useEffect(() => {
    if (!isBrowser) return;
    setScreenWidth(document.body.clientWidth);
    const updateScreenWidth = () => {
      requestAnimationFrame(() => setScreenWidth(document?.body.clientWidth));
    };
    window.addEventListener('resize', updateScreenWidth);
    // handle
    setCurrentLanguage(document.documentElement.lang);

    // console.log(document.documentElement.lang, window.location, navigator.language);
    // if (navigator.language !== 'en' && !window.location.pathname.includes('zh-Hans')) {
    //   const newPath = window.location.pathname.endsWith('/') ? 'zh-Hans/' : '/zh-Hans/';
    //   window.location.pathname += newPath;
    // }

    setCloudUrl(
      document.documentElement.lang === 'en'
        ? 'https://cloud.sealos.io'
        : 'https://cloud.sealos.top'
    );

    return () => {
      window.removeEventListener('resize', updateScreenWidth);
    };
  }, [isBrowser]);

  return {
    screenWidth,
    currentLanguage,
    cloudUrl
  };
}

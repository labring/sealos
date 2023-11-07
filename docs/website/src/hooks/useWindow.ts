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

    setCurrentLanguage(document.documentElement.lang);

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

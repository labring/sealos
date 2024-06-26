import { useEffect, useState } from 'react';
import useIsBrowser from '@docusaurus/useIsBrowser';

export default function useWindow() {
  const isBrowser = useIsBrowser();
  const [screenWidth, setScreenWidth] = useState(isBrowser ? document.body.clientWidth : 1440);
  const [currentLanguage, setCurrentLanguage] = useState(
    isBrowser ? document.documentElement.lang : 'en'
  );
  const [cloudUrl, setCloudUrl] = useState('https://cloud.sealos.io');
  const [bd_vid, setBdId] = useState('');

  useEffect(() => {
    if (!isBrowser) return;
    let bd_vid = sessionStorage.getItem('bd_vid');
    if (bd_vid) setBdId(bd_vid);
  }, [isBrowser]);

  useEffect(() => {
    if (!isBrowser) return;
    setScreenWidth(document.body.clientWidth);
    const updateScreenWidth = () => {
      requestAnimationFrame(() => setScreenWidth(document?.body.clientWidth));
    };
    window.addEventListener('resize', updateScreenWidth);

    setCurrentLanguage(document.documentElement.lang);

    setCloudUrl(
      window.location.hostname === 'sealos.io'
        ? 'https://cloud.sealos.io'
        : 'https://cloud.sealos.run'
    );

    return () => {
      window.removeEventListener('resize', updateScreenWidth);
    };
  }, [isBrowser]);

  return {
    screenWidth,
    currentLanguage,
    cloudUrl,
    bd_vid
  };
}

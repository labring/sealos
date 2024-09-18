import { useEffect, useState } from 'react';
import useIsBrowser from '@docusaurus/useIsBrowser';

interface SemParams {
  bd_vid: string;
  keywords: string;
  s: string;
}

export default function useWindow() {
  const isBrowser = useIsBrowser();
  const [screenWidth, setScreenWidth] = useState(isBrowser ? document.body.clientWidth : 1440);
  const [currentLanguage, setCurrentLanguage] = useState(
    isBrowser ? document.documentElement.lang : 'en'
  );
  const [cloudUrl, setCloudUrl] = useState('https://cloud.sealos.io');
  const [semParams, setSemParams] = useState<SemParams>({ bd_vid: '', keywords: '', s: '' });

  useEffect(() => {
    if (!isBrowser) return;
    const storedParams = sessionStorage.getItem('sealos_sem');
    if (storedParams) {
      const parsedParams = JSON.parse(storedParams);
      setSemParams((prevParams) => ({ ...prevParams, ...parsedParams }));
    }
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
    semParams
  };
}

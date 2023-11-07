import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useEffect, useState } from 'react';
import useIsBrowser from '@docusaurus/useIsBrowser';

export default function useUploadData() {
  const isBrowser = useIsBrowser();
  const [bd_vid, setBdId] = useState('');
  const {
    siteConfig: { customFields }
  } = useDocusaurusContext();

  useEffect(() => {
    if (!isBrowser) return;
    console.log(customFields);
    let bd_vid = sessionStorage.getItem('bd_vid');
    if (bd_vid) setBdId(bd_vid);
  }, [isBrowser]);

  async function uploadConvertData(params: { newType: number }[]) {
    if (!isBrowser || !customFields?.BD_TOKEN || !bd_vid) return;
    const url = 'https://ocpc.baidu.com/ocpcapi/api/uploadConvertData';
    const logidUrl = `${window.location.origin}?bd_vid=${bd_vid}`;

    console.log(customFields, bd_vid, logidUrl);

    const data = {
      token: customFields?.BD_TOKEN,
      conversionTypes: params.map((newType) => ({ logidUrl: logidUrl, newType: newType }))
    };

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
  }

  return {
    bd_vid,
    uploadConvertData
  };
}

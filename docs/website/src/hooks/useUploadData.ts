import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useEffect, useState } from 'react';
import useIsBrowser from '@docusaurus/useIsBrowser';

export default function useUploadData() {
  const isBrowser = useIsBrowser();
  const [id, setId] = useState('');
  const {
    siteConfig: { customFields }
  } = useDocusaurusContext();

  useEffect(() => {
    if (!isBrowser) return;
    let bd_vid = sessionStorage.getItem('bd_vid');
    if (bd_vid) setId(bd_vid);
  }, [isBrowser]);

  async function uploadConvertData(params: { newType: number }[]) {
    if (!isBrowser || !customFields?.bdToken || !id) return;
    const url = 'https://ocpc.baidu.com/ocpcapi/api/uploadConvertData';
    const logidUrl = `${window.location.origin}?bd_vid=${id}`;
    console.log(customFields, id, '========', logidUrl);

    const data = {
      token: customFields.bdToken,
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
    id,
    uploadConvertData
  };
}

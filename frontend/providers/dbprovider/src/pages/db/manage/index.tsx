import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function ManageDataPage() {
  const router = useRouter();
  const [src, setSrc] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    const { initialKey, theme, primaryColor, language, hideAvatar } = router.query;

    if (!initialKey) return;

    const p = new URLSearchParams({
      key: initialKey as string,
      theme: (theme as string) ?? 'light',
      primaryColor: (primaryColor as string) ?? 'orange',
      language: (language as string) ?? navigator.language,
      hideAvatar: String(hideAvatar ?? true)
    });

    setSrc(`https://chat2dbclient.sealosbja.site/workspace?${p.toString()}`);
  }, [router.isReady, router.query]);

  if (!router.isReady || !src) return null;

  return (
    <iframe src={src} style={{ width: '100%', height: '100vh', border: 'none' }} title="Chat2DB" />
  );
}

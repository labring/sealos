import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function ManageDataPage() {
  const router = useRouter();

  const [src, setSrc] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    const { theme, primaryColor, language, hideAvatar } = router.query;

    const p = new URLSearchParams({
      theme: (theme as string) ?? 'light',
      primaryColor: (primaryColor as string) ?? 'orange',
      language: (language as string) ?? navigator.language,
      hideAvatar: String(hideAvatar ?? true)
    });

    setSrc(`https://app.chat2db-ai.com?${p.toString()}`);
  }, [router.isReady, router.query]);

  if (!router.isReady) return null; // 避免白屏

  return (
    <iframe src={src} style={{ width: '100%', height: '100vh', border: 'none' }} title="Chat2DB" />
  );
}

import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    router.push('/cost_overview');
  }, [router]);

  return <div></div>;
}

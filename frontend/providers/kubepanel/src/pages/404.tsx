import { useRouter } from 'next/router';
import { useEffect } from 'react';

const NonePage = () => {
  const router = useRouter();
  useEffect(() => {
    router.push('/kubepanel');
  }, [router]);

  return <div></div>;
};

export default NonePage;

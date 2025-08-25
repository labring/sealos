import { useRouter } from 'next/router';
import { useEffect } from 'react';

const NonePage = () => {
  const router = useRouter();
  useEffect(() => {
    router.push('/');
  }, [router]);

  return null;
};

export default NonePage;

import { useRouter } from 'next/router';
import { useEffect } from 'react';

const NonePage = () => {
  const router = useRouter();
  useEffect(() => {
    router.push('/workorders');
  }, [router]);

  return <div></div>;
};

export default NonePage;

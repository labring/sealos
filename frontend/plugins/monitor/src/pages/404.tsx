import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

const NonePage = () => {
  const router = useRouter();
  useEffect(() => {
    router.push('/monitor');
  }, [router]);

  return <div></div>;
};

export default NonePage;

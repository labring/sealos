import { useRouter } from 'next/router';
import React from 'react';
export default function Page() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace('/');
  }, [router]);

  return 'Redirecting...';
}

import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    if (router?.query?.orderId) {
      const orderId = router?.query?.orderId;
      router.push({
        pathname: '/workorder/detail',
        query: {
          orderId: orderId
        }
      });
    } else {
      router.push('/workorders');
    }
  }, [router]);

  return <div></div>;
}

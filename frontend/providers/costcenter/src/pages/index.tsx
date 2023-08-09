import { useRouter } from 'next/router';

export default function Index() {
  const router = useRouter();
  router.push({
    pathname: '/cost_overview',
    query: router.query
  });

  return <div></div>;
}

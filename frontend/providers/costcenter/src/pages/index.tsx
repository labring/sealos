import { useRouter } from 'next/router';

export default function Index() {
  const router = useRouter();
  const config: Parameters<typeof router.push>[0] = {
    pathname: '/cost_overview'
  };
  if (router.query) config.query = router.query;
  router.push(config);

  return <div></div>;
}

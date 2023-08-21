import { useRouter } from 'next/router';

export default function Index() {
  const router = useRouter();
  const config: Parameters<typeof router.push>[0] = {
    pathname: 'cost_overview'
  };
  if (Object.keys(router.query).length > 0) config.query = router.query;
  router.replace(config, config);

  return <div></div>;
}

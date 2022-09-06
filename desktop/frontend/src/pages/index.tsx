import Layout from 'layout';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { getSession, isUserLogin } from '../stores/session';

export default function Home(props: any) {
  useEffect(() => {
    getSession();
  }, []);

  const router = useRouter();
  useEffect(() => {
    const is_login = isUserLogin();
    let destination = process.env.NEXT_PUBLIC_SERVICE + 'auth/login';
    if (!is_login && router.pathname !== destination && router.asPath !== destination) {
      router.replace(destination);
    }
  }, [router]);

  return <Layout>{props.children}</Layout>;
}

import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useSessionStore } from '../../stores/session';

const Login: NextPage = () => {
  const router = useRouter();
  const isUserLogin = useSessionStore((state) => state.isUserLogin);

  useEffect(() => {
    const is_login = isUserLogin();
    let destination = process.env.NEXT_PUBLIC_API_HOST + 'auth/login';
    if (is_login) {
      destination = '/dashboard';
    }

    router.replace(destination);
  });

  return <></>;
};

export default Login;

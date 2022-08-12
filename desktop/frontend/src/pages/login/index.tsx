import type { GetServerSideProps, NextPage } from 'next';
import { isUserLogin } from '../../stores/session';

export const getServerSideProps: GetServerSideProps = async (context) => {
  const is_login = isUserLogin();
  let destination = process.env.NEXT_PUBLIC_API_HOST + 'auth/login';
  if (is_login) {
    destination = '/dashboard';
  }
  return {
    redirect: { statusCode: 302, destination: destination }
  };
};

const Login: NextPage = () => <></>;

export default Login;

import type { GetServerSideProps, NextPage } from 'next';
import { isUserLogin } from '../../store/session';

export const getServerSideProps: GetServerSideProps = async (context) => {
  const is_login = isUserLogin();
  let destination = '/api/login';
  if (is_login) {
    destination = '/dashboard';
  }
  return {
    redirect: { statusCode: 302, destination: destination }
  };
};

const Login: NextPage = () => <></>;

export default Login;

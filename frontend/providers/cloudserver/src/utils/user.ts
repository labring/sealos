import useSessionStore from '@/store/session';

// edge
export const getUserToken = () => {
  let token: string =
    process.env.NODE_ENV === 'development' ? process.env.NEXT_PUBLIC_MOCK_USER || '' : '';
  try {
    const temp = useSessionStore.getState()?.token;
    if (!token && temp) {
      token = temp;
    }
  } catch (err) {
    console.error(err);
  }
  return token;
};

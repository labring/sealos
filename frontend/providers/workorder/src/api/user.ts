import { GET, POST } from '@/services/request';
import { AppSession, UserDB } from '@/types/user';

export const findUserById = ({ userId }: { userId: string }) =>
  GET<UserDB>('/api/auth/findById', { userId: userId });

export const AuthByDesktopSession = (payload: { token: string }) =>
  POST<AppSession>('/api/auth/desktop', payload);

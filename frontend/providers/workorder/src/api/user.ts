import { GET, POST } from '@/services/request';
import { RegionDB } from '@/types/region';
import { AppSession, UserDB } from '@/types/user';

export const findUserById = ({ userId }: { userId: string }) =>
  GET<{ user: UserDB; regionInfo: RegionDB }>('/api/auth/findById', { userId: userId });

export const AuthByDesktopSession = (payload: { token: string }) =>
  POST<AppSession>('/api/auth/desktop', payload);

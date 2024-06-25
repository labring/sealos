import { GET, POST } from '@/services/request';
import { RegionDB } from '@/types/region';
import { AppSession, UserDB } from '@/types/user';

export const findUserById = ({ orderId }: { orderId: string }) =>
  GET<{ user: UserDB; regionInfo: RegionDB; workorderLink: string }>('/api/auth/findById', {
    orderId: orderId
  });

export const AuthByDesktopSession = (payload: { token: string }) =>
  POST<AppSession>('/api/auth/desktop', payload);

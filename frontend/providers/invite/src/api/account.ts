import { InvitationResult } from '@/pages/api/account/list';
import { GET, POST } from '@/services/request';

export const getInvitationIno = (data: { inviterId: string; page: string; pageSize: string }) =>
  GET<InvitationResult>('/api/account/list', data);

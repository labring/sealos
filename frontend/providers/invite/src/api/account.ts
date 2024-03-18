import { InvitationResult } from '@/pages/api/account/list';
import { GET } from '@/services/request';

export const getInvitationIno = (data: { inviterId: string }) =>
  GET<InvitationResult>('/api/account/list', data);

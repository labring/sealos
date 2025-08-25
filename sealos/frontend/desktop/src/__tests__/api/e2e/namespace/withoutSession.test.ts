import request from '@/__tests__/api/request';
import {
  _abdicateRequest,
  _createRequest,
  _deleteTeamRequest,
  _inviteMemberRequest,
  _modifyRoleRequest,
  _nsListRequest,
  _reciveMessageRequest,
  _removeMemberRequest,
  _teamDetailsRequest,
  _verifyInviteRequest,
  reciveAction
} from '@/api/namespace';
import { UserRole } from '@/types/team';
const abdicateRequest = _abdicateRequest(request);
const createRequest = _createRequest(request);
const deleteTeamRequest = _deleteTeamRequest(request);
const inviteMemberRequest = _inviteMemberRequest(request);
const modifyRoleRequest = _modifyRoleRequest(request);
const nsListRequest = _nsListRequest(request);
const verifyInviteRequest = _verifyInviteRequest(request);
const removeMemberRequest = _removeMemberRequest(request);
const teamDetailsRequest = _teamDetailsRequest(request);
const reciveMessageRequest = _reciveMessageRequest(request);
describe('notLogin', () => {
  it('create team', async () => {
    const res = await createRequest({ teamName: 'hello' });
    expect(res.code).toBe(401);
  });
  it('delete team', async () => {
    const res = await deleteTeamRequest({ ns_uid: 'xxxx' });
    expect(res.code).toBe(401);
  });
  it('abdicate team', async () => {
    const res = await abdicateRequest({
      ns_uid: 'xxx',
      targetUserCrUid: 'xxx'
    });
    expect(res.code).toBe(401);
  });
  it('invite team', async () => {
    const res = await inviteMemberRequest({
      ns_uid: 'xxx',
      role: UserRole.Developer,
      targetUserId: 'XXX'
    });
    expect(res.code).toBe(401);
  });
  it('modify role', async () => {
    const res = await modifyRoleRequest({
      ns_uid: 'xxx',
      targetUserCrUid: 'xxx',
      tRole: UserRole.Manager
    });
    expect(res.code).toBe(401);
  });
  it('ns list', async () => {
    const res = await nsListRequest();
    expect(res.code).toBe(401);
  });
  it('verify invite', async () => {
    const res = await verifyInviteRequest({ ns_uid: 'xxx', action: reciveAction.Accepte });
    expect(res.code).toBe(401);
  });
  it('remove member', async () => {
    const res = await removeMemberRequest({ ns_uid: 'xxx', targetUserCrUid: 'xxx' });
    expect(res.code).toBe(401);
  });
  it('team details', async () => {
    const res = await teamDetailsRequest('xxx');
    expect(res.code).toBe(401);
  });
  it('recive message', async () => {
    const res = await reciveMessageRequest();
    expect(res.code).toBe(401);
  });
});

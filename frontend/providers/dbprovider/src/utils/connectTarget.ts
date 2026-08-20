export type InstanceSetMemberStatus = {
  podName?: string;
  role?: {
    isLeader?: boolean;
  } | null;
} | null;

const noAvailableMembersError = 'No available members found in InstanceSet status';

export const selectConnectPodFromMembersStatus = (
  membersStatus?: InstanceSetMemberStatus[] | null
): string => {
  const validMembers = (membersStatus ?? []).filter(
    (
      member
    ): member is NonNullable<InstanceSetMemberStatus> & {
      podName: string;
    } => !!member?.podName
  );

  if (!validMembers.length) {
    throw new Error(noAvailableMembersError);
  }

  const leaderMember = validMembers.find((member) => member.role?.isLeader);
  return leaderMember?.podName ?? validMembers[0].podName;
};

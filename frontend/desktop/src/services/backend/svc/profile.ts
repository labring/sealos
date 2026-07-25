export const PROFILE_NICKNAME_MAX_LENGTH = 32;
export const PROFILE_AVATAR_URI_MAX_LENGTH = 1024 * 1024;

type ProfileUpdateInput = {
  nickname: unknown;
  avatarUri: unknown;
};

export type ProfileUpdateData = {
  nickname: string;
  avatarUri: string;
};

export const isValidAvatarUri = (avatarUri: string) => {
  if (!avatarUri) return true;
  if (avatarUri.startsWith('/')) return true;
  if (avatarUri.startsWith('data:image/')) return true;

  try {
    const url = new URL(avatarUri);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

export const validateProfileUpdate = (
  input: unknown
): { success: true; data: ProfileUpdateData } | { success: false; message: string } => {
  if (!input || typeof input !== 'object') {
    return { success: false, message: 'invalid profile data' };
  }

  const profileInput = input as ProfileUpdateInput;

  if (typeof profileInput.nickname !== 'string') {
    return { success: false, message: 'nickname is required' };
  }

  if (typeof profileInput.avatarUri !== 'string') {
    return { success: false, message: 'avatarUri is required' };
  }

  const nickname = profileInput.nickname.trim();
  const avatarUri = profileInput.avatarUri.trim();

  if (!nickname) {
    return { success: false, message: 'nickname is required' };
  }

  if (nickname.length > PROFILE_NICKNAME_MAX_LENGTH) {
    return { success: false, message: `nickname cannot exceed ${PROFILE_NICKNAME_MAX_LENGTH}` };
  }

  if (avatarUri.length > PROFILE_AVATAR_URI_MAX_LENGTH) {
    return { success: false, message: `avatarUri cannot exceed ${PROFILE_AVATAR_URI_MAX_LENGTH}` };
  }

  if (!isValidAvatarUri(avatarUri)) {
    return { success: false, message: 'avatarUri is invalid' };
  }

  return {
    success: true,
    data: {
      nickname,
      avatarUri
    }
  };
};

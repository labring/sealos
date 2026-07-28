const ADMIN_USERNAME = 'admin';

const UNSAFE_USERNAME_CHARACTER_PATTERN =
  /[\u0000-\u001f\u007f-\u009f\u00ad\u034f\u061c\u180e\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff\ufe00-\ufe0f]/;
const UNSAFE_USERNAME_CHARACTER_GLOBAL_PATTERN =
  /[\u0000-\u001f\u007f-\u009f\u00ad\u034f\u061c\u180e\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff\ufe00-\ufe0f]/g;

const ADMIN_CONFUSABLE_CHARACTER_MAP: Record<string, string> = {
  '\u0391': 'a',
  '\u03b1': 'a',
  '\u0410': 'a',
  '\u0430': 'a',
  '\u0501': 'd',
  '\u217e': 'd',
  '\u039c': 'm',
  '\u03bc': 'm',
  '\u041c': 'm',
  '\u043c': 'm',
  '\u0406': 'i',
  '\u0456': 'i',
  '\u0131': 'i',
  '\u0578': 'n',
  '\u057c': 'n'
};

export type NormalizedPasswordUsername = {
  rawValue: string;
  value: string;
  changed: boolean;
  isEmpty: boolean;
  hasUnsafeCharacters: boolean;
  isAdminLike: boolean;
};

const getAdminComparableUsername = (value: string) =>
  Array.from(value.normalize('NFKC').trim().replace(UNSAFE_USERNAME_CHARACTER_GLOBAL_PATTERN, ''))
    .map((character) => ADMIN_CONFUSABLE_CHARACTER_MAP[character] || character)
    .join('')
    .toLowerCase();

export const normalizePasswordUsername = (value: unknown): NormalizedPasswordUsername => {
  const raw = typeof value === 'string' ? value : '';
  const trimmed = raw.trim();

  return {
    rawValue: raw,
    value: trimmed,
    changed: raw !== trimmed,
    isEmpty: trimmed.length === 0,
    hasUnsafeCharacters: UNSAFE_USERNAME_CHARACTER_PATTERN.test(raw),
    isAdminLike: getAdminComparableUsername(raw) === ADMIN_USERNAME
  };
};

export const isBlockedAdminPasswordAutoSignup = ({
  normalizedUsername,
  providerExists
}: {
  normalizedUsername: NormalizedPasswordUsername;
  providerExists: boolean;
}) =>
  !providerExists &&
  normalizedUsername.isAdminLike &&
  normalizedUsername.value.toLowerCase() === ADMIN_USERNAME;
